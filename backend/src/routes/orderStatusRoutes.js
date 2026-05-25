const express = require("express");

const router = express.Router();

function ensureCollections(db) {
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

function allowedStatus(value, fallback) {
  const allowed = [
    "unconfirmed",
    "placed",
    "new",
    "preparing",
    "ready",
    "served",
    "completed",
    "cancelled",
    "held"
  ];

  if (!value) return fallback;
  return allowed.includes(value) ? value : fallback;
}

module.exports = function orderStatusRoutes({ readDb, writeDb }) {
  router.patch("/:orderId", tenantOnly, (req, res) => {
    const { orderId } = req.params;

    const {
      kitchenStatus,
      orderStatus,
      paymentStatus,
      paymentMethod,
      note
    } = req.body;

    const db = ensureCollections(readDb());

    const order = db.orders.find(
      (item) =>
        item.tenantId === req.user.tenantId &&
        (
          item.id === orderId ||
          item.orderNo === orderId
        )
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    const before = {
      kitchenStatus: order.kitchenStatus || "",
      orderStatus: order.orderStatus || "",
      paymentStatus: order.paymentStatus || ""
    };

    order.kitchenStatus = allowedStatus(kitchenStatus, order.kitchenStatus || "placed");
    order.orderStatus = allowedStatus(orderStatus, order.orderStatus || "placed");

    if (paymentStatus) {
      const allowedPayment = ["paid", "unpaid", "complimentary", "cancelled"];
      if (allowedPayment.includes(paymentStatus)) {
        order.paymentStatus = paymentStatus;
      }
    }

    if (paymentMethod !== undefined) {
      order.paymentMethod = paymentMethod;
    }

    order.updatedAt = new Date().toISOString();

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "ORDER_STATUS_UPDATED",
      actor: req.user.username,
      details: {
        orderId: order.id,
        orderNo: order.orderNo,
        before,
        after: {
          kitchenStatus: order.kitchenStatus,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus
        },
        note: note || ""
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Order status updated successfully.",
      order
    });
  });

  router.put("/:orderId/status", tenantOnly, (req, res) => {
    const { orderId } = req.params;

    const {
      kitchenStatus,
      orderStatus,
      paymentStatus,
      paymentMethod,
      note
    } = req.body;

    const db = ensureCollections(readDb());

    const order = db.orders.find(
      (item) =>
        item.tenantId === req.user.tenantId &&
        (
          item.id === orderId ||
          item.orderNo === orderId
        )
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    const before = {
      kitchenStatus: order.kitchenStatus || "",
      orderStatus: order.orderStatus || "",
      paymentStatus: order.paymentStatus || ""
    };

    order.kitchenStatus = allowedStatus(kitchenStatus, order.kitchenStatus || "placed");
    order.orderStatus = allowedStatus(orderStatus, order.orderStatus || "placed");

    if (paymentStatus) {
      const allowedPayment = ["paid", "unpaid", "complimentary", "cancelled"];
      if (allowedPayment.includes(paymentStatus)) {
        order.paymentStatus = paymentStatus;
      }
    }

    if (paymentMethod !== undefined) {
      order.paymentMethod = paymentMethod;
    }

    order.updatedAt = new Date().toISOString();

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "ORDER_STATUS_UPDATED",
      actor: req.user.username,
      details: {
        orderId: order.id,
        orderNo: order.orderNo,
        before,
        after: {
          kitchenStatus: order.kitchenStatus,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus
        },
        note: note || ""
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Order status updated successfully.",
      order
    });
  });

  return router;
};