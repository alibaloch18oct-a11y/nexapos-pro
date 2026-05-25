const express = require("express");

const router = express.Router();

function ensureCollections(db) {
  db.inventory = Array.isArray(db.inventory) ? db.inventory : [];
  db.orders = Array.isArray(db.orders) ? db.orders : [];
  db.stockMovements = Array.isArray(db.stockMovements) ? db.stockMovements : [];
  db.menuInventoryMappings = Array.isArray(db.menuInventoryMappings) ? db.menuInventoryMappings : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  return db;
}

function tenantOnly(req, res, next) {
  if (!req.user?.tenantId) {
    return res.status(403).json({
      message: "Restaurant account access required."
    });
  }

  next();
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getStockName(stock) {
  return stock.name || stock.itemName || stock.productName || "";
}

function getCurrentStock(stock) {
  return Number(
    stock.currentStock ??
    stock.stock ??
    stock.quantity ??
    stock.qty ??
    0
  );
}

function setCurrentStock(stock, value) {
  const nextValue = Math.max(0, Number(value || 0));

  if (stock.currentStock !== undefined) stock.currentStock = nextValue;
  else if (stock.stock !== undefined) stock.stock = nextValue;
  else if (stock.quantity !== undefined) stock.quantity = nextValue;
  else if (stock.qty !== undefined) stock.qty = nextValue;
  else stock.currentStock = nextValue;
}

function getLowStockAlert(stock) {
  return Number(stock.lowStockAlert ?? stock.lowStock ?? stock.minimumStock ?? 0);
}

function findInventoryItem(db, tenantId, orderItem) {
  const itemId = orderItem.id || orderItem.itemId || orderItem.menuItemId;
  const itemName = normalize(orderItem.name);

  return db.inventory.find((stock) => {
    if (stock.tenantId !== tenantId) return false;

    const stockMenuId = stock.menuItemId || stock.itemId || stock.productId;
    const stockName = normalize(getStockName(stock));

    return (
      (itemId && stockMenuId && String(stockMenuId) === String(itemId)) ||
      (itemName && stockName && stockName === itemName)
    );
  });
}

function getMappingsForOrderItem(db, tenantId, orderItem) {
  const itemId = orderItem.id || orderItem.itemId || orderItem.menuItemId;
  const itemName = normalize(orderItem.name);

  return db.menuInventoryMappings.filter((mapping) => {
    if (mapping.tenantId !== tenantId) return false;
    if (mapping.isActive === false) return false;

    return (
      (itemId && mapping.menuItemId && String(mapping.menuItemId) === String(itemId)) ||
      (itemName && normalize(mapping.menuItemName) === itemName)
    );
  });
}

function createMovement({
  req,
  sourceOrder,
  stockItem,
  orderItem,
  deductQty,
  beforeStock,
  afterStock,
  type = "sale_deduction",
  note = ""
}) {
  return {
    id: `move-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tenantId: req.user.tenantId,
    branchId: req.user.branchId || null,
    orderId: sourceOrder.id || "",
    orderNo: sourceOrder.orderNo || "",
    type,
    inventoryItemId: stockItem?.id || "",
    itemName: stockItem ? getStockName(stockItem) : orderItem.name || "Unknown Item",
    menuItemName: orderItem.name || "",
    qty: Number(deductQty || 0),
    beforeStock: Number(beforeStock || 0),
    afterStock: Number(afterStock || 0),
    unit: stockItem?.unit || stockItem?.stockUnit || "pcs",
    note,
    createdAt: new Date().toISOString()
  };
}

function deductStock({ db, req, sourceOrder, orderItem, stockItem, deductQty, movements, lowStockAlerts, note }) {
  const beforeStock = getCurrentStock(stockItem);
  const afterStock = Math.max(0, beforeStock - Number(deductQty || 0));

  setCurrentStock(stockItem, afterStock);
  stockItem.updatedAt = new Date().toISOString();

  const movement = createMovement({
    req,
    sourceOrder,
    stockItem,
    orderItem,
    deductQty,
    beforeStock,
    afterStock,
    type: "sale_deduction",
    note
  });

  movements.push(movement);

  const alertLevel = getLowStockAlert(stockItem);

  if (alertLevel > 0 && afterStock <= alertLevel) {
    lowStockAlerts.push({
      inventoryItemId: stockItem.id,
      itemName: getStockName(stockItem),
      currentStock: afterStock,
      lowStockAlert: alertLevel,
      unit: stockItem.unit || stockItem.stockUnit || "pcs"
    });
  }
}

module.exports = function inventoryMovementRoutes({ readDb, writeDb }) {
  router.get("/", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const movements = db.stockMovements
      .filter((movement) => movement.tenantId === req.user.tenantId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ movements });
  });

  router.get("/low-stock", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const lowStockItems = db.inventory
      .filter((item) => item.tenantId === req.user.tenantId)
      .filter((item) => {
        const current = getCurrentStock(item);
        const alert = getLowStockAlert(item);

        return alert > 0 && current <= alert;
      });

    res.json({ lowStockItems });
  });

  router.post("/deduct-order", tenantOnly, (req, res) => {
    const { orderId, order } = req.body;

    const db = ensureCollections(readDb());

    const savedOrder = orderId
      ? db.orders.find((item) => item.id === orderId && item.tenantId === req.user.tenantId)
      : null;

    const sourceOrder = savedOrder || order;

    if (!sourceOrder) {
      return res.status(404).json({
        message: "Order not found for inventory deduction."
      });
    }

    if (sourceOrder.paymentStatus !== "paid" && sourceOrder.paymentStatus !== "complimentary") {
      return res.json({
        message: "Inventory not deducted because order is not paid.",
        skipped: true,
        movements: []
      });
    }

    const existingDeduction = db.stockMovements.some(
      (movement) =>
        movement.tenantId === req.user.tenantId &&
        movement.orderNo &&
        sourceOrder.orderNo &&
        movement.orderNo === sourceOrder.orderNo &&
        movement.type === "sale_deduction"
    );

    if (existingDeduction) {
      return res.json({
        message: "Inventory already deducted for this order.",
        skipped: true,
        movements: []
      });
    }

    const items = Array.isArray(sourceOrder.items) ? sourceOrder.items : [];
    const movements = [];
    const lowStockAlerts = [];

    for (const orderItem of items) {
      const orderQty = Number(orderItem.qty || orderItem.quantity || 1);
      const mappings = getMappingsForOrderItem(db, req.user.tenantId, orderItem);

      if (mappings.length > 0) {
        for (const mapping of mappings) {
          const stockItem = db.inventory.find(
            (item) => item.id === mapping.inventoryItemId && item.tenantId === req.user.tenantId
          );

          if (!stockItem) {
            movements.push({
              id: `move-${Date.now()}-${Math.random().toString(16).slice(2)}`,
              tenantId: req.user.tenantId,
              orderNo: sourceOrder.orderNo || "",
              orderId: sourceOrder.id || orderId || "",
              type: "missing_stock_mapping",
              itemName: mapping.inventoryItemName || "Missing inventory item",
              menuItemName: orderItem.name || "",
              qty: orderQty * Number(mapping.deductQty || 1),
              beforeStock: 0,
              afterStock: 0,
              note: `Mapping exists but inventory item was not found for ${orderItem.name}.`,
              createdAt: new Date().toISOString()
            });

            continue;
          }

          const deductQty = orderQty * Number(mapping.deductQty || 1);

          deductStock({
            db,
            req,
            sourceOrder,
            orderItem,
            stockItem,
            deductQty,
            movements,
            lowStockAlerts,
            note: `Recipe mapped deduction: ${orderItem.name} → ${getStockName(stockItem)}`
          });
        }

        continue;
      }

      const stockItem = findInventoryItem(db, req.user.tenantId, orderItem);

      if (!stockItem) {
        movements.push({
          id: `move-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          tenantId: req.user.tenantId,
          orderNo: sourceOrder.orderNo || "",
          orderId: sourceOrder.id || orderId || "",
          type: "missing_stock_mapping",
          itemName: orderItem.name || "Unknown Item",
          menuItemName: orderItem.name || "",
          qty: orderQty,
          beforeStock: 0,
          afterStock: 0,
          note: "No mapping found and no same-name inventory item found. Create mapping in Menu Inventory Mapping.",
          createdAt: new Date().toISOString()
        });

        continue;
      }

      const deductQty =
        orderQty *
        (
          Number(stockItem.deductQtyPerSale || 0) ||
          Number(stockItem.consumptionPerSale || 0) ||
          Number(stockItem.recipeQty || 0) ||
          1
        );

      deductStock({
        db,
        req,
        sourceOrder,
        orderItem,
        stockItem,
        deductQty,
        movements,
        lowStockAlerts,
        note: `Fallback same-name deduction from paid order ${sourceOrder.orderNo || ""}`
      });
    }

    db.stockMovements.push(...movements);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      action: "INVENTORY_DEDUCTED_FROM_ORDER",
      actor: req.user.username,
      tenantId: req.user.tenantId,
      details: {
        orderId: sourceOrder.id || orderId || "",
        orderNo: sourceOrder.orderNo || "",
        movements: movements.length,
        lowStockAlerts: lowStockAlerts.length
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Inventory deduction completed.",
      movements,
      lowStockAlerts
    });
  });

  router.post("/adjust", tenantOnly, (req, res) => {
    const { inventoryItemId, type, qty, note } = req.body;

    if (!inventoryItemId || !qty) {
      return res.status(400).json({
        message: "Inventory item and quantity are required."
      });
    }

    const db = ensureCollections(readDb());

    const stockItem = db.inventory.find(
      (item) => item.id === inventoryItemId && item.tenantId === req.user.tenantId
    );

    if (!stockItem) {
      return res.status(404).json({
        message: "Inventory item not found."
      });
    }

    const beforeStock = getCurrentStock(stockItem);
    const adjustmentQty = Number(qty || 0);

    let afterStock = beforeStock;

    if (type === "stock_in") afterStock = beforeStock + adjustmentQty;
    else if (type === "stock_out") afterStock = beforeStock - adjustmentQty;
    else if (type === "waste") afterStock = beforeStock - adjustmentQty;
    else if (type === "correction") afterStock = adjustmentQty;
    else {
      return res.status(400).json({
        message: "Invalid adjustment type."
      });
    }

    afterStock = Math.max(0, afterStock);

    setCurrentStock(stockItem, afterStock);
    stockItem.updatedAt = new Date().toISOString();

    const movement = {
      id: `move-${Date.now()}`,
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || null,
      type,
      inventoryItemId: stockItem.id,
      itemName: getStockName(stockItem),
      qty: adjustmentQty,
      beforeStock,
      afterStock,
      unit: stockItem.unit || stockItem.stockUnit || "pcs",
      note: note || "",
      createdBy: req.user.username,
      createdAt: new Date().toISOString()
    };

    db.stockMovements.push(movement);

    writeDb(db);

    res.json({
      message: "Stock adjusted successfully.",
      movement,
      item: stockItem
    });
  });

  return router;
};