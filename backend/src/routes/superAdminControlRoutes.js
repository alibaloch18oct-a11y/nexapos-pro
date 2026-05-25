const express = require("express");

const router = express.Router();

const allModules = [
  "walk_in",
  "take_away",
  "delivery",
  "dine_in",
  "drive_thru",
  "kiosk",
  "orders",
  "kds",
  "settings",
  "restaurant_settings",
  "inventory",
  "discounts",
  "staff",
  "customers",
  "analytics",
  "expenses",
  "supplier_purchases",
  "stock_movements",
  "menu_inventory_mapping"
];

const defaultPackages = [
  {
    id: "starter",
    name: "Starter",
    days: 30,
    modules: ["walk_in", "take_away", "orders", "settings", "restaurant_settings"]
  },
  {
    id: "restaurant",
    name: "Restaurant Pro",
    days: 30,
    modules: [
      "walk_in",
      "take_away",
      "delivery",
      "dine_in",
      "orders",
      "kds",
      "settings",
      "restaurant_settings",
      "inventory",
      "discounts",
      "staff",
      "customers"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    days: 365,
    modules: allModules
  }
];

function ensureCollections(db) {
  db.users = Array.isArray(db.users) ? db.users : [];
  db.tenants = Array.isArray(db.tenants) ? db.tenants : [];
  db.packages = Array.isArray(db.packages) ? db.packages : [];
  db.subscriptions = Array.isArray(db.subscriptions) ? db.subscriptions : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];

  if (db.packages.length === 0) {
    db.packages.push(...defaultPackages);
  }

  return db;
}

function superAdminOnly(req, res, next) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({
      message: "Super admin access required."
    });
  }

  next();
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 30));
  return date.toISOString().slice(0, 10);
}

function safeUser(user) {
  const clone = { ...user };
  delete clone.passwordHash;
  return clone;
}

function findTenant(db, user) {
  if (!user?.tenantId) return null;
  return db.tenants.find((tenant) => tenant.id === user.tenantId) || null;
}

function findSubscription(db, user) {
  if (!user?.tenantId) return null;

  let subscription = db.subscriptions.find((item) => item.tenantId === user.tenantId);

  if (!subscription) {
    subscription = {
      id: `sub-${user.tenantId}`,
      tenantId: user.tenantId,
      packageName: user.packageName || "Starter",
      packageId: user.packageId || "starter",
      status: user.isActive === false ? "inactive" : "active",
      expiryDate: user.expiryDate || addDays(30),
      enabledModules: Array.isArray(user.enabledModules) ? user.enabledModules : defaultPackages[0].modules,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.subscriptions.push(subscription);
  }

  return subscription;
}

module.exports = function superAdminControlRoutes({ readDb, writeDb }) {
  router.get("/packages", superAdminOnly, (req, res) => {
    const db = ensureCollections(readDb());

    writeDb(db);

    res.json({
      packages: db.packages,
      allModules
    });
  });

  router.get("/users", superAdminOnly, (req, res) => {
    const db = ensureCollections(readDb());

    const users = db.users
      .filter((user) => user.role !== "super_admin")
      .map((user) => {
        const tenant = findTenant(db, user);
        const subscription = findSubscription(db, user);

        return {
          ...safeUser(user),
          tenant,
          subscription,
          restaurantName:
            tenant?.restaurantName ||
            tenant?.name ||
            user.restaurantName ||
            user.businessName ||
            "Restaurant",
          packageName: subscription?.packageName || user.packageName || "Starter",
          expiryDate: subscription?.expiryDate || user.expiryDate || "",
          enabledModules:
            subscription?.enabledModules ||
            user.enabledModules ||
            []
        };
      });

    writeDb(db);

    res.json({
      users,
      packages: db.packages,
      allModules
    });
  });

  router.patch("/users/:userId", superAdminOnly, (req, res) => {
    const db = ensureCollections(readDb());
    const { userId } = req.params;

    const user = db.users.find((item) => item.id === userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    if (user.role === "super_admin") {
      return res.status(400).json({
        message: "Default super admin cannot be edited from here."
      });
    }

    const before = {
      user: { ...user },
      tenant: findTenant(db, user),
      subscription: findSubscription(db, user)
    };

    const {
      username,
      password,
      email,
      name,
      restaurantName,
      isActive,
      packageId,
      packageName,
      days,
      expiryDate,
      enabledModules
    } = req.body || {};

    if (username !== undefined) user.username = String(username).trim();
    if (email !== undefined) user.email = String(email).trim();
    if (name !== undefined) user.name = String(name).trim();
    if (password !== undefined && String(password).trim()) {
      user.password = String(password).trim();
    }

    if (typeof isActive === "boolean") {
      user.isActive = isActive;
      user.status = isActive ? "active" : "inactive";
    }

    const tenant = findTenant(db, user);

    if (tenant && restaurantName !== undefined) {
      tenant.restaurantName = String(restaurantName).trim();
      tenant.name = String(restaurantName).trim();
      tenant.updatedAt = new Date().toISOString();
      tenant.updatedBy = req.user.username;
    }

    const subscription = findSubscription(db, user);

    const selectedPackage =
      db.packages.find((pkg) => pkg.id === packageId || pkg.name === packageName) || null;

    const finalPackageName = packageName || selectedPackage?.name || subscription.packageName || "Starter";
    const finalPackageId = packageId || selectedPackage?.id || subscription.packageId || "starter";
    const finalModules = Array.isArray(enabledModules)
      ? enabledModules
      : selectedPackage?.modules || subscription.enabledModules || [];

    subscription.packageName = finalPackageName;
    subscription.packageId = finalPackageId;
    subscription.enabledModules = finalModules;
    subscription.status = user.isActive === false ? "inactive" : "active";

    if (expiryDate) {
      subscription.expiryDate = expiryDate;
    } else if (days !== undefined) {
      subscription.expiryDate = addDays(Number(days || 30));
    }

    subscription.updatedAt = new Date().toISOString();
    subscription.updatedBy = req.user.username;

    user.packageName = subscription.packageName;
    user.packageId = subscription.packageId;
    user.enabledModules = subscription.enabledModules;
    user.expiryDate = subscription.expiryDate;
    user.updatedAt = new Date().toISOString();
    user.updatedBy = req.user.username;

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: user.tenantId || "system",
      action: "SUPER_ADMIN_USER_UPDATED",
      actor: req.user.username,
      details: {
        userId: user.id,
        username: user.username,
        before,
        after: {
          user,
          tenant,
          subscription
        }
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "User settings updated successfully.",
      user: {
        ...safeUser(user),
        tenant,
        subscription,
        restaurantName: tenant?.restaurantName || tenant?.name || restaurantName || "Restaurant",
        packageName: subscription.packageName,
        expiryDate: subscription.expiryDate,
        enabledModules: subscription.enabledModules
      }
    });
  });

  router.patch("/users/:userId/status", superAdminOnly, (req, res) => {
    const db = ensureCollections(readDb());
    const { userId } = req.params;
    const user = db.users.find((item) => item.id === userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    if (user.role === "super_admin") {
      return res.status(400).json({
        message: "Super admin cannot be disabled."
      });
    }

    user.isActive = Boolean(req.body.isActive);
    user.status = user.isActive ? "active" : "inactive";
    user.updatedAt = new Date().toISOString();
    user.updatedBy = req.user.username;

    const subscription = findSubscription(db, user);
    subscription.status = user.isActive ? "active" : "inactive";
    subscription.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: user.isActive ? "User activated." : "User deactivated.",
      user: safeUser(user)
    });
  });

  return router;
};