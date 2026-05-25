const express = require("express");
const { v4: uuid } = require("uuid");

const router = express.Router();

function ensureCollections(db) {
  db.packages = Array.isArray(db.packages) ? db.packages : [];
  db.tenants = Array.isArray(db.tenants) ? db.tenants : [];
  db.modules = Array.isArray(db.modules) ? db.modules : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  return db;
}

function createDefaultPackages(db) {
  const now = new Date().toISOString();

  const allModuleKeys = db.modules.map((module) => module.key);

  const starterModules = [
    "take_away",
    "orders",
    "settings",
    "inventory",
    "restaurant_settings"
  ].filter((key) => allModuleKeys.includes(key) || key === "restaurant_settings");

  const proModules = [
    "dine_in",
    "take_away",
    "delivery",
    "orders",
    "kds",
    "settings",
    "inventory",
    "discounts",
    "staff",
    "restaurant_settings"
  ].filter((key) => allModuleKeys.includes(key) || key === "restaurant_settings");

  const enterpriseModules = [
    ...new Set([
      ...allModuleKeys,
      "restaurant_settings",
      "staff",
      "discounts",
      "inventory"
    ])
  ];

  return [
    {
      id: uuid(),
      name: "Starter POS",
      description: "Best for small cafés and takeaway counters.",
      monthlyPrice: 4999,
      yearlyPrice: 49999,
      maxUsers: 2,
      maxBranches: 1,
      enabledModules: starterModules,
      isActive: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuid(),
      name: "Restaurant Pro",
      description: "Full dine-in, delivery, inventory, staff and kitchen system.",
      monthlyPrice: 9999,
      yearlyPrice: 99999,
      maxUsers: 8,
      maxBranches: 2,
      enabledModules: proModules,
      isActive: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuid(),
      name: "Enterprise Cloud",
      description: "Complete multi-branch restaurant POS suite.",
      monthlyPrice: 19999,
      yearlyPrice: 199999,
      maxUsers: 50,
      maxBranches: 10,
      enabledModules: enterpriseModules,
      isActive: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now
    }
  ];
}

function ensurePackages(db) {
  ensureCollections(db);

  if (db.packages.length > 0) {
    return db.packages;
  }

  const defaults = createDefaultPackages(db);
  db.packages.push(...defaults);

  return db.packages;
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({
      message: "Super admin access required."
    });
  }

  next();
}

