const express = require("express");
const { v4: uuid } = require("uuid");
const { hashPassword } = require("../auth");

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

const moduleNames = {
  walk_in: "Walk In",
  take_away: "Take Away",
  delivery: "Delivery",
  dine_in: "Dine In",
  drive_thru: "Drive Thru",
  kiosk: "Kiosk",
  orders: "Orders",
  kds: "KDS",
  settings: "Menu",
  restaurant_settings: "Restaurant Settings",
  inventory: "Inventory",
  discounts: "Discounts",
  staff: "Staff",
  customers: "Customers",
  analytics: "Reports",
  expenses: "Expenses",
  supplier_purchases: "Suppliers",
  stock_movements: "Stock Movements",
  menu_inventory_mapping: "Recipe Mapping"
};

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

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 30));
  return date.toISOString().slice(0, 10);
}

function createSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ensureCollections(db) {
  db.users = Array.isArray(db.users) ? db.users : [];
  db.tenants = Array.isArray(db.tenants) ? db.tenants : [];
  db.branches = Array.isArray(db.branches) ? db.branches : [];
  db.modules = Array.isArray(db.modules) ? db.modules : [];
  db.packages = Array.isArray(db.packages) ? db.packages : [];
  db.subscriptions = Array.isArray(db.subscriptions) ? db.subscriptions : [];
  db.subscriptionPayments = Array.isArray(db.subscriptionPayments) ? db.subscriptionPayments : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];

  if (db.packages.length === 0) {
    db.packages.push(...defaultPackages);
  }

  allModules.forEach((key, index) => {
    const exists = db.modules.some((module) => module.key === key);

    if (!exists) {
      db.modules.push({
        id: `module-${key}`,
        key,
        name: moduleNames[key] || key,
        description: `${moduleNames[key] || key} module`,
        sortOrder: index + 1,
        isActive: true,
        createdAt: new Date().toISOString()
      });
    }
  });

  return db;
}

function superAdminOnly(req, res, next) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required." });
  }

  next();
}

function cleanModules(modules, fallback = []) {
  const list = Array.isArray(modules) ? modules : fallback;
  return [...new Set(list.filter((key) => allModules.includes(key)))];
}

function selectedPackage(db, packageId, packageName) {
  return (
    db.packages.find((pkg) => pkg.id === packageId) ||
    db.packages.find((pkg) => pkg.name === packageName) ||
    null
  );
}

function safeUser(user) {
  const clean = { ...user };
  delete clean.passwordHash;
  delete clean.password;
  return clean;
}

function findTenant(db, user) {
  if (!user?.tenantId) return null;
  return db.tenants.find((tenant) => tenant.id === user.tenantId) || null;
}

function findBranch(db, user) {
  if (!user?.branchId) return null;
  return db.branches.find((branch) => branch.id === user.branchId) || null;
}

