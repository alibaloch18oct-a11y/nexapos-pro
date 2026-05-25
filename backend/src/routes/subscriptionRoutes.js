const express = require("express");

const router = express.Router();

function ensureCollections(db) {
  db.tenants = Array.isArray(db.tenants) ? db.tenants : [];
  db.subscriptionPayments = Array.isArray(db.subscriptionPayments) ? db.subscriptionPayments : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  return db;
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({
      message: "Super admin access required."
    });
  }

  next();
}

function getClientSubscriptionStatus(tenant) {
  const today = new Date();
  const expiryDate = tenant.expiryDate ? new Date(tenant.expiryDate) : null;

  let daysLeft = null;
  let isExpired = false;
  let isExpiringSoon = false;

  if (expiryDate && !Number.isNaN(expiryDate.getTime())) {
    const diffMs = expiryDate.setHours(23, 59, 59, 999) - today.getTime();
    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    isExpired = daysLeft < 0;
    isExpiringSoon = daysLeft >= 0 && daysLeft <= 7;
  }

  const paymentStatus = tenant.paymentStatus || "unpaid";
  const subscriptionStatus = tenant.subscriptionStatus || (isExpired ? "expired" : "active");

  return {
    subscriptionStatus: isExpired ? "expired" : subscriptionStatus,
    paymentStatus,
    expiryDate: tenant.expiryDate || "",
    daysLeft,
    isExpired,
    isExpiringSoon,
    lockReason: isExpired ? "Subscription expired. Please contact super admin for renewal." : ""
  };
}

module.exports = function subscriptionRoutes({ readDb, writeDb }) {
  router.get("/overview", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());

    const clients = db.tenants.map((tenant) => {
      const status = getClientSubscriptionStatus(tenant);

      return {
        ...tenant,
        ...status
      };
    });

    const stats = {
      totalClients: clients.length,
      activeClients: clients.filter((item) => !item.isExpired && item.status === "active").length,
      expiredClients: clients.filter((item) => item.isExpired).length,
      expiringSoon: clients.filter((item) => item.isExpiringSoon).length,
      paidClients: clients.filter((item) => item.paymentStatus === "paid").length,
      unpaidClients: clients.filter((item) => item.paymentStatus === "unpaid").length,
      overdueClients: clients.filter((item) => item.paymentStatus === "overdue").length
    };

    res.json({
      stats,
      clients
    });
  });

  router.patch("/client/:tenantId/status", requireSuperAdmin, (req, res) => {
    const { tenantId } = req.params;

    const {
      paymentStatus,
      subscriptionStatus,
      expiryDate,
      note
    } = req.body;

    const db = ensureCollections(readDb());

    const tenant = db.tenants.find((item) => item.id === tenantId);

    if (!tenant) {
      return res.status(404).json({
        message: "Client not found."
      });
    }

    const allowedPayment = ["paid", "unpaid", "trial", "overdue", "cancelled"];
    const allowedSubscription = ["active", "paused", "expired", "cancelled"];

    if (paymentStatus && !allowedPayment.includes(paymentStatus)) {
      return res.status(400).json({
        message: "Invalid payment status."
      });
    }

    if (subscriptionStatus && !allowedSubscription.includes(subscriptionStatus)) {
      return res.status(400).json({
        message: "Invalid subscription status."
      });
    }

    if (paymentStatus) tenant.paymentStatus = paymentStatus;
    if (subscriptionStatus) tenant.subscriptionStatus = subscriptionStatus;
    if (expiryDate !== undefined) tenant.expiryDate = expiryDate;

    tenant.subscriptionNote = note || tenant.subscriptionNote || "";
    tenant.updatedAt = new Date().toISOString();

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      action: "CLIENT_SUBSCRIPTION_STATUS_UPDATED",
      actor: req.user.username,
      tenantId: tenant.id,
      details: {
        restaurantName: tenant.restaurantName,
        paymentStatus: tenant.paymentStatus,
        subscriptionStatus: tenant.subscriptionStatus,
        expiryDate: tenant.expiryDate,
        note: tenant.subscriptionNote
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Client subscription status updated.",
      tenant: {
        ...tenant,
        ...getClientSubscriptionStatus(tenant)
      }
    });
  });

  router.post("/client/:tenantId/renew", requireSuperAdmin, (req, res) => {
    const { tenantId } = req.params;

    const {
      months,
      amount,
      paymentMethod,
      note,
      billingCycle
    } = req.body;

    const db = ensureCollections(readDb());

    const tenant = db.tenants.find((item) => item.id === tenantId);

    if (!tenant) {
      return res.status(404).json({
        message: "Client not found."
      });
    }

    const renewMonths = Math.max(1, Number(months || 1));

    const currentExpiry = tenant.expiryDate ? new Date(tenant.expiryDate) : new Date();
    const startDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(startDate);

    newExpiry.setMonth(newExpiry.getMonth() + renewMonths);

    const yyyy = newExpiry.getFullYear();
    const mm = String(newExpiry.getMonth() + 1).padStart(2, "0");
    const dd = String(newExpiry.getDate()).padStart(2, "0");

    tenant.expiryDate = `${yyyy}-${mm}-${dd}`;
    tenant.paymentStatus = "paid";
    tenant.subscriptionStatus = "active";
    tenant.billingCycle = billingCycle || tenant.billingCycle || "monthly";
    tenant.lastPaymentAmount = Number(amount || 0);
    tenant.lastPaymentMethod = paymentMethod || "Cash";
    tenant.lastPaymentAt = new Date().toISOString();
    tenant.subscriptionNote = note || "";
    tenant.updatedAt = new Date().toISOString();

    const payment = {
      id: `subpay-${Date.now()}`,
      tenantId: tenant.id,
      restaurantName: tenant.restaurantName,
      amount: Number(amount || 0),
      months: renewMonths,
      paymentMethod: paymentMethod || "Cash",
      billingCycle: tenant.billingCycle,
      expiryDate: tenant.expiryDate,
      note: note || "",
      createdBy: req.user.username,
      createdAt: new Date().toISOString()
    };

    db.subscriptionPayments.push(payment);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      action: "CLIENT_SUBSCRIPTION_RENEWED",
      actor: req.user.username,
      tenantId: tenant.id,
      details: payment,
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: `Client renewed successfully until ${tenant.expiryDate}.`,
      tenant: {
        ...tenant,
        ...getClientSubscriptionStatus(tenant)
      },
      payment
    });
  });

  router.get("/payments", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());

    const payments = db.subscriptionPayments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      payments
    });
  });

  return router;
};