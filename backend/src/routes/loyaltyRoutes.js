const express = require("express");
const { v4: uuid } = require("uuid");

const router = express.Router();

function ensureCollections(db) {
  db.customers = Array.isArray(db.customers) ? db.customers : [];
  db.orders = Array.isArray(db.orders) ? db.orders : [];
  db.customerPointLogs = Array.isArray(db.customerPointLogs) ? db.customerPointLogs : [];
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

function normalizePhone(phone) {
  return String(phone || "").replace(/\s+/g, "").trim();
}

function customerName(customer) {
  const full = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
  return full || customer.name || "Walk-in Customer";
}

function buildCustomerStats(db, tenantId, customer) {
  const phone = normalizePhone(customer.phone);

  const orders = db.orders.filter((order) => {
    if (order.tenantId !== tenantId) return false;

    const orderPhone = normalizePhone(order.phone);
    return phone && orderPhone && phone === orderPhone;
  });

  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const totalSpent = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  return {
    totalOrders: orders.length,
    paidOrders: paidOrders.length,
    totalSpent,
    averageSpend: paidOrders.length ? Math.round(totalSpent / paidOrders.length) : 0,
    lastOrderAt: orders[0]?.createdAt || "",
    lastOrderNo: orders[0]?.orderNo || ""
  };
}

module.exports = function loyaltyRoutes({ readDb, writeDb }) {
  router.get("/customer", tenantOnly, (req, res) => {
    const phone = normalizePhone(req.query.phone);

    if (!phone) {
      return res.status(400).json({
        message: "Phone number is required."
      });
    }

    const db = ensureCollections(readDb());

    const customer = db.customers.find(
      (item) => item.tenantId === req.user.tenantId && normalizePhone(item.phone) === phone
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found for this phone.",
        customer: null
      });
    }

    const pointValue = 1;
    const loyaltyPoints = Number(customer.loyaltyPoints || 0);

    res.json({
      customer: {
        ...customer,
        name: customerName(customer),
        loyaltyPoints,
        stats: buildCustomerStats(db, req.user.tenantId, customer)
      },
      pointValue,
      maxRedeemPoints: loyaltyPoints,
      maxRedeemAmount: loyaltyPoints * pointValue
    });
  });

  router.post("/redeem", tenantOnly, (req, res) => {
    const {
      phone,
      points,
      amount,
      orderId,
      orderNo,
      note
    } = req.body;

    const safePhone = normalizePhone(phone);
    const redeemPoints = Math.floor(Number(points || 0));
    const redeemAmount = Number(amount || redeemPoints || 0);

    if (!safePhone) {
      return res.status(400).json({
        message: "Customer phone is required."
      });
    }

    if (redeemPoints <= 0) {
      return res.status(400).json({
        message: "Redeem points must be greater than zero."
      });
    }

    const db = ensureCollections(readDb());

    const customer = db.customers.find(
      (item) => item.tenantId === req.user.tenantId && normalizePhone(item.phone) === safePhone
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found."
      });
    }

    const beforePoints = Number(customer.loyaltyPoints || 0);

    if (redeemPoints > beforePoints) {
      return res.status(400).json({
        message: `Customer has only ${beforePoints} points.`
      });
    }

    customer.loyaltyPoints = beforePoints - redeemPoints;
    customer.totalRedeemedPoints = Number(customer.totalRedeemedPoints || 0) + redeemPoints;
    customer.updatedAt = new Date().toISOString();

    const log = {
      id: uuid(),
      tenantId: req.user.tenantId,
      customerId: customer.id,
      customerPhone: customer.phone,
      type: "redeem",
      points: redeemPoints,
      amount: redeemAmount,
      beforePoints,
      afterPoints: customer.loyaltyPoints,
      orderId: orderId || "",
      orderNo: orderNo || "",
      note: note || `Redeemed ${redeemPoints} points on order ${orderNo || ""}`,
      createdBy: req.user.username,
      createdAt: new Date().toISOString()
    };

    db.customerPointLogs.push(log);

    const order = db.orders.find(
      (item) =>
        item.tenantId === req.user.tenantId &&
        (
          (orderId && item.id === orderId) ||
          (orderNo && item.orderNo === orderNo)
        )
    );

    if (order) {
      order.loyaltyRedeemedPoints = redeemPoints;
      order.loyaltyRedeemedAmount = redeemAmount;
      order.customerId = customer.id;
      order.updatedAt = new Date().toISOString();
    }

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "LOYALTY_POINTS_REDEEMED",
      actor: req.user.username,
      details: {
        customerId: customer.id,
        phone: customer.phone,
        points: redeemPoints,
        amount: redeemAmount,
        orderNo: orderNo || ""
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Loyalty points redeemed successfully.",
      customer,
      log
    });
  });

  return router;
};