const express = require("express");
const { v4: uuid } = require("uuid");

const router = express.Router();

function ensureCollections(db) {
  db.menuInventoryMappings = Array.isArray(db.menuInventoryMappings) ? db.menuInventoryMappings : [];
  db.menuItems = Array.isArray(db.menuItems) ? db.menuItems : [];
  db.inventory = Array.isArray(db.inventory) ? db.inventory : [];
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

function getInventoryName(item) {
  return item.name || item.itemName || item.productName || "Inventory Item";
}

module.exports = function menuInventoryMappingRoutes({ readDb, writeDb }) {
  router.get("/", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const mappings = db.menuInventoryMappings
      .filter((item) => item.tenantId === req.user.tenantId)
      .sort((a, b) => a.menuItemName.localeCompare(b.menuItemName));

    const menuItems = db.menuItems
      .filter((item) => item.tenantId === req.user.tenantId)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    const inventory = db.inventory
      .filter((item) => item.tenantId === req.user.tenantId)
      .sort((a, b) => getInventoryName(a).localeCompare(getInventoryName(b)));

    res.json({
      mappings,
      menuItems,
      inventory
    });
  });

  router.post("/", tenantOnly, (req, res) => {
    const {
      menuItemId,
      inventoryItemId,
      deductQty,
      unit,
      note,
      isActive
    } = req.body;

    if (!menuItemId || !inventoryItemId) {
      return res.status(400).json({
        message: "Menu item and inventory item are required."
      });
    }

    const db = ensureCollections(readDb());

    const menuItem = db.menuItems.find(
      (item) => item.id === menuItemId && item.tenantId === req.user.tenantId
    );

    const inventoryItem = db.inventory.find(
      (item) => item.id === inventoryItemId && item.tenantId === req.user.tenantId
    );

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found."
      });
    }

    if (!inventoryItem) {
      return res.status(404).json({
        message: "Inventory item not found."
      });
    }

    const duplicate = db.menuInventoryMappings.find(
      (item) =>
        item.tenantId === req.user.tenantId &&
        item.menuItemId === menuItemId &&
        item.inventoryItemId === inventoryItemId
    );

    if (duplicate) {
      return res.status(409).json({
        message: "This menu item is already mapped to this inventory item."
      });
    }

    const now = new Date().toISOString();

    const mapping = {
      id: uuid(),
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || null,

      menuItemId,
      menuItemName: menuItem.name || "",
      menuItemCategory: menuItem.category || "",

      inventoryItemId,
      inventoryItemName: getInventoryName(inventoryItem),

      deductQty: Number(deductQty || 1),
      unit: unit || inventoryItem.unit || inventoryItem.stockUnit || "pcs",
      note: note || "",
      isActive: isActive !== false,

      createdAt: now,
      updatedAt: now
    };

    db.menuInventoryMappings.push(mapping);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "MENU_INVENTORY_MAPPING_CREATED",
      actor: req.user.username,
      details: mapping,
      createdAt: now
    });

    writeDb(db);

    res.status(201).json({
      message: "Menu inventory mapping created.",
      mapping
    });
  });

  router.put("/:mappingId", tenantOnly, (req, res) => {
    const { mappingId } = req.params;

    const {
      menuItemId,
      inventoryItemId,
      deductQty,
      unit,
      note,
      isActive
    } = req.body;

    const db = ensureCollections(readDb());

    const mapping = db.menuInventoryMappings.find(
      (item) => item.id === mappingId && item.tenantId === req.user.tenantId
    );

    if (!mapping) {
      return res.status(404).json({
        message: "Mapping not found."
      });
    }

    if (menuItemId) {
      const menuItem = db.menuItems.find(
        (item) => item.id === menuItemId && item.tenantId === req.user.tenantId
      );

      if (!menuItem) {
        return res.status(404).json({
          message: "Menu item not found."
        });
      }

      mapping.menuItemId = menuItemId;
      mapping.menuItemName = menuItem.name || "";
      mapping.menuItemCategory = menuItem.category || "";
    }

    if (inventoryItemId) {
      const inventoryItem = db.inventory.find(
        (item) => item.id === inventoryItemId && item.tenantId === req.user.tenantId
      );

      if (!inventoryItem) {
        return res.status(404).json({
          message: "Inventory item not found."
        });
      }

      mapping.inventoryItemId = inventoryItemId;
      mapping.inventoryItemName = getInventoryName(inventoryItem);
      mapping.unit = unit || inventoryItem.unit || inventoryItem.stockUnit || mapping.unit || "pcs";
    }

    mapping.deductQty = deductQty !== undefined ? Number(deductQty || 1) : mapping.deductQty;
    mapping.unit = unit || mapping.unit || "pcs";
    mapping.note = note ?? mapping.note;
    mapping.isActive = typeof isActive === "boolean" ? isActive : mapping.isActive;
    mapping.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Menu inventory mapping updated.",
      mapping
    });
  });

  router.patch("/:mappingId/toggle", tenantOnly, (req, res) => {
    const { mappingId } = req.params;

    const db = ensureCollections(readDb());

    const mapping = db.menuInventoryMappings.find(
      (item) => item.id === mappingId && item.tenantId === req.user.tenantId
    );

    if (!mapping) {
      return res.status(404).json({
        message: "Mapping not found."
      });
    }

    mapping.isActive = !mapping.isActive;
    mapping.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Mapping status updated.",
      mapping
    });
  });

  router.delete("/:mappingId", tenantOnly, (req, res) => {
    const { mappingId } = req.params;

    const db = ensureCollections(readDb());

    const mapping = db.menuInventoryMappings.find(
      (item) => item.id === mappingId && item.tenantId === req.user.tenantId
    );

    if (!mapping) {
      return res.status(404).json({
        message: "Mapping not found."
      });
    }

    db.menuInventoryMappings = db.menuInventoryMappings.filter(
      (item) => !(item.id === mappingId && item.tenantId === req.user.tenantId)
    );

    writeDb(db);

    res.json({
      message: "Mapping deleted."
    });
  });

  router.post("/auto-suggest", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const menuItems = db.menuItems.filter((item) => item.tenantId === req.user.tenantId);
    const inventory = db.inventory.filter((item) => item.tenantId === req.user.tenantId);

    const suggestions = [];

    menuItems.forEach((menuItem) => {
      const menuName = normalize(menuItem.name);

      inventory.forEach((stockItem) => {
        const stockName = normalize(getInventoryName(stockItem));

        if (!menuName || !stockName) return;

        const alreadyMapped = db.menuInventoryMappings.some(
          (mapping) =>
            mapping.tenantId === req.user.tenantId &&
            mapping.menuItemId === menuItem.id &&
            mapping.inventoryItemId === stockItem.id
        );

        if (alreadyMapped) return;

        if (menuName === stockName || menuName.includes(stockName) || stockName.includes(menuName)) {
          suggestions.push({
            menuItemId: menuItem.id,
            menuItemName: menuItem.name,
            inventoryItemId: stockItem.id,
            inventoryItemName: getInventoryName(stockItem),
            deductQty: 1,
            confidence: menuName === stockName ? "High" : "Medium"
          });
        }
      });
    });

    res.json({
      suggestions
    });
  });

  return router;
};