function findSubscription(db, user) {
  if (!user?.tenantId) return null;

  let subscription = db.subscriptions.find((item) => item.tenantId === user.tenantId);

  if (!subscription) {
    subscription = {
      id: `sub-${user.tenantId}`,
      tenantId: user.tenantId,
      userId: user.id,
      packageName: user.packageName || "Starter",
      packageId: user.packageId || "starter",
      status: user.isActive === false || user.status === "inactive" ? "inactive" : "active",
      expiryDate: user.expiryDate || addDays(30),
      enabledModules: Array.isArray(user.enabledModules) ? user.enabledModules : defaultPackages[0].modules,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.subscriptions.push(subscription);
  }

  return subscription;
}

function buildUserPayload(db, user) {
  const tenant = findTenant(db, user);
  const branch = findBranch(db, user);
  const subscription = findSubscription(db, user);

  const enabledModules =
    subscription?.enabledModules ||
    tenant?.enabledModules ||
    user.enabledModules ||
    [];

  const isActive =
    user.isActive !== false &&
    user.status !== "inactive" &&
    tenant?.status !== "inactive" &&
    subscription?.status !== "inactive";

  return {
    ...safeUser(user),
    tenant,
    branch,
    subscription,
    isActive,
    restaurantName: tenant?.restaurantName || tenant?.name || user.restaurantName || "Restaurant",
    phone: user.phone || tenant?.phone || "",
    packageId: subscription?.packageId || tenant?.packageId || user.packageId || "",
    packageName: subscription?.packageName || tenant?.packageName || user.packageName || "Starter",
    expiryDate: subscription?.expiryDate || tenant?.expiryDate || user.expiryDate || "",
    enabledModules
  };
}

function logAudit(db, req, action, details) {
  db.auditLogs.push({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tenantId: details?.tenantId || "system",
    action,
    actor: req.user?.username || "super_admin",
    details,
    createdAt: new Date().toISOString()
  });
}

module.exports = function superAdminControlRoutes({ readDb, writeDb }) {
  router.get("/packages", superAdminOnly, (req, res) => {
    const db = ensureCollections(readDb());
    writeDb(db);
    res.json({ packages: db.packages, allModules });
  });

  router.get("/users", superAdminOnly, (req, res) => {
    const db = ensureCollections(readDb());
    const users = db.users
      .filter((user) => user.role !== "super_admin")
      .map((user) => buildUserPayload(db, user));

    writeDb(db);
    res.json({ users, packages: db.packages, allModules });
  });

  router.post("/users", superAdminOnly, async (req, res) => {
    try {
      const db = ensureCollections(readDb());
      const {
        restaurantName,
        ownerName,
        username,
        password,
        email,
        phone,
        packageId,
        packageName,
        days,
        expiryDate,
        enabledModules,
        isActive
      } = req.body || {};

      const finalRestaurantName = String(restaurantName || "").trim();
      const finalOwnerName = String(ownerName || "").trim();
      const finalUsername = String(username || "").trim();
      const finalPassword = String(password || "").trim();

      if (!finalRestaurantName || !finalOwnerName || !finalUsername || !finalPassword) {
        return res.status(400).json({
          message: "Restaurant name, owner name, username and password are required."
        });
      }

      const usernameExists = db.users.some(
        (user) => String(user.username || "").toLowerCase() === finalUsername.toLowerCase()
      );

      if (usernameExists) {
        return res.status(409).json({ message: "Username already exists." });
      }

      const pkg = selectedPackage(db, packageId, packageName) || db.packages[0] || defaultPackages[0];
      const finalModules = cleanModules(enabledModules, pkg.modules || defaultPackages[0].modules);
      const tenantId = uuid();
      const branchId = uuid();
      const userId = uuid();
      const now = new Date().toISOString();
      const finalExpiryDate = expiryDate || addDays(Number(days || pkg.days || 30));
      const active = isActive !== false;

      const tenant = {
        id: tenantId,
        restaurantName: finalRestaurantName,
        name: finalRestaurantName,
        ownerName: finalOwnerName,
        slug: createSlug(finalRestaurantName) || tenantId,
        phone: phone || "",
        email: email || "",
        packageId: packageId || pkg.id || "custom",
        packageName: packageName || pkg.name || "Custom",
        enabledModules: finalModules,
        status: active ? "active" : "inactive",
        subscriptionStatus: active ? "active" : "paused",
        paymentStatus: "trial",
        expiryDate: finalExpiryDate,
        createdAt: now,
        updatedAt: now,
        createdBy: req.user.username
      };

      const branch = {
        id: branchId,
        tenantId,
        name: "Main Branch",
        address: "",
        phone: phone || "",
        createdAt: now,
        updatedAt: now
      };

      const passwordHash = await hashPassword(finalPassword);

      const ownerUser = {
        id: userId,
        tenantId,
        branchId,
        name: finalOwnerName,
        username: finalUsername,
        passwordHash,
        role: "owner",
        phone: phone || "",
        email: email || "",
        packageId: tenant.packageId,
        packageName: tenant.packageName,
        enabledModules: finalModules,
        expiryDate: finalExpiryDate,
        isActive: active,
        status: active ? "active" : "inactive",
        createdAt: now,
        updatedAt: now,
        createdBy: req.user.username
      };

      const subscription = {
        id: `sub-${tenantId}`,
        tenantId,
        userId,
        packageId: tenant.packageId,
        packageName: tenant.packageName,
        status: active ? "active" : "inactive",
        expiryDate: finalExpiryDate,
        enabledModules: finalModules,
        createdAt: now,
        updatedAt: now,
        createdBy: req.user.username
      };

      db.tenants.push(tenant);
      db.branches.push(branch);
      db.users.push(ownerUser);
      db.subscriptions.push(subscription);

      logAudit(db, req, "SUPER_ADMIN_CLIENT_CREATED", {
        tenantId,
        userId,
        username: finalUsername,
        restaurantName: finalRestaurantName,
        packageName: tenant.packageName,
        enabledModules: finalModules
      });

      writeDb(db);

      res.status(201).json({
        message: "Client created successfully.",
        user: buildUserPayload(db, ownerUser),
        tenant,
        branch,
        subscription,
        login: { username: finalUsername, password: finalPassword }
      });
    } catch (error) {
      console.error("Super admin create client error:", error);
      res.status(500).json({ message: "Failed to create client." });
    }
  });

  router.patch("/users/:userId", superAdminOnly, async (req, res) => {
    try {
      const db = ensureCollections(readDb());
      const { userId } = req.params;
      const user = db.users.find((item) => item.id === userId);

      if (!user) return res.status(404).json({ message: "User not found." });
      if (user.role === "super_admin") return res.status(400).json({ message: "Super admin cannot be edited from here." });

      const {
        username,
        password,
        email,
        phone,
        name,
        ownerName,
        restaurantName,
        isActive,
        packageId,
        packageName,
        days,
        expiryDate,
        enabledModules
      } = req.body || {};

      if (username !== undefined) {
        const nextUsername = String(username).trim();
        const exists = db.users.some(
          (item) => item.id !== user.id && String(item.username || "").toLowerCase() === nextUsername.toLowerCase()
        );
        if (exists) return res.status(409).json({ message: "Username already exists." });
        user.username = nextUsername;
      }

      if (email !== undefined) user.email = String(email).trim();
      if (phone !== undefined) user.phone = String(phone).trim();
      if (name !== undefined || ownerName !== undefined) user.name = String(ownerName || name || "").trim();
      if (password !== undefined && String(password).trim()) user.passwordHash = await hashPassword(String(password).trim());

      if (typeof isActive === "boolean") {
        user.isActive = isActive;
        user.status = isActive ? "active" : "inactive";
      }

      const tenant = findTenant(db, user);
      if (tenant) {
        if (restaurantName !== undefined) {
          tenant.restaurantName = String(restaurantName).trim();
          tenant.name = String(restaurantName).trim();
          tenant.slug = createSlug(tenant.restaurantName) || tenant.slug;
        }
        if (ownerName !== undefined || name !== undefined) tenant.ownerName = String(ownerName || name || "").trim();
        if (email !== undefined) tenant.email = String(email).trim();
        if (phone !== undefined) tenant.phone = String(phone).trim();
        if (typeof isActive === "boolean") {
          tenant.status = isActive ? "active" : "inactive";
          tenant.subscriptionStatus = isActive ? "active" : "paused";
        }
      }

      const subscription = findSubscription(db, user);
      const pkg = selectedPackage(db, packageId, packageName);
      const finalPackageName = packageName || pkg?.name || subscription.packageName || "Starter";
      const finalPackageId = packageId || pkg?.id || subscription.packageId || "starter";
      const finalModules = cleanModules(enabledModules, pkg?.modules || subscription.enabledModules || []);

      subscription.packageName = finalPackageName;
      subscription.packageId = finalPackageId;
      subscription.enabledModules = finalModules;
      subscription.status = user.isActive === false || user.status === "inactive" ? "inactive" : "active";
      subscription.expiryDate = expiryDate || (days !== undefined ? addDays(Number(days || 30)) : subscription.expiryDate);
      subscription.updatedAt = new Date().toISOString();
      subscription.updatedBy = req.user.username;

      user.packageName = subscription.packageName;
      user.packageId = subscription.packageId;
      user.enabledModules = subscription.enabledModules;
      user.expiryDate = subscription.expiryDate;
      user.updatedAt = new Date().toISOString();
      user.updatedBy = req.user.username;

      if (tenant) {
        tenant.packageName = subscription.packageName;
        tenant.packageId = subscription.packageId;
        tenant.enabledModules = subscription.enabledModules;
        tenant.expiryDate = subscription.expiryDate;
        tenant.updatedAt = new Date().toISOString();
        tenant.updatedBy = req.user.username;
      }

      logAudit(db, req, "SUPER_ADMIN_CLIENT_UPDATED", { tenantId: user.tenantId, userId: user.id, username: user.username });
      writeDb(db);

      res.json({ message: "Client settings updated successfully.", user: buildUserPayload(db, user) });
    } catch (error) {
      console.error("Super admin update user error:", error);
      res.status(500).json({ message: "Failed to update client settings." });
    }
  });

  router.patch("/users/:userId/status", superAdminOnly, (req, res) => {
    const db = ensureCollections(readDb());
    const { userId } = req.params;
    const user = db.users.find((item) => item.id === userId);

    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "super_admin") return res.status(400).json({ message: "Super admin cannot be disabled." });

    const active = Boolean(req.body.isActive);
    user.isActive = active;
    user.status = active ? "active" : "inactive";
    user.updatedAt = new Date().toISOString();
    user.updatedBy = req.user.username;

    const tenant = findTenant(db, user);
    if (tenant) {
      tenant.status = active ? "active" : "inactive";
      tenant.subscriptionStatus = active ? "active" : "paused";
      tenant.updatedAt = new Date().toISOString();
      tenant.updatedBy = req.user.username;
    }

    const subscription = findSubscription(db, user);
    subscription.status = active ? "active" : "inactive";
    subscription.updatedAt = new Date().toISOString();

    logAudit(db, req, active ? "SUPER_ADMIN_CLIENT_ACTIVATED" : "SUPER_ADMIN_CLIENT_DISABLED", {
      tenantId: user.tenantId,
      userId: user.id,
      username: user.username
    });

    writeDb(db);
    res.json({ message: active ? "Client activated." : "Client disabled.", user: buildUserPayload(db, user) });
  });

  return router;
};
