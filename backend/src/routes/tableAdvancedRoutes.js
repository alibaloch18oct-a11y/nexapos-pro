const express = require("express");

const router = express.Router();

const defaultTables = [
  { name: "T1", area: "Main Hall", seats: 4, status: "available", shape: "round" },
  { name: "T2", area: "Main Hall", seats: 4, status: "available", shape: "round" },
  { name: "T3", area: "Main Hall", seats: 6, status: "available", shape: "rect" },
  { name: "T4", area: "Main Hall", seats: 2, status: "available", shape: "round" },
  { name: "T5", area: "VIP Room", seats: 6, status: "reserved", shape: "rect" },
  { name: "T6", area: "VIP Room", seats: 8, status: "available", shape: "rect" },
  { name: "T7", area: "Family Zone", seats: 6, status: "available", shape: "rect" },
  { name: "T8", area: "Family Zone", seats: 4, status: "cleaning", shape: "round" },
  { name: "T9", area: "Outdoor", seats: 4, status: "available", shape: "round" },
  { name: "T10", area: "Outdoor", seats: 2, status: "available", shape: "round" },
  { name: "T11", area: "Outdoor", seats: 6, status: "available", shape: "rect" },
  { name: "T12", area: "Main Hall", seats: 8, status: "available", shape: "rect" }
];

const allowedStatuses = ["available", "occupied", "reserved", "cleaning", "merged"];

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

function createTenantDefaultTables(db, tenantId) {
  const existing = db.tables.filter((table) => table.tenantId === tenantId);

  if (existing.length > 0) return existing;

  const now = new Date().toISOString();

  const created = defaultTables.map((table, index) => ({
    id: `table-${tenantId}-${index + 1}`,
    tenantId,
    name: table.name,
    area: table.area,
    seats: table.seats,
    status: table.status,
    shape: table.shape,
    waiterName: "",
    currentOrderNo: "",
    total: 0,
    reservationName: table.status === "reserved" ? "VIP Guest" : "",
    reservationPhone: table.status === "reserved" ? "03000000000" : "",
    reservationTime: table.status === "reserved" ? "21:00" : "",
    reservationNote: "",
    mergedWith: [],
    mergedMasterId: "",
    createdAt: now,
    updatedAt: now
  }));

  db.tables.push(...created);

  return created;
}

function normalizeTable(table) {
  return {
    ...table,
    seats: Number(table.seats || table.chairs || table.capacity || 4),
    mergedWith: Array.isArray(table.mergedWith) ? table.mergedWith : [],
    mergedMasterId: table.mergedMasterId || "",
    reservationName: table.reservationName || "",
    reservationPhone: table.reservationPhone || "",
    reservationTime: table.reservationTime || "",
    reservationNote: table.reservationNote || "",
    waiterName: table.waiterName || "",
    currentOrderNo: table.currentOrderNo || "",
    total: Number(table.total || 0)
  };
}

