const express = require("express");
const { v4: uuid } = require("uuid");

const router = express.Router();

const ROLE_PERMISSIONS = {
  owner: {
    label: "Restaurant Owner",
    canSwitchBranches: true,
    canViewAllBranches: true,
    canManageBranches: true,
    canManageUsers: true,
    canViewCosts: true,
    canViewProfitLoss: true,
    canViewPurchases: true,
    canViewReports: true,
    canEditOrders: true,
    canRefundOrders: true,
    canManageMenu: true,
    canManageInventory: true,
    canUsePOS: true,
    canUseKDS: true,
    canUseDelivery: true
  },
  branch_manager: {
    label: "Branch Manager",
    canSwitchBranches: false,
    canViewAllBranches: false,
    canManageBranches: false,
    canManageUsers: true,
    canViewCosts: false,
    canViewProfitLoss: false,
    canViewPurchases: false,
    canViewReports: true,
    canEditOrders: true,
    canRefundOrders: false,
    canManageMenu: true,
    canManageInventory: true,
    canUsePOS: true,
    canUseKDS: true,
    canUseDelivery: true
  },
  cashier: {
    label: "Cashier",
    canSwitchBranches: false,
    canViewAllBranches: false,
    canManageBranches: false,
    canManageUsers: false,
    canViewCosts: false,
    canViewProfitLoss: false,
    canViewPurchases: false,
    canViewReports: false,
    canEditOrders: true,
    canRefundOrders: false,
    canManageMenu: false,
    canManageInventory: false,
    canUsePOS: true,
    canUseKDS: false,
    canUseDelivery: false
  },
  waiter: {
    label: "Waiter",
    canSwitchBranches: false,
    canViewAllBranches: false,
    canManageBranches: false,
    canManageUsers: false,
    canViewCosts: false,
    canViewProfitLoss: false,
    canViewPurchases: false,
    canViewReports: false,
    canEditOrders: false,
    canRefundOrders: false,
    canManageMenu: false,
    canManageInventory: false,
    canUsePOS: true,
    canUseKDS: false,
    canUseDelivery: false
  },
  kitchen: {
    label: "Kitchen Staff",
    canSwitchBranches: false,
    canViewAllBranches: false,
    canManageBranches: false,
    canManageUsers: false,
    canViewCosts: false,
    canViewProfitLoss: false,
    canViewPurchases: false,
    canViewReports: false,
    canEditOrders: false,
    canRefundOrders: false,
    canManageMenu: false,
    canManageInventory: false,
    canUsePOS: false,
    canUseKDS: true,
    canUseDelivery: false
  },
  rider: {
    label: "Delivery Rider",
    canSwitchBranches: false,
    canViewAllBranches: false,
    canManageBranches: false,
    canManageUsers: false,
    canViewCosts: false,
    canViewProfitLoss: false,
    canViewPurchases: false,
    canViewReports: false,
    canEditOrders: false,
    canRefundOrders: false,
    canManageMenu: false,
    canManageInventory: false,
    canUsePOS: false,
    canUseKDS: false,
    canUseDelivery: true
  }
};

function cleanUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function ensureCollections(db) {
  db.tenants = Array.isArray(db.tenants) ? db.tenants : [];
  db.users = Array.isArray(db.users) ? db.users : [];
  db.branches = Array.isArray(db.branches) ? db.branches : [];
  db.modules = Array.isArray(db.modules) ? db.modules : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  return db;
}

function defaultPermissions(role) {
  return {
    ...(ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier)
  };
}

function finalPermissions(user) {
  return {
    ...defaultPermissions(user.role),
    ...(user.permissions || {})
  };
}

function requireTenant(req, res, next) {
  if (!req.user?.tenantId) {
    return res.status(403).json({ message: "Restaurant account access required." });
  }

  next();
}

function requireOwnerOrManager(req, res, next) {
  const allowed = ["owner", "admin", "branch_manager"];

  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ message: "Owner or branch manager access required." });
  }

  next();
}

function requireOwner(req, res, next) {
  const allowed = ["owner", "admin"];

  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ message: "Restaurant owner access required." });
  }

  next();
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required." });
  }

  next();
}

