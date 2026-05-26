const express = require("express");

const router = express.Router();
const allowedStatuses = ["available", "occupied", "reserved", "cleaning", "merged"];
const allowedShapes = ["round", "square", "rect", "booth"];
const defaults = [
  ["T1", "Main Hall", 4, "available", "round"],
  ["T2", "Main Hall", 4, "available", "round"],
  ["T3", "Main Hall", 6, "available", "rect"],
  ["T4", "Main Hall", 2, "cleaning", "round"],
  ["VIP 1", "VIP Room", 6, "reserved", "rect"],
  ["VIP 2", "VIP Room", 8, "available", "rect"],
  ["F1", "Family Zone", 6, "available", "rect"],
  ["F2", "Family Zone", 4, "available", "round"],
  ["O1", "Outdoor", 4, "available", "round"],
  ["R1", "Rooftop", 8, "available", "rect"]
];

function now() { return new Date().toISOString(); }
function ensure(db) {
  db.tables = Array.isArray(db.tables) ? db.tables : [];
  db.orders = Array.isArray(db.orders) ? db.orders : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  return db;
}
function tenantOnly(req, res, next) {
  if (!req.user?.tenantId) return res.status(403).json({ message: "Restaurant account access required." });
  next();
}
function id(tenantId) { return `table-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function norm(t) {
  const seats = Math.max(1, Math.min(24, Number(t.seats || t.chairs || t.capacity || 4)));
  const area = t.area || t.floor || t.section || "Main Hall";
  return {
    ...t,
    id: t.id,
    area,
    floor: area,
    seats,
    chairs: seats,
    status: allowedStatuses.includes(t.status) ? t.status : "available",
    shape: allowedShapes.includes(t.shape) ? t.shape : seats > 4 ? "rect" : "round",
    guests: Number(t.guests || 0),
    waiterName: t.waiterName || t.staff || "",
    staff: t.staff || t.waiterName || "",
    currentOrderNo: t.currentOrderNo || t.orderNo || "",
    orderNo: t.orderNo || t.currentOrderNo || "",
    currentOrderIds: Array.isArray(t.currentOrderIds) ? t.currentOrderIds : [],
    total: Number(t.total || 0),
    reservationName: t.reservationName || "",
    reservationPhone: t.reservationPhone || "",
    reservationTime: t.reservationTime || "",
    reservationNote: t.reservationNote || "",
    mergedWith: Array.isArray(t.mergedWith) ? t.mergedWith : [],
    mergedMasterId: t.mergedMasterId || "",
    updatedAt: t.updatedAt || now(),
    createdAt: t.createdAt || now()
  };
}
function seed(db, req) {
  const existing = db.tables.filter((t) => t.tenantId === req.user.tenantId);
  if (existing.length) {
    existing.forEach((t) => Object.assign(t, norm(t)));
    return existing;
  }
  const created = defaults.map((row, index) => norm({
    id: `table-${req.user.tenantId}-${index + 1}`,
    tenantId: req.user.tenantId,
    branchId: req.user.branchId || null,
    name: row[0], area: row[1], floor: row[1], seats: row[2], chairs: row[2], status: row[3], shape: row[4],
    reservationName: row[3] === "reserved" ? "VIP Guest" : "",
    reservationPhone: row[3] === "reserved" ? "03000000000" : "",
    reservationTime: row[3] === "reserved" ? "21:00" : ""
  }));
  db.tables.push(...created);
  return created;
}
function audit(db, req, action, details) {
  db.auditLogs.push({ id: `audit-${Date.now()}`, tenantId: req.user.tenantId, action, actor: req.user.username, details, createdAt: now() });
}
function ordersFor(db, tenantId, table) {
  const ids = Array.isArray(table.currentOrderIds) ? table.currentOrderIds : [];
  return db.orders.filter((o) => o.tenantId === tenantId && (ids.includes(o.id) || o.tableId === table.id || o.table?.id === table.id));
}
function linkOrders(db, tenantId, orderIds, table) {
  db.orders = db.orders.map((o) => {
    if (o.tenantId !== tenantId || !orderIds.includes(o.id)) return o;
    return { ...o, tableId: table.id, tableName: table.name, table: { ...(o.table || {}), id: table.id, name: table.name, floor: table.area, area: table.area }, updatedAt: now() };
  });
}
function clear(table) {
  table.status = "available"; table.guests = 0; table.waiterName = ""; table.staff = ""; table.currentOrderNo = ""; table.orderNo = ""; table.total = 0; table.currentOrderIds = []; table.reservationName = ""; table.reservationPhone = ""; table.reservationTime = ""; table.reservationNote = ""; table.mergedWith = []; table.mergedMasterId = ""; table.updatedAt = now();
}

module.exports = function tableAdvancedRoutes({ readDb, writeDb }) {
  router.get("/floor-plan", tenantOnly, (req, res) => {
    const db = ensure(readDb());
    const tables = seed(db, req).map(norm).sort((a,b) => String(a.area).localeCompare(String(b.area)) || String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
    writeDb(db);
    res.json({ tables });
  });

  router.get("/:tableId/orders", tenantOnly, (req, res) => {
    const db = ensure(readDb()); seed(db, req);
    const table = db.tables.find((t) => t.tenantId === req.user.tenantId && t.id === req.params.tableId);
    if (!table) return res.status(404).json({ message: "Table not found." });
    res.json({ table: norm(table), orders: ordersFor(db, req.user.tenantId, norm(table)) });
  });

  router.post("/", tenantOnly, (req, res) => {
    const db = ensure(readDb());
    const seats = Math.max(1, Math.min(24, Number(req.body.seats || req.body.chairs || 4)));
    const area = req.body.area || req.body.floor || "Main Hall";
    const table = norm({ id: id(req.user.tenantId), tenantId: req.user.tenantId, branchId: req.user.branchId || null, name: req.body.name || `T${Date.now()}`, area, floor: area, seats, chairs: seats, status: req.body.status || "available", shape: req.body.shape || (seats > 4 ? "rect" : "round"), guests: req.body.guests || 0, waiterName: req.body.waiterName || req.body.staff || "", staff: req.body.staff || req.body.waiterName || "", reservationName: req.body.reservationName || "", reservationPhone: req.body.reservationPhone || "", reservationTime: req.body.reservationTime || "", reservationNote: req.body.reservationNote || "" });
    db.tables.push(table); audit(db, req, "TABLE_CREATED", table); writeDb(db);
    res.status(201).json({ message: "Table created successfully.", table });
  });

  router.patch("/:tableId", tenantOnly, (req, res) => {
    const db = ensure(readDb()); seed(db, req);
    const table = db.tables.find((t) => t.tenantId === req.user.tenantId && t.id === req.params.tableId);
    if (!table) return res.status(404).json({ message: "Table not found." });
    const before = norm({ ...table });
    const patch = req.body || {};
    if (patch.name !== undefined) table.name = String(patch.name || table.name).trim();
    if (patch.area !== undefined || patch.floor !== undefined) table.area = table.floor = patch.area || patch.floor || "Main Hall";
    if (patch.seats !== undefined || patch.chairs !== undefined) table.seats = table.chairs = Math.max(1, Math.min(24, Number(patch.seats || patch.chairs || 4)));
    if (patch.status !== undefined && allowedStatuses.includes(patch.status)) table.status = patch.status;
    if (patch.shape !== undefined && allowedShapes.includes(patch.shape)) table.shape = patch.shape;
    ["guests","total"].forEach((f) => { if (patch[f] !== undefined) table[f] = Number(patch[f] || 0); });
    ["waiterName","staff","reservationName","reservationPhone","reservationTime","reservationNote","mergedMasterId"].forEach((f) => { if (patch[f] !== undefined) table[f] = String(patch[f] || ""); });
    if (Array.isArray(patch.currentOrderIds)) table.currentOrderIds = patch.currentOrderIds;
    if (Array.isArray(patch.mergedWith)) table.mergedWith = patch.mergedWith;
    if (!table.staff && table.waiterName) table.staff = table.waiterName;
    if (!table.waiterName && table.staff) table.waiterName = table.staff;
    table.updatedAt = now(); Object.assign(table, norm(table));
    audit(db, req, "TABLE_UPDATED", { before, after: table }); writeDb(db);
    res.json({ message: "Table updated successfully.", table: norm(table) });
  });

  router.post("/move", tenantOnly, (req, res) => {
    const db = ensure(readDb()); seed(db, req);
    const sourceId = req.body.sourceTableId || req.body.fromTableId;
    const targetId = req.body.targetTableId || req.body.toTableId;
    const source = db.tables.find((t) => t.tenantId === req.user.tenantId && t.id === sourceId);
    const target = db.tables.find((t) => t.tenantId === req.user.tenantId && t.id === targetId);
    if (!source || !target) return res.status(404).json({ message: "Source or target table not found." });
    if (source.id === target.id) return res.status(400).json({ message: "You cannot move table to itself." });
    if (target.status === "occupied") return res.status(400).json({ message: "Target table is occupied. Use merge instead." });
    const orderIds = Array.isArray(source.currentOrderIds) ? [...source.currentOrderIds] : [];
    Object.assign(target, { status: source.status === "available" ? "occupied" : source.status, guests: source.guests || 0, waiterName: source.waiterName || source.staff || "", staff: source.staff || source.waiterName || "", currentOrderNo: source.currentOrderNo || source.orderNo || "", orderNo: source.orderNo || source.currentOrderNo || "", total: Number(source.total || 0), currentOrderIds: orderIds, reservationName: source.reservationName || "", reservationPhone: source.reservationPhone || "", reservationTime: source.reservationTime || "", reservationNote: source.reservationNote || "", updatedAt: now() });
    linkOrders(db, req.user.tenantId, orderIds, target); clear(source); audit(db, req, "TABLE_MOVED", { sourceId, targetId, orderIds }); writeDb(db);
    res.json({ message: `Table moved to ${target.name}.`, source: norm(source), target: norm(target) });
  });

  router.post("/merge", tenantOnly, (req, res) => {
    const db = ensure(readDb()); seed(db, req);
    const masterId = req.body.masterTableId;
    const childId = req.body.targetTableId || req.body.sourceTableId;
    const master = db.tables.find((t) => t.tenantId === req.user.tenantId && t.id === masterId);
    const child = db.tables.find((t) => t.tenantId === req.user.tenantId && t.id === childId);
    if (!master || !child) return res.status(404).json({ message: "Master or target table not found." });
    if (master.id === child.id) return res.status(400).json({ message: "You cannot merge table with itself." });
    master.mergedWith = Array.isArray(master.mergedWith) ? master.mergedWith : [];
    if (!master.mergedWith.includes(child.id)) master.mergedWith.push(child.id);
    const ids = [...new Set([...(master.currentOrderIds || []), ...(child.currentOrderIds || [])])];
    master.status = "occupied"; master.guests = Number(master.guests || 0) + Number(child.guests || 0); master.total = Number(master.total || 0) + Number(child.total || 0); master.currentOrderIds = ids; master.orderNo = master.orderNo || child.orderNo || child.currentOrderNo || ""; master.currentOrderNo = master.currentOrderNo || child.currentOrderNo || child.orderNo || ""; master.waiterName = master.waiterName || child.waiterName || child.staff || ""; master.staff = master.staff || child.staff || child.waiterName || ""; master.updatedAt = now();
    child.status = "merged"; child.mergedMasterId = master.id; child.updatedAt = now();
    linkOrders(db, req.user.tenantId, child.currentOrderIds || [], master); audit(db, req, "TABLES_MERGED", { masterId, childId, orderIds: ids }); writeDb(db);
    res.json({ message: `Table ${child.name} merged into ${master.name}.`, master: norm(master), target: norm(child) });
  });

  router.post("/unmerge", tenantOnly, (req, res) => {
    const db = ensure(readDb()); seed(db, req);
    const table = db.tables.find((t) => t.tenantId === req.user.tenantId && t.id === req.body.tableId);
    if (!table) return res.status(404).json({ message: "Table not found." });
    const affected = [];
    if (table.mergedMasterId) {
      const master = db.tables.find((t) => t.tenantId === req.user.tenantId && t.id === table.mergedMasterId);
      if (master) { master.mergedWith = (master.mergedWith || []).filter((id) => id !== table.id); master.updatedAt = now(); affected.push(norm(master)); }
      table.mergedMasterId = ""; table.status = "available"; table.updatedAt = now(); affected.push(norm(table));
    } else {
      const ids = Array.isArray(table.mergedWith) ? [...table.mergedWith] : [];
      table.mergedWith = []; table.updatedAt = now(); affected.push(norm(table));
      db.tables.forEach((t) => { if (t.tenantId === req.user.tenantId && ids.includes(t.id)) { t.mergedMasterId = ""; t.status = "available"; t.updatedAt = now(); affected.push(norm(t)); } });
    }
    audit(db, req, "TABLES_UNMERGED", { tableId: table.id, affectedTableIds: affected.map((t) => t.id) }); writeDb(db);
    res.json({ message: "Tables unmerged successfully.", tables: affected });
  });

  return router;
};
