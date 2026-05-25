const express = require("express");

const router = express.Router();

function ensureSettingsCollections(db) {
  db.restaurantSettings = Array.isArray(db.restaurantSettings) ? db.restaurantSettings : [];
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

function defaultSettings(tenantId, branchId, tenant) {
  const now = new Date().toISOString();

  return {
    id: `settings-${tenantId}`,
    tenantId,
    branchId: branchId || null,

    restaurantName: tenant?.restaurantName || "Nexa Restaurant",
    brandTitle: tenant?.restaurantName || "Nexa Restaurant",
    receiptTitle: tenant?.restaurantName || "Nexa Restaurant",
    receiptSubtitle: "Premium Restaurant POS Receipt",

    logoUrl: "",
    address: "",
    phone: tenant?.phone || "",
    email: tenant?.email || "",
    website: "",

    currency: "Rs",
    taxName: "GST",
    taxPercent: 5,
    serviceChargeName: "Service Charges",
    serviceChargePercent: 0,

    receiptFooter: "Thank you for your order.",
    receiptNote: "Powered by NexaPOS Pro",
    showLogoOnReceipt: true,
    showTaxOnReceipt: true,
    showServiceChargeOnReceipt: true,
    showCashierOnReceipt: true,
    showWaiterOnReceipt: true,
    showRiderOnReceipt: true,

    primaryColor: "#22d3ee",
    accentColor: "#a855f7",
    themeMode: "dark",

    invoicePrefix: "INV",
    orderPrefix: "#",

    createdAt: now,
    updatedAt: now
  };
}

function ensureTenantSettings(db, tenantId, branchId) {
  ensureSettingsCollections(db);

  const existing = db.restaurantSettings.find((settings) => settings.tenantId === tenantId);

  if (existing) {
    return existing;
  }

  const tenant = Array.isArray(db.tenants)
    ? db.tenants.find((item) => item.id === tenantId)
    : null;

  const settings = defaultSettings(tenantId, branchId, tenant);

  db.restaurantSettings.push(settings);

  return settings;
}

module.exports = function restaurantSettingsRoutes({ readDb, writeDb }) {
  router.get("/", tenantOnly, (req, res) => {
    const db = ensureSettingsCollections(readDb());

    const settings = ensureTenantSettings(db, req.user.tenantId, req.user.branchId || null);

    writeDb(db);

    res.json({ settings });
  });

  router.put("/", tenantOnly, (req, res) => {
    const db = ensureSettingsCollections(readDb());

    const settings = ensureTenantSettings(db, req.user.tenantId, req.user.branchId || null);

    const allowedFields = [
      "restaurantName",
      "brandTitle",
      "receiptTitle",
      "receiptSubtitle",
      "logoUrl",
      "address",
      "phone",
      "email",
      "website",
      "currency",
      "taxName",
      "taxPercent",
      "serviceChargeName",
      "serviceChargePercent",
      "receiptFooter",
      "receiptNote",
      "showLogoOnReceipt",
      "showTaxOnReceipt",
      "showServiceChargeOnReceipt",
      "showCashierOnReceipt",
      "showWaiterOnReceipt",
      "showRiderOnReceipt",
      "primaryColor",
      "accentColor",
      "themeMode",
      "invoicePrefix",
      "orderPrefix"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    settings.taxPercent = Number(settings.taxPercent || 0);
    settings.serviceChargePercent = Number(settings.serviceChargePercent || 0);
    settings.updatedAt = new Date().toISOString();

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "RESTAURANT_SETTINGS_UPDATED",
      actor: req.user.username,
      details: {
        settingsId: settings.id,
        restaurantName: settings.restaurantName
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Restaurant settings updated successfully.",
      settings
    });
  });

  return router;
};