const express = require("express");
const { v4: uuid } = require("uuid");

const router = express.Router();

function ensureCollections(db) {
  db.tables = Array.isArray(db.tables) ? db.tables : [];
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

module.exports = function tableLayoutRoutes({ readDb, writeDb }) {
  router.post("/", tenantOnly, (req, res) => {
    const {
      name,
      floor,
      shape,
      chairs,
      x,
      y
    } = req.body;

    if (!name || !floor) {
      return res.status(400).json({
        message: "Table name and floor are required."
      });
    }

    const db = ensureCollections(readDb());

    const table = {
      id: uuid(),
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || null,
      name,
      floor,
      shape: shape || "rect",
      chairs: Number(chairs || 4),
      x: Number(x || 50),
      y: Number(y || 50),
      status: "available",
      timer: "",
      guests: 0,
      orderNo: "",
      staff: "",
      total: 0,
      currentOrderIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.tables.push(table);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "TABLE_CREATED",
      actor: req.user.username,
      details: table,
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.status(201).json({
      message: "Table created successfully.",
      table
    });
  });

  router.put("/:tableId", tenantOnly, (req, res) => {
    const { tableId } = req.params;

    const {
      name,
      floor,
      shape,
      chairs,
      x,
      y
    } = req.body;

    const db = ensureCollections(readDb());

    const table = db.tables.find(
      (item) => item.id === tableId && item.tenantId === req.user.tenantId
    );

    if (!table) {
      return res.status(404).json({
        message: "Table not found."
      });
    }

    table.name = name || table.name;
    table.floor = floor || table.floor;
    table.shape = shape || table.shape;
    table.chairs = chairs !== undefined ? Number(chairs || 0) : table.chairs;
    table.x = x !== undefined ? Number(x || 0) : table.x;
    table.y = y !== undefined ? Number(y || 0) : table.y;
    table.updatedAt = new Date().toISOString();

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "TABLE_UPDATED",
      actor: req.user.username,
      details: table,
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Table updated successfully.",
      table
    });
  });

  router.delete("/:tableId", tenantOnly, (req, res) => {
    const { tableId } = req.params;

    const db = ensureCollections(readDb());

    const table = db.tables.find(
      (item) => item.id === tableId && item.tenantId === req.user.tenantId
    );

    if (!table) {
      return res.status(404).json({
        message: "Table not found."
      });
    }

    if (table.status === "occupied") {
      return res.status(400).json({
        message: "Occupied table cannot be deleted. Settle or move the order first."
      });
    }

    db.tables = db.tables.filter(
      (item) => !(item.id === tableId && item.tenantId === req.user.tenantId)
    );

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "TABLE_DELETED",
      actor: req.user.username,
      details: {
        tableId,
        tableName: table.name
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Table deleted successfully."
    });
  });

  router.patch("/:tableId/position", tenantOnly, (req, res) => {
    const { tableId } = req.params;
    const { x, y } = req.body;

    const db = ensureCollections(readDb());

    const table = db.tables.find(
      (item) => item.id === tableId && item.tenantId === req.user.tenantId
    );

    if (!table) {
      return res.status(404).json({
        message: "Table not found."
      });
    }

    table.x = Math.max(4, Math.min(96, Number(x || table.x)));
    table.y = Math.max(4, Math.min(92, Number(y || table.y)));
    table.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Table position updated.",
      table
    });
  });

  return router;
};