function branchScopeForUser(user, branches) {
  const permissions = finalPermissions(user);

  if (permissions.canViewAllBranches) {
    return {
      mode: "all",
      canSwitchBranches: true,
      branchIds: branches.map((branch) => branch.id)
    };
  }

  return {
    mode: "assigned",
    canSwitchBranches: false,
    branchIds: user.branchId ? [user.branchId] : []
  };
}

function makeAudit(db, action, actor, details) {
  db.auditLogs.push({
    id: uuid(),
    action,
    actor,
    details,
    createdAt: new Date().toISOString()
  });
}

function createDemoBranch(tenantId, name, city, address) {
  return {
    id: uuid(),
    tenantId,
    name,
    city,
    address,
    phone: "",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

module.exports = function roleAccessRoutes({ readDb, writeDb, hashPassword }) {
  router.get("/roles", (req, res) => {
    res.json({
      roles: ROLE_PERMISSIONS
    });
  });

  router.get("/context", requireTenant, (req, res) => {
    const db = ensureCollections(readDb());

    const tenant = db.tenants.find((item) => item.id === req.user.tenantId);
    const user = db.users.find((item) => item.id === req.user.id);
    const branches = db.branches.filter((item) => item.tenantId === req.user.tenantId);

    if (!tenant || !user) {
      return res.status(404).json({ message: "Restaurant or user not found." });
    }

    const permissions = finalPermissions(user);
    const branchScope = branchScopeForUser(user, branches);

    res.json({
      tenant,
      user: cleanUser(user),
      permissions,
      branchScope,
      branches: permissions.canViewAllBranches
        ? branches
        : branches.filter((branch) => branch.id === user.branchId),
      activeBranch: branches.find((branch) => branch.id === user.branchId) || null,
      mode: permissions.canViewAllBranches ? "owner_hq" : "branch_terminal"
    });
  });

  router.get("/branches", requireTenant, (req, res) => {
    const db = ensureCollections(readDb());
    const user = db.users.find((item) => item.id === req.user.id);

    if (!user) return res.status(404).json({ message: "User not found." });

    const permissions = finalPermissions(user);
    const branches = db.branches.filter((item) => item.tenantId === req.user.tenantId);

    res.json(
      permissions.canViewAllBranches
        ? branches
        : branches.filter((branch) => branch.id === user.branchId)
    );
  });

  router.post("/branches", requireTenant, requireOwner, (req, res) => {
    const { name, city, address, phone } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Branch name is required." });
    }

    const db = ensureCollections(readDb());

    const exists = db.branches.some(
      (branch) =>
        branch.tenantId === req.user.tenantId &&
        String(branch.name || "").toLowerCase() === String(name).toLowerCase()
    );

    if (exists) {
      return res.status(409).json({ message: "Branch already exists." });
    }

    const branch = {
      id: uuid(),
      tenantId: req.user.tenantId,
      name,
      city: city || "",
      address: address || "",
      phone: phone || "",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.branches.push(branch);

    makeAudit(db, "BRANCH_CREATED", req.user.username, {
      branchId: branch.id,
      branchName: branch.name
    });

    writeDb(db);

    res.status(201).json({
      message: "Branch created successfully.",
      branch
    });
  });

  router.patch("/branches/:branchId", requireTenant, requireOwner, (req, res) => {
    const { branchId } = req.params;
    const { name, city, address, phone, status } = req.body;

    const db = ensureCollections(readDb());

    const branch = db.branches.find(
      (item) => item.id === branchId && item.tenantId === req.user.tenantId
    );

    if (!branch) return res.status(404).json({ message: "Branch not found." });

    branch.name = name || branch.name;
    branch.city = city ?? branch.city;
    branch.address = address ?? branch.address;
    branch.phone = phone ?? branch.phone;
    branch.status = status || branch.status;
    branch.updatedAt = new Date().toISOString();

    makeAudit(db, "BRANCH_UPDATED", req.user.username, {
      branchId: branch.id,
      branchName: branch.name
    });

    writeDb(db);

    res.json({
      message: "Branch updated successfully.",
      branch
    });
  });

  router.get("/users", requireTenant, requireOwnerOrManager, (req, res) => {
    const db = ensureCollections(readDb());
    const currentUser = db.users.find((item) => item.id === req.user.id);

    if (!currentUser) return res.status(404).json({ message: "User not found." });

    const permissions = finalPermissions(currentUser);

    let users = db.users.filter((user) => user.tenantId === req.user.tenantId);

    if (!permissions.canViewAllBranches) {
      users = users.filter((user) => user.branchId === req.user.branchId);
    }

    res.json(users.map(cleanUser));
  });

  router.post("/users", requireTenant, requireOwnerOrManager, async (req, res) => {
    try {
      const {
        name,
        username,
        password,
        role,
        branchId,
        phone,
        email,
        permissions
      } = req.body;

      if (!name || !username || !password || !role) {
        return res.status(400).json({
          message: "Name, username, password and role are required."
        });
      }

      const db = ensureCollections(readDb());

      const creator = db.users.find((item) => item.id === req.user.id);
      if (!creator) return res.status(404).json({ message: "Creator user not found." });

      const creatorPermissions = finalPermissions(creator);

      if (!creatorPermissions.canManageUsers) {
        return res.status(403).json({ message: "You cannot manage users." });
      }

      if (!ROLE_PERMISSIONS[role]) {
        return res.status(400).json({ message: "Invalid role." });
      }

      const exists = db.users.some(
        (user) => String(user.username || "").toLowerCase() === String(username).toLowerCase()
      );

      if (exists) {
        return res.status(409).json({ message: "Username already exists." });
      }

      const targetBranchId = branchId || req.user.branchId || null;

      if (!creatorPermissions.canViewAllBranches && targetBranchId !== req.user.branchId) {
        return res.status(403).json({ message: "You can only create users for your branch." });
      }

      if (role === "owner" && req.user.role !== "owner") {
        return res.status(403).json({ message: "Only owner can create another owner." });
      }

      const passwordHash = await hashPassword(password);

      const user = {
        id: uuid(),
        tenantId: req.user.tenantId,
        branchId: targetBranchId,
        name,
        username,
        passwordHash,
        role,
        phone: phone || "",
        email: email || "",
        status: "active",
        permissions: {
          ...defaultPermissions(role),
          ...(permissions || {})
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.users.push(user);

      makeAudit(db, "USER_CREATED", req.user.username, {
        userId: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branchId
      });

      writeDb(db);

      res.status(201).json({
        message: "User created successfully.",
        user: cleanUser(user),
        login: { username, password }
      });
    } catch (error) {
      console.error("Create role user error:", error);
      res.status(500).json({ message: "Failed to create user." });
    }
  });

  router.patch("/users/:userId", requireTenant, requireOwnerOrManager, (req, res) => {
    const { userId } = req.params;
    const {
      name,
      role,
      branchId,
      phone,
      email,
      status,
      permissions
    } = req.body;

    const db = ensureCollections(readDb());

    const editor = db.users.find((item) => item.id === req.user.id);
    const user = db.users.find(
      (item) => item.id === userId && item.tenantId === req.user.tenantId
    );

    if (!editor || !user) {
      return res.status(404).json({ message: "User not found." });
    }

    const editorPermissions = finalPermissions(editor);

    if (!editorPermissions.canManageUsers) {
      return res.status(403).json({ message: "You cannot manage users." });
    }

    if (!editorPermissions.canViewAllBranches && user.branchId !== req.user.branchId) {
      return res.status(403).json({ message: "You can only edit users from your branch." });
    }

    if (role && !ROLE_PERMISSIONS[role]) {
      return res.status(400).json({ message: "Invalid role." });
    }

    user.name = name || user.name;
    user.role = role || user.role;
    user.branchId = branchId || user.branchId;
    user.phone = phone ?? user.phone;
    user.email = email ?? user.email;
    user.status = status || user.status;
    user.permissions = {
      ...defaultPermissions(user.role),
      ...(user.permissions || {}),
      ...(permissions || {})
    };
    user.updatedAt = new Date().toISOString();

    makeAudit(db, "USER_UPDATED", req.user.username, {
      userId: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId
    });

    writeDb(db);

    res.json({
      message: "User updated successfully.",
      user: cleanUser(user)
    });
  });

  router.post("/demo/multibranch", requireSuperAdmin, async (req, res) => {
    try {
      const db = ensureCollections(readDb());

      const demoUsername = "demoowner";
      const exists = db.users.some(
        (user) => String(user.username || "").toLowerCase() === demoUsername
      );

      if (exists) {
        return res.json({
          message: "Multi-branch demo already exists.",
          login: {
            owner: { username: "demoowner", password: "owner123" },
            hydManager: { username: "hydmanager", password: "manager123" },
            hydCashier: { username: "hydcashier", password: "staff123" },
            hydKitchen: { username: "hydkitchen", password: "kitchen123" },
            hydRider: { username: "hydrider", password: "rider123" }
          }
        });
      }

      const tenantId = uuid();

      const allModules = db.modules.map((module) => module.key);

      const tenant = {
        id: tenantId,
        restaurantName: "Nexa Demo Foods Group",
        ownerName: "Demo Owner",
        slug: "nexa-demo-foods-group",
        phone: "03001234567",
        email: "demo@nexapos.com",
        packageName: "Enterprise Multi-Branch",
        enabledModules: allModules,
        status: "active",
        subscriptionStatus: "active",
        paymentStatus: "paid",
        expiryDate: "2030-12-31",
        maxBranches: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const hyd = createDemoBranch(tenantId, "Hyderabad Main Branch", "Hyderabad", "Auto Bhan Road");
      const khi = createDemoBranch(tenantId, "Karachi Clifton Branch", "Karachi", "Clifton");
      const lhr = createDemoBranch(tenantId, "Lahore Gulberg Branch", "Lahore", "Gulberg");

      const ownerPasswordHash = await hashPassword("owner123");
      const managerPasswordHash = await hashPassword("manager123");
      const cashierPasswordHash = await hashPassword("staff123");
      const kitchenPasswordHash = await hashPassword("kitchen123");
      const riderPasswordHash = await hashPassword("rider123");

      const users = [
        {
          id: uuid(),
          tenantId,
          branchId: null,
          name: "Demo Restaurant Owner",
          username: "demoowner",
          passwordHash: ownerPasswordHash,
          role: "owner",
          phone: "03000000001",
          email: "owner@nexademo.com",
          status: "active",
          permissions: defaultPermissions("owner"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: uuid(),
          tenantId,
          branchId: hyd.id,
          name: "Hyderabad Branch Manager",
          username: "hydmanager",
          passwordHash: managerPasswordHash,
          role: "branch_manager",
          phone: "03000000002",
          email: "hydmanager@nexademo.com",
          status: "active",
          permissions: defaultPermissions("branch_manager"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: uuid(),
          tenantId,
          branchId: hyd.id,
          name: "Hyderabad Cashier",
          username: "hydcashier",
          passwordHash: cashierPasswordHash,
          role: "cashier",
          phone: "03000000003",
          email: "hydcashier@nexademo.com",
          status: "active",
          permissions: {
            ...defaultPermissions("cashier"),
            canEditOrders: true
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: uuid(),
          tenantId,
          branchId: hyd.id,
          name: "Hyderabad Kitchen",
          username: "hydkitchen",
          passwordHash: kitchenPasswordHash,
          role: "kitchen",
          phone: "03000000004",
          email: "hydkitchen@nexademo.com",
          status: "active",
          permissions: defaultPermissions("kitchen"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: uuid(),
          tenantId,
          branchId: hyd.id,
          name: "Hyderabad Rider",
          username: "hydrider",
          passwordHash: riderPasswordHash,
          role: "rider",
          phone: "03000000005",
          email: "hydrider@nexademo.com",
          status: "active",
          permissions: defaultPermissions("rider"),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      db.tenants.push(tenant);
      db.branches.push(hyd, khi, lhr);
      db.users.push(...users);

      makeAudit(db, "MULTI_BRANCH_DEMO_CREATED", req.user.username, {
        tenantId,
        tenantName: tenant.restaurantName,
        branches: [hyd.name, khi.name, lhr.name]
      });

      writeDb(db);

      res.status(201).json({
        message: "Multi-branch demo created successfully.",
        tenant,
        branches: [hyd, khi, lhr],
        users: users.map(cleanUser),
        login: {
          owner: { username: "demoowner", password: "owner123" },
          hydManager: { username: "hydmanager", password: "manager123" },
          hydCashier: { username: "hydcashier", password: "staff123" },
          hydKitchen: { username: "hydkitchen", password: "kitchen123" },
          hydRider: { username: "hydrider", password: "rider123" }
        }
      });
    } catch (error) {
      console.error("Create multi-branch demo error:", error);
      res.status(500).json({ message: "Failed to create multi-branch demo." });
    }
  });

  return router;
};