module.exports = function tableAdvancedRoutes({ readDb, writeDb }) {
  router.get("/", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const tables = createTenantDefaultTables(db, req.user.tenantId)
      .map(normalizeTable)
      .sort((a, b) => {
        const areaSort = String(a.area || "").localeCompare(String(b.area || ""));
        if (areaSort !== 0) return areaSort;
        return String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true });
      });

    writeDb(db);

    res.json({
      tables
    });
  });

  router.post("/", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());
    const now = new Date().toISOString();

    const table = {
      id: `table-${req.user.tenantId}-${Date.now()}`,
      tenantId: req.user.tenantId,
      name: req.body.name || `T${Date.now()}`,
      area: req.body.area || "Main Hall",
      seats: Number(req.body.seats || 4),
      status: allowedStatuses.includes(req.body.status) ? req.body.status : "available",
      shape: req.body.shape || (Number(req.body.seats || 4) > 4 ? "rect" : "round"),
      waiterName: "",
      currentOrderNo: "",
      total: 0,
      reservationName: "",
      reservationPhone: "",
      reservationTime: "",
      reservationNote: "",
      mergedWith: [],
      mergedMasterId: "",
      createdAt: now,
      updatedAt: now
    };

    db.tables.push(table);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "TABLE_CREATED",
      actor: req.user.username,
      details: table,
      createdAt: now
    });

    writeDb(db);

    res.status(201).json({
      message: "Table created successfully.",
      table: normalizeTable(table)
    });
  });

  router.patch("/:tableId", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());
    createTenantDefaultTables(db, req.user.tenantId);

    const table = db.tables.find(
      (item) => item.tenantId === req.user.tenantId && item.id === req.params.tableId
    );

    if (!table) {
      return res.status(404).json({
        message: "Table not found."
      });
    }

    const before = { ...table };

    const editableFields = [
      "name",
      "area",
      "seats",
      "status",
      "shape",
      "waiterName",
      "currentOrderNo",
      "total",
      "reservationName",
      "reservationPhone",
      "reservationTime",
      "reservationNote",
      "mergedWith",
      "mergedMasterId"
    ];

    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        table[field] = req.body[field];
      }
    });

    table.seats = Number(table.seats || 4);
    table.total = Number(table.total || 0);
    table.mergedWith = Array.isArray(table.mergedWith) ? table.mergedWith : [];
    table.mergedMasterId = table.mergedMasterId || "";

    if (!allowedStatuses.includes(table.status)) {
      table.status = "available";
    }

    if (table.status === "available") {
      table.reservationName = table.reservationName || "";
      table.reservationPhone = table.reservationPhone || "";
      table.reservationTime = table.reservationTime || "";
      table.reservationNote = table.reservationNote || "";
    }

    table.updatedAt = new Date().toISOString();
    table.updatedBy = req.user.username;

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "TABLE_UPDATED",
      actor: req.user.username,
      details: {
        tableId: table.id,
        tableName: table.name,
        before,
        after: table
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Table updated successfully.",
      table: normalizeTable(table)
    });
  });

  router.post("/move", tenantOnly, (req, res) => {
    const { sourceTableId, targetTableId } = req.body;

    if (!sourceTableId || !targetTableId) {
      return res.status(400).json({
        message: "Source and target table are required."
      });
    }

    const db = ensureCollections(readDb());
    createTenantDefaultTables(db, req.user.tenantId);

    const source = db.tables.find(
      (table) => table.tenantId === req.user.tenantId && table.id === sourceTableId
    );
    const target = db.tables.find(
      (table) => table.tenantId === req.user.tenantId && table.id === targetTableId
    );

    if (!source || !target) {
      return res.status(404).json({
        message: "Source or target table not found."
      });
    }

    const sourceBefore = { ...source };
    const targetBefore = { ...target };

    target.status = source.status;
    target.waiterName = source.waiterName || "";
    target.currentOrderNo = source.currentOrderNo || "";
    target.total = Number(source.total || 0);
    target.reservationName = source.reservationName || "";
    target.reservationPhone = source.reservationPhone || "";
    target.reservationTime = source.reservationTime || "";
    target.reservationNote = source.reservationNote || "";
    target.updatedAt = new Date().toISOString();
    target.updatedBy = req.user.username;

    source.status = "available";
    source.waiterName = "";
    source.currentOrderNo = "";
    source.total = 0;
    source.reservationName = "";
    source.reservationPhone = "";
    source.reservationTime = "";
    source.reservationNote = "";
    source.mergedWith = [];
    source.mergedMasterId = "";
    source.updatedAt = new Date().toISOString();
    source.updatedBy = req.user.username;

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "TABLE_MOVED",
      actor: req.user.username,
      details: {
        sourceBefore,
        targetBefore,
        sourceAfter: source,
        targetAfter: target
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Table moved successfully.",
      source: normalizeTable(source),
      target: normalizeTable(target)
    });
  });

  router.post("/merge", tenantOnly, (req, res) => {
    const { masterTableId, targetTableId } = req.body;

    if (!masterTableId || !targetTableId) {
      return res.status(400).json({
        message: "Master and target table are required."
      });
    }

    const db = ensureCollections(readDb());
    createTenantDefaultTables(db, req.user.tenantId);

    const master = db.tables.find(
      (table) => table.tenantId === req.user.tenantId && table.id === masterTableId
    );
    const target = db.tables.find(
      (table) => table.tenantId === req.user.tenantId && table.id === targetTableId
    );

    if (!master || !target) {
      return res.status(404).json({
        message: "Master or target table not found."
      });
    }

    master.mergedWith = Array.isArray(master.mergedWith) ? master.mergedWith : [];

    if (!master.mergedWith.includes(target.id)) {
      master.mergedWith.push(target.id);
    }

    if (master.status === "available") {
      master.status = "occupied";
    }

    master.updatedAt = new Date().toISOString();
    master.updatedBy = req.user.username;

    target.status = "merged";
    target.mergedMasterId = master.id;
    target.updatedAt = new Date().toISOString();
    target.updatedBy = req.user.username;

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "TABLES_MERGED",
      actor: req.user.username,
      details: {
        masterTableId: master.id,
        targetTableId: target.id
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Tables merged successfully.",
      master: normalizeTable(master),
      target: normalizeTable(target)
    });
  });

  router.post("/unmerge", tenantOnly, (req, res) => {
    const { tableId } = req.body;

    if (!tableId) {
      return res.status(400).json({
        message: "Table ID is required."
      });
    }

    const db = ensureCollections(readDb());
    createTenantDefaultTables(db, req.user.tenantId);

    const table = db.tables.find(
      (item) => item.tenantId === req.user.tenantId && item.id === tableId
    );

    if (!table) {
      return res.status(404).json({
        message: "Table not found."
      });
    }

    const affected = [];

    if (table.mergedMasterId) {
      const master = db.tables.find(
        (item) => item.tenantId === req.user.tenantId && item.id === table.mergedMasterId
      );

      if (master) {
        master.mergedWith = (master.mergedWith || []).filter((id) => id !== table.id);
        master.updatedAt = new Date().toISOString();
        master.updatedBy = req.user.username;
        affected.push(master);
      }

      table.mergedMasterId = "";
      table.status = "available";
      table.updatedAt = new Date().toISOString();
      table.updatedBy = req.user.username;
      affected.push(table);
    } else {
      const childIds = Array.isArray(table.mergedWith) ? table.mergedWith : [];
      table.mergedWith = [];
      table.updatedAt = new Date().toISOString();
      table.updatedBy = req.user.username;
      affected.push(table);

      db.tables.forEach((item) => {
        if (item.tenantId === req.user.tenantId && childIds.includes(item.id)) {
          item.mergedMasterId = "";
          item.status = "available";
          item.updatedAt = new Date().toISOString();
          item.updatedBy = req.user.username;
          affected.push(item);
        }
      });
    }

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "TABLES_UNMERGED",
      actor: req.user.username,
      details: {
        tableId,
        affectedTableIds: affected.map((item) => item.id)
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Tables unmerged successfully.",
      tables: affected.map(normalizeTable)
    });
  });

  return router;
};