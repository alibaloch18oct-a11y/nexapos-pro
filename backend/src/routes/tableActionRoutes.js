const express = require("express");

const router = express.Router();

function ensureCollections(db) {
  db.tables = Array.isArray(db.tables) ? db.tables : [];
  db.orders = Array.isArray(db.orders) ? db.orders : [];
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

function clearTable(table) {
  table.status = "available";
  table.timer = "";
  table.guests = 0;
  table.orderNo = "";
  table.staff = "";
  table.total = 0;
  table.currentOrderIds = [];
  table.updatedAt = new Date().toISOString();
}

function updateOrdersToTable(db, tenantId, orderIds, targetTable) {
  db.orders = db.orders.map((order) => {
    if (
      order.tenantId === tenantId &&
      Array.isArray(orderIds) &&
      orderIds.includes(order.id)
    ) {
      return {
        ...order,
        tableId: targetTable.id,
        tableName: targetTable.name,
        table: {
          ...(order.table || {}),
          id: targetTable.id,
          name: targetTable.name,
          floor: targetTable.floor
        },
        updatedAt: new Date().toISOString()
      };
    }

    return order;
  });
}

module.exports = function tableActionRoutes({ readDb, writeDb }) {
  router.post("/move", tenantOnly, (req, res) => {
    const { fromTableId, toTableId } = req.body;

    if (!fromTableId || !toTableId) {
      return res.status(400).json({
        message: "From table and target table are required."
      });
    }

    if (fromTableId === toTableId) {
      return res.status(400).json({
        message: "You cannot move table to itself."
      });
    }

    const db = ensureCollections(readDb());

    const fromTable = db.tables.find(
      (table) => table.id === fromTableId && table.tenantId === req.user.tenantId
    );

    const toTable = db.tables.find(
      (table) => table.id === toTableId && table.tenantId === req.user.tenantId
    );

    if (!fromTable || !toTable) {
      return res.status(404).json({
        message: "Table not found."
      });
    }

    if (fromTable.status !== "occupied") {
      return res.status(400).json({
        message: "Only occupied table can be moved."
      });
    }

    if (toTable.status === "occupied") {
      return res.status(400).json({
        message: "Target table is occupied. Use Merge instead."
      });
    }

    const movingOrderIds = Array.isArray(fromTable.currentOrderIds)
      ? [...fromTable.currentOrderIds]
      : [];

    toTable.status = "occupied";
    toTable.timer = fromTable.timer || "00:00:01";
    toTable.guests = Number(fromTable.guests || 0);
    toTable.orderNo = fromTable.orderNo || "";
    toTable.staff = fromTable.staff || "";
    toTable.total = Number(fromTable.total || 0);
    toTable.currentOrderIds = movingOrderIds;
    toTable.updatedAt = new Date().toISOString();

    updateOrdersToTable(db, req.user.tenantId, movingOrderIds, toTable);

    clearTable(fromTable);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      action: "TABLE_MOVED",
      actor: req.user.username,
      tenantId: req.user.tenantId,
      details: {
        fromTableId,
        fromTableName: fromTable.name,
        toTableId,
        toTableName: toTable.name,
        orderIds: movingOrderIds
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: `Table ${fromTable.name} moved to table ${toTable.name}.`,
      fromTable,
      toTable
    });
  });

  router.post("/merge", tenantOnly, (req, res) => {
    const { sourceTableId, targetTableId } = req.body;

    if (!sourceTableId || !targetTableId) {
      return res.status(400).json({
        message: "Source table and target table are required."
      });
    }

    if (sourceTableId === targetTableId) {
      return res.status(400).json({
        message: "You cannot merge table with itself."
      });
    }

    const db = ensureCollections(readDb());

    const sourceTable = db.tables.find(
      (table) => table.id === sourceTableId && table.tenantId === req.user.tenantId
    );

    const targetTable = db.tables.find(
      (table) => table.id === targetTableId && table.tenantId === req.user.tenantId
    );

    if (!sourceTable || !targetTable) {
      return res.status(404).json({
        message: "Table not found."
      });
    }

    if (sourceTable.status !== "occupied") {
      return res.status(400).json({
        message: "Source table must be occupied."
      });
    }

    if (targetTable.status !== "occupied") {
      return res.status(400).json({
        message: "Target table must be occupied for merge. Use Move for empty table."
      });
    }

    const sourceOrderIds = Array.isArray(sourceTable.currentOrderIds)
      ? sourceTable.currentOrderIds
      : [];

    const targetOrderIds = Array.isArray(targetTable.currentOrderIds)
      ? targetTable.currentOrderIds
      : [];

    const mergedOrderIds = [...new Set([...targetOrderIds, ...sourceOrderIds])];

    targetTable.guests = Number(targetTable.guests || 0) + Number(sourceTable.guests || 0);
    targetTable.total = Number(targetTable.total || 0) + Number(sourceTable.total || 0);
    targetTable.currentOrderIds = mergedOrderIds;
    targetTable.orderNo = targetTable.orderNo || sourceTable.orderNo || "";
    targetTable.staff = targetTable.staff || sourceTable.staff || "";
    targetTable.status = "occupied";
    targetTable.updatedAt = new Date().toISOString();

    updateOrdersToTable(db, req.user.tenantId, sourceOrderIds, targetTable);

    clearTable(sourceTable);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      action: "TABLE_MERGED",
      actor: req.user.username,
      tenantId: req.user.tenantId,
      details: {
        sourceTableId,
        sourceTableName: sourceTable.name,
        targetTableId,
        targetTableName: targetTable.name,
        mergedOrderIds
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: `Table ${sourceTable.name} merged into table ${targetTable.name}.`,
      sourceTable,
      targetTable
    });
  });

  return router;
};