module.exports = function packageRoutes({ readDb, writeDb }) {
  router.get("/", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());

    ensurePackages(db);
    writeDb(db);

    const packages = db.packages.sort((a, b) => Number(a.monthlyPrice || 0) - Number(b.monthlyPrice || 0));

    res.json({ packages });
  });

  router.post("/", requireSuperAdmin, (req, res) => {
    const {
      name,
      description,
      monthlyPrice,
      yearlyPrice,
      maxUsers,
      maxBranches,
      enabledModules,
      isActive
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Package name is required."
      });
    }

    const db = ensureCollections(readDb());

    ensurePackages(db);

    const packageExists = db.packages.some(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );

    if (packageExists) {
      return res.status(409).json({
        message: "Package with this name already exists."
      });
    }

    const now = new Date().toISOString();

    const plan = {
      id: uuid(),
      name,
      description: description || "",
      monthlyPrice: Number(monthlyPrice || 0),
      yearlyPrice: Number(yearlyPrice || 0),
      maxUsers: Number(maxUsers || 1),
      maxBranches: Number(maxBranches || 1),
      enabledModules: Array.isArray(enabledModules) ? enabledModules : [],
      isActive: isActive !== false,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    };

    db.packages.push(plan);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      action: "PACKAGE_CREATED",
      actor: req.user.username,
      details: {
        packageId: plan.id,
        name: plan.name
      },
      createdAt: now
    });

    writeDb(db);

    res.status(201).json({
      message: "Package created successfully.",
      package: plan
    });
  });

  router.put("/:packageId", requireSuperAdmin, (req, res) => {
    const { packageId } = req.params;

    const {
      name,
      description,
      monthlyPrice,
      yearlyPrice,
      maxUsers,
      maxBranches,
      enabledModules,
      isActive
    } = req.body;

    const db = ensureCollections(readDb());

    ensurePackages(db);

    const plan = db.packages.find((item) => item.id === packageId);

    if (!plan) {
      return res.status(404).json({
        message: "Package not found."
      });
    }

    plan.name = name || plan.name;
    plan.description = description ?? plan.description;
    plan.monthlyPrice = monthlyPrice !== undefined ? Number(monthlyPrice || 0) : plan.monthlyPrice;
    plan.yearlyPrice = yearlyPrice !== undefined ? Number(yearlyPrice || 0) : plan.yearlyPrice;
    plan.maxUsers = maxUsers !== undefined ? Number(maxUsers || 1) : plan.maxUsers;
    plan.maxBranches = maxBranches !== undefined ? Number(maxBranches || 1) : plan.maxBranches;
    plan.enabledModules = Array.isArray(enabledModules) ? enabledModules : plan.enabledModules;
    plan.isActive = typeof isActive === "boolean" ? isActive : plan.isActive;
    plan.updatedAt = new Date().toISOString();

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      action: "PACKAGE_UPDATED",
      actor: req.user.username,
      details: {
        packageId: plan.id,
        name: plan.name
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Package updated successfully.",
      package: plan
    });
  });

  router.patch("/:packageId/toggle", requireSuperAdmin, (req, res) => {
    const { packageId } = req.params;

    const db = ensureCollections(readDb());

    ensurePackages(db);

    const plan = db.packages.find((item) => item.id === packageId);

    if (!plan) {
      return res.status(404).json({
        message: "Package not found."
      });
    }

    plan.isActive = !plan.isActive;
    plan.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Package status updated.",
      package: plan
    });
  });

  router.delete("/:packageId", requireSuperAdmin, (req, res) => {
    const { packageId } = req.params;

    const db = ensureCollections(readDb());

    ensurePackages(db);

    const plan = db.packages.find((item) => item.id === packageId);

    if (!plan) {
      return res.status(404).json({
        message: "Package not found."
      });
    }

    const usedByTenant = db.tenants.some((tenant) => tenant.packageId === packageId);

    if (usedByTenant) {
      return res.status(400).json({
        message: "This package is assigned to a client. Remove it from clients first."
      });
    }

    db.packages = db.packages.filter((item) => item.id !== packageId);

    writeDb(db);

    res.json({
      message: "Package deleted successfully."
    });
  });

  router.post("/assign", requireSuperAdmin, (req, res) => {
    const {
      tenantId,
      packageId,
      billingCycle,
      expiryDate,
      overrideModules
    } = req.body;

    if (!tenantId || !packageId) {
      return res.status(400).json({
        message: "Client and package are required."
      });
    }

    const db = ensureCollections(readDb());

    ensurePackages(db);

    const tenant = db.tenants.find((item) => item.id === tenantId);
    const plan = db.packages.find((item) => item.id === packageId);

    if (!tenant) {
      return res.status(404).json({
        message: "Client not found."
      });
    }

    if (!plan) {
      return res.status(404).json({
        message: "Package not found."
      });
    }

    const modulesToApply = Array.isArray(overrideModules) && overrideModules.length > 0
      ? overrideModules
      : plan.enabledModules;

    tenant.packageId = plan.id;
    tenant.packageName = plan.name;
    tenant.billingCycle = billingCycle || "monthly";
    tenant.packageMonthlyPrice = Number(plan.monthlyPrice || 0);
    tenant.packageYearlyPrice = Number(plan.yearlyPrice || 0);
    tenant.maxUsers = Number(plan.maxUsers || 1);
    tenant.maxBranches = Number(plan.maxBranches || 1);
    tenant.enabledModules = modulesToApply;
    tenant.expiryDate = expiryDate || tenant.expiryDate || "";
    tenant.updatedAt = new Date().toISOString();

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      action: "PACKAGE_ASSIGNED_TO_CLIENT",
      actor: req.user.username,
      details: {
        tenantId: tenant.id,
        restaurantName: tenant.restaurantName,
        packageId: plan.id,
        packageName: plan.name,
        billingCycle: tenant.billingCycle,
        expiryDate: tenant.expiryDate
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Package assigned to client successfully.",
      tenant,
      package: plan
    });
  });

  return router;
};