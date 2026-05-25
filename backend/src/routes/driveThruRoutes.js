const express = require("express");
const { v4: uuid } = require("uuid");

const router = express.Router();

function ensureCollections(db) {
  db.driveThruTickets = Array.isArray(db.driveThruTickets) ? db.driveThruTickets : [];
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

function makeTokenNo(db, tenantId) {
  const today = new Date().toISOString().slice(0, 10);

  const todayCount = db.driveThruTickets.filter((ticket) => {
    return ticket.tenantId === tenantId && String(ticket.createdAt || "").slice(0, 10) === today;
  }).length + 1;

  return `DT-${String(todayCount).padStart(3, "0")}`;
}

module.exports = function driveThruRoutes({ readDb, writeDb }) {
  router.get("/", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const tickets = db.driveThruTickets
      .filter((ticket) => ticket.tenantId === req.user.tenantId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ tickets });
  });

  router.post("/", tenantOnly, (req, res) => {
    const {
      customerName,
      phone,
      vehicleNo,
      vehicleColor,
      vehicleType,
      notes
    } = req.body;

    const db = ensureCollections(readDb());
    const now = new Date().toISOString();

    const ticket = {
      id: uuid(),
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || null,
      tokenNo: makeTokenNo(db, req.user.tenantId),
      customerName: customerName || "Drive Thru Customer",
      phone: phone || "",
      vehicleNo: vehicleNo || "",
      vehicleColor: vehicleColor || "",
      vehicleType: vehicleType || "Car",
      notes: notes || "",
      status: "waiting",
      orderId: "",
      orderNo: "",
      total: 0,
      createdBy: req.user.username,
      createdAt: now,
      updatedAt: now
    };

    db.driveThruTickets.push(ticket);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "DRIVE_THRU_TICKET_CREATED",
      actor: req.user.username,
      details: {
        ticketId: ticket.id,
        tokenNo: ticket.tokenNo,
        vehicleNo: ticket.vehicleNo
      },
      createdAt: now
    });

    writeDb(db);

    res.status(201).json({
      message: "Drive Thru token created.",
      ticket
    });
  });

  router.patch("/:ticketId", tenantOnly, (req, res) => {
    const { ticketId } = req.params;

    const {
      customerName,
      phone,
      vehicleNo,
      vehicleColor,
      vehicleType,
      notes,
      status,
      orderId,
      orderNo,
      total
    } = req.body;

    const db = ensureCollections(readDb());

    const ticket = db.driveThruTickets.find(
      (item) => item.id === ticketId && item.tenantId === req.user.tenantId
    );

    if (!ticket) {
      return res.status(404).json({
        message: "Drive Thru ticket not found."
      });
    }

    const allowedStatuses = ["waiting", "ordering", "preparing", "ready", "served", "cancelled"];

    ticket.customerName = customerName ?? ticket.customerName;
    ticket.phone = phone ?? ticket.phone;
    ticket.vehicleNo = vehicleNo ?? ticket.vehicleNo;
    ticket.vehicleColor = vehicleColor ?? ticket.vehicleColor;
    ticket.vehicleType = vehicleType ?? ticket.vehicleType;
    ticket.notes = notes ?? ticket.notes;

    if (status && allowedStatuses.includes(status)) {
      ticket.status = status;
    }

    ticket.orderId = orderId ?? ticket.orderId;
    ticket.orderNo = orderNo ?? ticket.orderNo;
    ticket.total = total !== undefined ? Number(total || 0) : ticket.total;
    ticket.updatedAt = new Date().toISOString();

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "DRIVE_THRU_TICKET_UPDATED",
      actor: req.user.username,
      details: {
        ticketId: ticket.id,
        tokenNo: ticket.tokenNo,
        status: ticket.status
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Drive Thru ticket updated.",
      ticket
    });
  });

  router.delete("/:ticketId", tenantOnly, (req, res) => {
    const { ticketId } = req.params;

    const db = ensureCollections(readDb());

    const ticket = db.driveThruTickets.find(
      (item) => item.id === ticketId && item.tenantId === req.user.tenantId
    );

    if (!ticket) {
      return res.status(404).json({
        message: "Drive Thru ticket not found."
      });
    }

    db.driveThruTickets = db.driveThruTickets.filter(
      (item) => !(item.id === ticketId && item.tenantId === req.user.tenantId)
    );

    writeDb(db);

    res.json({
      message: "Drive Thru ticket deleted."
    });
  });

  return router;
};