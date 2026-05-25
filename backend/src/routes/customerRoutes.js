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

function calculatePoints(total) {
  return Math.floor(Number(total || 0) / 100);
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
  const totalOrders = orders.length;
  const lastOrder = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

  return {
    totalOrders,
    paidOrders: paidOrders.length,
    totalSpent,
    averageSpend: paidOrders.length ? Math.round(totalSpent / paidOrders.length) : 0,
    lastOrderAt: lastOrder?.createdAt || "",
    lastOrderNo: lastOrder?.orderNo || ""
  };
}

function upsertCustomerFromOrder(db, tenantId, order, actor) {
  const phone = normalizePhone(order.phone);

  if (!phone) return null;

  const orderCustomer = order.customer || {};
  const firstName = orderCustomer.firstName || "";
  const lastName = orderCustomer.lastName || "";
  const email = orderCustomer.email || "";
  const instructions = orderCustomer.instructions || order.orderInstructions || "";

  let customer = db.customers.find(
    (item) => item.tenantId === tenantId && normalizePhone(item.phone) === phone
  );

  const now = new Date().toISOString();

  if (!customer) {
    customer = {
      id: uuid(),
      tenantId,
      branchId: order.branchId || null,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim() || "Walk-in Customer",
      phone,
      email,
      address: "",
      notes: instructions || "",
      loyaltyPoints: 0,
      totalEarnedPoints: 0,
      totalRedeemedPoints: 0,
      customerType: "regular",
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    db.customers.push(customer);
  } else {
    customer.firstName = firstName || customer.firstName || "";
    customer.lastName = lastName || customer.lastName || "";
    customer.name = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.name || "Walk-in Customer";
    customer.email = email || customer.email || "";
    customer.notes = instructions || customer.notes || "";
    customer.updatedAt = now;
  }

  if (order.paymentStatus === "paid" && !order.loyaltyPointsApplied) {
    const points = calculatePoints(order.total);

    if (points > 0) {
      customer.loyaltyPoints = Number(customer.loyaltyPoints || 0) + points;
      customer.totalEarnedPoints = Number(customer.totalEarnedPoints || 0) + points;
      customer.updatedAt = now;

      db.customerPointLogs.push({
        id: uuid(),
        tenantId,
        customerId: customer.id,
        customerPhone: customer.phone,
        type: "earned",
        points,
        orderId: order.id || "",
        orderNo: order.orderNo || "",
        note: `Earned from paid order ${order.orderNo || ""}`,
        createdBy: actor || "system",
        createdAt: now
      });

      order.loyaltyPointsApplied = true;
      order.loyaltyPointsEarned = points;
      order.customerId = customer.id;
    }
  }

  return customer;
}

module.exports = function customerRoutes({ readDb, writeDb }) {
  router.get("/", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const customers = db.customers
      .filter((customer) => customer.tenantId === req.user.tenantId)
      .map((customer) => ({
        ...customer,
        name: customerName(customer),
        stats: buildCustomerStats(db, req.user.tenantId, customer)
      }))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    res.json({ customers });
  });

  router.get("/:customerId", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const customer = db.customers.find(
      (item) => item.id === req.params.customerId && item.tenantId === req.user.tenantId
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const phone = normalizePhone(customer.phone);

    const orders = db.orders
      .filter((order) => order.tenantId === req.user.tenantId)
      .filter((order) => normalizePhone(order.phone) === phone)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const pointLogs = db.customerPointLogs
      .filter((log) => log.tenantId === req.user.tenantId && log.customerId === customer.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      customer: {
        ...customer,
        name: customerName(customer),
        stats: buildCustomerStats(db, req.user.tenantId, customer)
      },
      orders,
      pointLogs
    });
  });

  router.post("/", tenantOnly, (req, res) => {
    const {
      firstName,
      lastName,
      phone,
      email,
      address,
      notes,
      customerType,
      loyaltyPoints,
      isActive
    } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    const db = ensureCollections(readDb());
    const safePhone = normalizePhone(phone);

    const exists = db.customers.some(
      (customer) => customer.tenantId === req.user.tenantId && normalizePhone(customer.phone) === safePhone
    );

    if (exists) {
      return res.status(409).json({ message: "Customer with this phone already exists." });
    }

    const now = new Date().toISOString();

    const customer = {
      id: uuid(),
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || null,
      firstName: firstName || "",
      lastName: lastName || "",
      name: `${firstName || ""} ${lastName || ""}`.trim() || "Customer",
      phone: safePhone,
      email: email || "",
      address: address || "",
      notes: notes || "",
      loyaltyPoints: Number(loyaltyPoints || 0),
      totalEarnedPoints: Number(loyaltyPoints || 0),
      totalRedeemedPoints: 0,
      customerType: customerType || "regular",
      isActive: isActive !== false,
      createdAt: now,
      updatedAt: now
    };

    db.customers.push(customer);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "CUSTOMER_CREATED",
      actor: req.user.username,
      details: {
        customerId: customer.id,
        name: customer.name,
        phone: customer.phone
      },
      createdAt: now
    });

    writeDb(db);

    res.status(201).json({
      message: "Customer created successfully.",
      customer
    });
  });

  router.put("/:customerId", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const customer = db.customers.find(
      (item) => item.id === req.params.customerId && item.tenantId === req.user.tenantId
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const {
      firstName,
      lastName,
      phone,
      email,
      address,
      notes,
      customerType,
      isActive
    } = req.body;

    customer.firstName = firstName ?? customer.firstName;
    customer.lastName = lastName ?? customer.lastName;
    customer.name = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.name || "Customer";
    customer.phone = phone ? normalizePhone(phone) : customer.phone;
    customer.email = email ?? customer.email;
    customer.address = address ?? customer.address;
    customer.notes = notes ?? customer.notes;
    customer.customerType = customerType || customer.customerType;
    customer.isActive = typeof isActive === "boolean" ? isActive : customer.isActive;
    customer.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Customer updated successfully.",
      customer
    });
  });

  router.patch("/:customerId/points", tenantOnly, (req, res) => {
    const { type, points, note } = req.body;

    const value = Number(points || 0);

    if (!type || !["add", "redeem", "set"].includes(type)) {
      return res.status(400).json({ message: "Invalid point action." });
    }

    if (value <= 0 && type !== "set") {
      return res.status(400).json({ message: "Points must be greater than zero." });
    }

    const db = ensureCollections(readDb());

    const customer = db.customers.find(
      (item) => item.id === req.params.customerId && item.tenantId === req.user.tenantId
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    const beforePoints = Number(customer.loyaltyPoints || 0);

    if (type === "add") {
      customer.loyaltyPoints = beforePoints + value;
      customer.totalEarnedPoints = Number(customer.totalEarnedPoints || 0) + value;
    }

    if (type === "redeem") {
      customer.loyaltyPoints = Math.max(0, beforePoints - value);
      customer.totalRedeemedPoints = Number(customer.totalRedeemedPoints || 0) + Math.min(beforePoints, value);
    }

    if (type === "set") {
      customer.loyaltyPoints = Math.max(0, value);
    }

    customer.updatedAt = new Date().toISOString();

    db.customerPointLogs.push({
      id: uuid(),
      tenantId: req.user.tenantId,
      customerId: customer.id,
      customerPhone: customer.phone,
      type,
      points: value,
      beforePoints,
      afterPoints: customer.loyaltyPoints,
      note: note || `Manual ${type}`,
      createdBy: req.user.username,
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Customer points updated.",
      customer
    });
  });

  router.delete("/:customerId", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const customer = db.customers.find(
      (item) => item.id === req.params.customerId && item.tenantId === req.user.tenantId
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found." });
    }

    db.customers = db.customers.filter(
      (item) => !(item.id === req.params.customerId && item.tenantId === req.user.tenantId)
    );

    writeDb(db);

    res.json({ message: "Customer deleted successfully." });
  });

  router.post("/sync-from-orders", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const orders = db.orders.filter((order) => order.tenantId === req.user.tenantId && normalizePhone(order.phone));

    const synced = [];

    orders.forEach((order) => {
      const customer = upsertCustomerFromOrder(db, req.user.tenantId, order, req.user.username);
      if (customer) synced.push(customer.id);
    });

    writeDb(db);

    res.json({
      message: "Customers synced from orders.",
      syncedCount: new Set(synced).size
    });
  });

  router.post("/from-order", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());
    const { order } = req.body;

    if (!order) {
      return res.status(400).json({ message: "Order payload is required." });
    }

    const customer = upsertCustomerFromOrder(db, req.user.tenantId, order, req.user.username);

    writeDb(db);

    res.json({
      message: customer ? "Customer saved from order." : "No phone found, customer skipped.",
      customer
    });
  });

  return router;
};