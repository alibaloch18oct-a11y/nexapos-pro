const express = require("express");
const { v4: uuid } = require("uuid");

const router = express.Router();

function ensureCollections(db) {
  db.suppliers = Array.isArray(db.suppliers) ? db.suppliers : [];
  db.purchaseInvoices = Array.isArray(db.purchaseInvoices) ? db.purchaseInvoices : [];
  db.inventory = Array.isArray(db.inventory) ? db.inventory : [];
  db.stockMovements = Array.isArray(db.stockMovements) ? db.stockMovements : [];
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

function getInventoryName(item) {
  return item.name || item.itemName || item.productName || "Inventory Item";
}

function getCurrentStock(item) {
  return Number(item.currentStock ?? item.stock ?? item.quantity ?? item.qty ?? 0);
}

function setCurrentStock(item, value) {
  const safeValue = Math.max(0, Number(value || 0));

  if (item.currentStock !== undefined) item.currentStock = safeValue;
  else if (item.stock !== undefined) item.stock = safeValue;
  else if (item.quantity !== undefined) item.quantity = safeValue;
  else if (item.qty !== undefined) item.qty = safeValue;
  else item.currentStock = safeValue;
}

function makeInvoiceNo(db, tenantId) {
  const count = db.purchaseInvoices.filter((invoice) => invoice.tenantId === tenantId).length + 1;
  return `PUR-${String(count).padStart(5, "0")}`;
}

module.exports = function supplierPurchaseRoutes({ readDb, writeDb }) {
  router.get("/suppliers", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const suppliers = db.suppliers
      .filter((supplier) => supplier.tenantId === req.user.tenantId)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    res.json({ suppliers });
  });

  router.post("/suppliers", tenantOnly, (req, res) => {
    const { name, phone, email, address, companyName, openingBalance, isActive } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Supplier name is required."
      });
    }

    const db = ensureCollections(readDb());

    const exists = db.suppliers.some(
      (supplier) =>
        supplier.tenantId === req.user.tenantId &&
        String(supplier.name || "").toLowerCase() === String(name).toLowerCase()
    );

    if (exists) {
      return res.status(409).json({
        message: "Supplier with this name already exists."
      });
    }

    const now = new Date().toISOString();

    const supplier = {
      id: uuid(),
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || null,
      name,
      companyName: companyName || "",
      phone: phone || "",
      email: email || "",
      address: address || "",
      openingBalance: Number(openingBalance || 0),
      balance: Number(openingBalance || 0),
      isActive: isActive !== false,
      createdAt: now,
      updatedAt: now
    };

    db.suppliers.push(supplier);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "SUPPLIER_CREATED",
      actor: req.user.username,
      details: {
        supplierId: supplier.id,
        supplierName: supplier.name
      },
      createdAt: now
    });

    writeDb(db);

    res.status(201).json({
      message: "Supplier created successfully.",
      supplier
    });
  });

  router.put("/suppliers/:supplierId", tenantOnly, (req, res) => {
    const { supplierId } = req.params;
    const { name, phone, email, address, companyName, openingBalance, balance, isActive } = req.body;

    const db = ensureCollections(readDb());

    const supplier = db.suppliers.find(
      (item) => item.id === supplierId && item.tenantId === req.user.tenantId
    );

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found."
      });
    }

    supplier.name = name || supplier.name;
    supplier.companyName = companyName ?? supplier.companyName;
    supplier.phone = phone ?? supplier.phone;
    supplier.email = email ?? supplier.email;
    supplier.address = address ?? supplier.address;
    supplier.openingBalance = openingBalance !== undefined ? Number(openingBalance || 0) : supplier.openingBalance;
    supplier.balance = balance !== undefined ? Number(balance || 0) : supplier.balance;
    supplier.isActive = typeof isActive === "boolean" ? isActive : supplier.isActive;
    supplier.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Supplier updated successfully.",
      supplier
    });
  });

  router.patch("/suppliers/:supplierId/toggle", tenantOnly, (req, res) => {
    const { supplierId } = req.params;

    const db = ensureCollections(readDb());

    const supplier = db.suppliers.find(
      (item) => item.id === supplierId && item.tenantId === req.user.tenantId
    );

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found."
      });
    }

    supplier.isActive = !supplier.isActive;
    supplier.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Supplier status updated.",
      supplier
    });
  });

  router.delete("/suppliers/:supplierId", tenantOnly, (req, res) => {
    const { supplierId } = req.params;

    const db = ensureCollections(readDb());

    const supplier = db.suppliers.find(
      (item) => item.id === supplierId && item.tenantId === req.user.tenantId
    );

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found."
      });
    }

    const hasPurchases = db.purchaseInvoices.some(
      (invoice) => invoice.supplierId === supplierId && invoice.tenantId === req.user.tenantId
    );

    if (hasPurchases) {
      return res.status(400).json({
        message: "Supplier has purchase history. Disable supplier instead of deleting."
      });
    }

    db.suppliers = db.suppliers.filter(
      (item) => !(item.id === supplierId && item.tenantId === req.user.tenantId)
    );

    writeDb(db);

    res.json({
      message: "Supplier deleted successfully."
    });
  });

  router.get("/purchases", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const purchases = db.purchaseInvoices
      .filter((invoice) => invoice.tenantId === req.user.tenantId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ purchases });
  });

  router.get("/setup", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const suppliers = db.suppliers
      .filter((supplier) => supplier.tenantId === req.user.tenantId && supplier.isActive !== false)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    const inventory = db.inventory
      .filter((item) => item.tenantId === req.user.tenantId)
      .sort((a, b) => getInventoryName(a).localeCompare(getInventoryName(b)));

    res.json({
      suppliers,
      inventory
    });
  });

  router.post("/purchases", tenantOnly, (req, res) => {
    const {
      supplierId,
      invoiceDate,
      dueDate,
      paymentStatus,
      paymentMethod,
      paidAmount,
      notes,
      items
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({
        message: "Supplier is required."
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "At least one purchase item is required."
      });
    }

    const db = ensureCollections(readDb());

    const supplier = db.suppliers.find(
      (item) => item.id === supplierId && item.tenantId === req.user.tenantId
    );

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found."
      });
    }

    const now = new Date().toISOString();
    const invoiceNo = makeInvoiceNo(db, req.user.tenantId);

    let subtotal = 0;
    const normalizedItems = [];
    const movements = [];

    for (const line of items) {
      const inventoryItem = db.inventory.find(
        (item) => item.id === line.inventoryItemId && item.tenantId === req.user.tenantId
      );

      if (!inventoryItem) {
        return res.status(404).json({
          message: `Inventory item not found for line: ${line.inventoryItemName || line.inventoryItemId}`
        });
      }

      const qty = Number(line.qty || 0);
      const unitCost = Number(line.unitCost || 0);
      const lineTotal = qty * unitCost;

      if (qty <= 0) {
        return res.status(400).json({
          message: "Purchase quantity must be greater than zero."
        });
      }

      subtotal += lineTotal;

      const beforeStock = getCurrentStock(inventoryItem);
      const afterStock = beforeStock + qty;

      setCurrentStock(inventoryItem, afterStock);

      inventoryItem.costPrice = unitCost || Number(inventoryItem.costPrice || 0);
      inventoryItem.unitCost = unitCost || Number(inventoryItem.unitCost || 0);
      inventoryItem.lastPurchasePrice = unitCost;
      inventoryItem.lastSupplierId = supplier.id;
      inventoryItem.lastSupplierName = supplier.name;
      inventoryItem.updatedAt = now;

      const purchaseLine = {
        id: uuid(),
        inventoryItemId: inventoryItem.id,
        inventoryItemName: getInventoryName(inventoryItem),
        qty,
        unit: line.unit || inventoryItem.unit || inventoryItem.stockUnit || "pcs",
        unitCost,
        lineTotal
      };

      normalizedItems.push(purchaseLine);

      movements.push({
        id: `move-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        tenantId: req.user.tenantId,
        branchId: req.user.branchId || null,
        type: "stock_in",
        inventoryItemId: inventoryItem.id,
        itemName: getInventoryName(inventoryItem),
        qty,
        beforeStock,
        afterStock,
        unit: purchaseLine.unit,
        supplierId: supplier.id,
        supplierName: supplier.name,
        invoiceNo,
        note: `Stock purchased from ${supplier.name} - ${invoiceNo}`,
        createdBy: req.user.username,
        createdAt: now
      });
    }

    const paid = Number(paidAmount || 0);
    const balance = Math.max(0, subtotal - paid);

    const invoice = {
      id: uuid(),
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || null,
      invoiceNo,
      supplierId: supplier.id,
      supplierName: supplier.name,
      invoiceDate: invoiceDate || now.slice(0, 10),
      dueDate: dueDate || "",
      paymentStatus: paymentStatus || (balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid"),
      paymentMethod: paymentMethod || "",
      items: normalizedItems,
      subtotal,
      paidAmount: paid,
      balance,
      notes: notes || "",
      createdBy: req.user.username,
      createdAt: now,
      updatedAt: now
    };

    supplier.balance = Number(supplier.balance || 0) + balance;
    supplier.updatedAt = now;

    db.purchaseInvoices.push(invoice);
    db.stockMovements.push(...movements);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "PURCHASE_INVOICE_CREATED",
      actor: req.user.username,
      details: {
        invoiceId: invoice.id,
        invoiceNo,
        supplierName: supplier.name,
        subtotal,
        paidAmount: paid,
        balance
      },
      createdAt: now
    });

    writeDb(db);

    res.status(201).json({
      message: "Purchase invoice created and stock updated.",
      invoice,
      movements
    });
  });

  router.patch("/purchases/:purchaseId/payment", tenantOnly, (req, res) => {
    const { purchaseId } = req.params;
    const { paidAmount, paymentMethod, paymentStatus, note } = req.body;

    const db = ensureCollections(readDb());

    const invoice = db.purchaseInvoices.find(
      (item) => item.id === purchaseId && item.tenantId === req.user.tenantId
    );

    if (!invoice) {
      return res.status(404).json({
        message: "Purchase invoice not found."
      });
    }

    const supplier = db.suppliers.find(
      (item) => item.id === invoice.supplierId && item.tenantId === req.user.tenantId
    );

    const oldBalance = Number(invoice.balance || 0);
    const additionalPayment = Number(paidAmount || 0);

    invoice.paidAmount = Number(invoice.paidAmount || 0) + additionalPayment;
    invoice.balance = Math.max(0, Number(invoice.subtotal || 0) - Number(invoice.paidAmount || 0));
    invoice.paymentMethod = paymentMethod || invoice.paymentMethod;
    invoice.paymentStatus = paymentStatus || (invoice.balance <= 0 ? "paid" : "partial");
    invoice.paymentNote = note || invoice.paymentNote || "";
    invoice.updatedAt = new Date().toISOString();

    if (supplier) {
      supplier.balance = Math.max(0, Number(supplier.balance || 0) - (oldBalance - Number(invoice.balance || 0)));
      supplier.updatedAt = new Date().toISOString();
    }

    writeDb(db);

    res.json({
      message: "Purchase payment updated.",
      invoice
    });
  });

  return router;
};