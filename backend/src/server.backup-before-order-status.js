require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { v4: uuid } = require("uuid");

const { readDb, writeDb } = require("./db");
const { signToken, hashPassword, comparePassword } = require("./auth");
const { requireAuth, requireSuperAdmin } = require("./middleware");
const discountRoutes = require("./routes/discountRoutes");
const staffRoutes = require("./routes/staffRoutes");
const tableActionRoutes = require("./routes/tableActionRoutes");
const tableLayoutRoutes = require("./routes/tableLayoutRoutes");
const restaurantSettingsRoutes = require("./routes/restaurantSettingsRoutes");
const packageRoutes = require("./routes/packageRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const inventoryMovementRoutes = require("./routes/inventoryMovementRoutes");
const menuInventoryMappingRoutes = require("./routes/menuInventoryMappingRoutes");
const supplierPurchaseRoutes = require("./routes/supplierPurchaseRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const customerRoutes = require("./routes/customerRoutes");
const loyaltyRoutes = require("./routes/loyaltyRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/discounts", requireAuth, discountRoutes({ readDb, writeDb }));
app.use("/api/staff", requireAuth, staffRoutes({ readDb, writeDb }));
app.use("/api/table-actions", requireAuth, tableActionRoutes({ readDb, writeDb }));
app.use("/api/table-layout", requireAuth, tableLayoutRoutes({ readDb, writeDb }));
app.use("/api/restaurant-settings", requireAuth, restaurantSettingsRoutes({ readDb, writeDb }));
app.use("/api/packages", requireAuth, packageRoutes({ readDb, writeDb }));
app.use("/api/subscriptions", requireAuth, subscriptionRoutes({ readDb, writeDb }));
app.use("/api/analytics", requireAuth, analyticsRoutes({ readDb }));
app.use("/api/inventory-movements", requireAuth, inventoryMovementRoutes({ readDb, writeDb }));
app.use("/api/menu-inventory-mappings", requireAuth, menuInventoryMappingRoutes({ readDb, writeDb }));
app.use("/api/supplier-purchases", requireAuth, supplierPurchaseRoutes({ readDb, writeDb }));
app.use("/api/expenses", requireAuth, expenseRoutes({ readDb, writeDb }));
app.use("/api/customers", requireAuth, customerRoutes({ readDb, writeDb }));
app.use("/api/loyalty", requireAuth, loyaltyRoutes({ readDb, writeDb }));

const PORT = process.env.PORT || 5000;

const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || "shazee";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "123456";

function safeUser(user) {
  const { passwordHash, ...cleanUser } = user;
  return cleanUser;
}

function createSlug(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isTenantExpired(tenant) {
  if (!tenant?.expiryDate) return false;

  const expiry = new Date(tenant.expiryDate);

  if (Number.isNaN(expiry.getTime())) return false;

  expiry.setHours(23, 59, 59, 999);

  return expiry.getTime() < Date.now();
}

function tenantOnly(req, res, next) {
  if (!req.user?.tenantId) {
    return res.status(403).json({ message: "Restaurant account access required." });
  }

  const db = ensureCollections(readDb());
  const tenant = db.tenants.find((item) => item.id === req.user.tenantId);

  if (!tenant) {
    return res.status(404).json({ message: "Restaurant account not found." });
  }

  if (tenant.status !== "active") {
    return res.status(403).json({ message: "Restaurant account is not active." });
  }

  if (tenant.subscriptionStatus === "paused" || tenant.subscriptionStatus === "cancelled") {
    return res.status(403).json({
      message: "Your subscription is not active. Please contact super admin."
    });
  }

  if (isTenantExpired(tenant)) {
    tenant.subscriptionStatus = "expired";
    tenant.paymentStatus = tenant.paymentStatus === "paid" ? "overdue" : tenant.paymentStatus || "overdue";
    tenant.updatedAt = new Date().toISOString();
    writeDb(db);

    return res.status(402).json({
      message: "Subscription expired. Please renew your account to continue using NexaPOS Pro.",
      subscriptionLocked: true,
      expiryDate: tenant.expiryDate
    });
  }

  next();
}

function ensureCollections(db) {
  db.tenants = Array.isArray(db.tenants) ? db.tenants : [];
  db.users = Array.isArray(db.users) ? db.users : [];
  db.branches = Array.isArray(db.branches) ? db.branches : [];
  db.modules = Array.isArray(db.modules) ? db.modules : [];
  db.orders = Array.isArray(db.orders) ? db.orders : [];
  db.tables = Array.isArray(db.tables) ? db.tables : [];
  db.menuCategories = Array.isArray(db.menuCategories) ? db.menuCategories : [];
  db.menuItems = Array.isArray(db.menuItems) ? db.menuItems : [];
  db.inventoryItems = Array.isArray(db.inventoryItems) ? db.inventoryItems : [];
  db.stockMovements = Array.isArray(db.stockMovements) ? db.stockMovements : [];
  db.menuInventoryMappings = Array.isArray(db.menuInventoryMappings) ? db.menuInventoryMappings : [];
  db.suppliers = Array.isArray(db.suppliers) ? db.suppliers : [];
  db.purchaseInvoices = Array.isArray(db.purchaseInvoices) ? db.purchaseInvoices : [];
  db.expenses = Array.isArray(db.expenses) ? db.expenses : [];
  db.customers = Array.isArray(db.customers) ? db.customers : [];
  db.customerPointLogs = Array.isArray(db.customerPointLogs) ? db.customerPointLogs : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  db.staff = Array.isArray(db.staff) ? db.staff : [];
  db.restaurantSettings = Array.isArray(db.restaurantSettings) ? db.restaurantSettings : [];
  db.packages = Array.isArray(db.packages) ? db.packages : [];
  db.subscriptionPayments = Array.isArray(db.subscriptionPayments) ? db.subscriptionPayments : [];
  return db;
}

function getTenantModules(db, tenantId) {
  const tenant = db.tenants.find((item) => item.id === tenantId);
  if (!tenant) return [];
  return db.modules.filter((module) => tenant.enabledModules.includes(module.key));
}

function getTenantOrFail(db, tenantId) {
  return db.tenants.find((item) => item.id === tenantId);
}

function getNextOrderNumber(db, tenantId) {
  const count = db.orders.filter((order) => order.tenantId === tenantId).length;
  return `#${String(count + 1).padStart(4, "0")}`;
}

function defaultTablesForTenant(tenantId, branchId) {
  return [
    { id: uuid(), tenantId, branchId, name: "1", floor: "Main Hall", shape: "rect", chairs: 4, x: 12, y: 9, status: "occupied", timer: "02:50:15", guests: 4, orderNo: "#701", staff: "Shehbaz", total: 1546.5, currentOrderIds: [] },
    { id: uuid(), tenantId, branchId, name: "2", floor: "Main Hall", shape: "rect", chairs: 2, x: 36, y: 14, status: "occupied", timer: "05:46:35", guests: 2, orderNo: "#694", staff: "Ali", total: 1546.5, currentOrderIds: [] },
    { id: uuid(), tenantId, branchId, name: "Rauf", floor: "Main Hall", shape: "round", chairs: 5, x: 61, y: 19, status: "occupied", timer: "21:27:09", guests: 3, orderNo: "#695", staff: "Rauf", total: 2190, currentOrderIds: [] },
    { id: uuid(), tenantId, branchId, name: "4", floor: "Main Hall", shape: "rect", chairs: 3, x: 82, y: 12, status: "occupied", timer: "20:10:24", guests: 3, orderNo: "#696", staff: "Mudabir", total: 980, currentOrderIds: [] },
    { id: uuid(), tenantId, branchId, name: "5", floor: "Main Hall", shape: "rect", chairs: 4, x: 18, y: 78, status: "available", timer: "", guests: 0, orderNo: "", staff: "", total: 0, currentOrderIds: [] },
    { id: uuid(), tenantId, branchId, name: "VIP", floor: "Family Hall", shape: "round", chairs: 6, x: 58, y: 36, status: "occupied", timer: "01:14:08", guests: 5, orderNo: "#VIP1", staff: "Admin", total: 4200, currentOrderIds: [] }
  ];
}

function ensureTenantTables(db, tenantId, branchId) {
  const existing = db.tables.filter((table) => table.tenantId === tenantId);
  if (existing.length > 0) return existing;

  const createdTables = defaultTablesForTenant(tenantId, branchId);
  db.tables.push(...createdTables);
  return createdTables;
}

function defaultMenuForTenant(tenantId, branchId) {
  const categoryNames = [
    "Wings & Wraps",
    "Fries Station",
    "Burgerz",
    "Special Food",
    "Karahi",
    "Classic Food",
    "Beef Burgers",
    "Seafood"
  ];

  const categories = categoryNames.map((name, index) => ({
    id: uuid(),
    tenantId,
    branchId,
    name,
    sortOrder: index + 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  function categoryId(name) {
    return categories.find((category) => category.name === name)?.id;
  }

  const rawItems = [
    { category: "Wings & Wraps", name: "Crispy Hot Wings", subtitle: "Crispy hot wings", price: 300, costPrice: 160, stock: 60, emoji: "ðŸ—" },
    { category: "Wings & Wraps", name: "Crispy BBQ Wings", subtitle: "Crispy BBQ wings", price: 700, costPrice: 410, stock: 45, emoji: "ðŸ–" },
    { category: "Wings & Wraps", name: "Grilled Peri Peri Wings", subtitle: "Grilled peri peri wings", price: 599, costPrice: 320, stock: 35, emoji: "ðŸ”¥", discount: "15% off" },
    { category: "Wings & Wraps", name: "Signature Grilled Wrap", subtitle: "Signature grilled wrap", price: 649, costPrice: 330, stock: 55, emoji: "ðŸŒ¯" },
    { category: "Burgerz", name: "Khan Wrap", subtitle: "Testing tasty", price: 900, costPrice: 480, stock: 40, emoji: "ðŸ”" },
    { category: "Burgerz", name: "Pizza Fajita", subtitle: "Fajita cheesy pizza", price: 820, costPrice: 430, stock: 30, emoji: "ðŸ•" },
    { category: "Fries Station", name: "Loaded Fries", subtitle: "Cheese fries with sauce", price: 450, costPrice: 210, stock: 70, emoji: "ðŸŸ" },
    { category: "Special Food", name: "Alfredo Pasta", subtitle: "Creamy pasta", price: 980, costPrice: 520, stock: 25, emoji: "ðŸ", discount: "10% off" },
    { category: "Karahi", name: "Chicken Karahi", subtitle: "Fresh karahi with spices", price: 1600, costPrice: 950, stock: 20, emoji: "ðŸ²" },
    { category: "Classic Food", name: "Chicken Biryani", subtitle: "Classic spicy biryani", price: 380, costPrice: 190, stock: 80, emoji: "ðŸ›" }
  ];

  const items = rawItems.map((item, index) => ({
    id: uuid(),
    tenantId,
    branchId,
    categoryId: categoryId(item.category),
    category: item.category,
    name: item.name,
    subtitle: item.subtitle || "",
    price: Number(item.price || 0),
    discount: item.discount || "",
    emoji: item.emoji || "ðŸ½ï¸",
    imageUrl: "",
    sku: `ITEM-${String(index + 1).padStart(3, "0")}`,
    isActive: true,
    isAvailable: true,
    sortOrder: index + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  const inventoryItems = items.map((item, index) => {
    const raw = rawItems[index];

    return {
      id: uuid(),
      tenantId,
      branchId,
      menuItemId: item.id,
      name: item.name,
      sku: item.sku,
      unit: "pcs",
      category: item.category,
      currentStock: Number(raw.stock || 0),
      lowStockAlert: 10,
      costPrice: Number(raw.costPrice || 0),
      salePrice: Number(item.price || 0),
      trackStock: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  return { categories, items, inventoryItems };
}

function ensureTenantMenu(db, tenantId, branchId) {
  const categories = db.menuCategories.filter((category) => category.tenantId === tenantId);
  const items = db.menuItems.filter((item) => item.tenantId === tenantId);

  if (categories.length > 0 && items.length > 0) {
    ensureInventoryForExistingMenu(db, tenantId, branchId);
    return { categories, items };
  }

  const seed = defaultMenuForTenant(tenantId, branchId);
  db.menuCategories.push(...seed.categories);
  db.menuItems.push(...seed.items);
  db.inventoryItems.push(...seed.inventoryItems);

  return seed;
}

function ensureInventoryForExistingMenu(db, tenantId, branchId) {
  const menuItems = db.menuItems.filter((item) => item.tenantId === tenantId);

  menuItems.forEach((menuItem) => {
    const exists = db.inventoryItems.some(
      (stockItem) => stockItem.tenantId === tenantId && stockItem.menuItemId === menuItem.id
    );

    if (!exists) {
      db.inventoryItems.push({
        id: uuid(),
        tenantId,
        branchId: menuItem.branchId || branchId || null,
        menuItemId: menuItem.id,
        name: menuItem.name,
        sku: menuItem.sku || `ITEM-${Date.now()}`,
        unit: "pcs",
        category: menuItem.category || "",
        currentStock: 100,
        lowStockAlert: 10,
        costPrice: 0,
        salePrice: Number(menuItem.price || 0),
        trackStock: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  });
}

function deductInventoryForOrder(db, order, reqUser) {
  const movements = [];

  order.items.forEach((orderItem) => {
    const inventoryItem = db.inventoryItems.find(
      (stockItem) =>
        stockItem.tenantId === order.tenantId &&
        stockItem.menuItemId === orderItem.id &&
        stockItem.trackStock !== false
    );

    if (!inventoryItem) return;

    const qty = Number(orderItem.qty || 1);
    inventoryItem.currentStock = Number(inventoryItem.currentStock || 0) - qty;
    inventoryItem.updatedAt = new Date().toISOString();

    const movement = {
      id: uuid(),
      tenantId: order.tenantId,
      branchId: order.branchId || null,
      inventoryItemId: inventoryItem.id,
      menuItemId: inventoryItem.menuItemId,
      type: "OUT",
      reason: "ORDER_SALE",
      qty,
      previousStock: Number(inventoryItem.currentStock || 0) + qty,
      newStock: Number(inventoryItem.currentStock || 0),
      orderId: order.id,
      orderNo: order.orderNo,
      note: `Auto deducted from order ${order.orderNo}`,
      createdBy: reqUser.username || reqUser.id,
      createdAt: new Date().toISOString()
    };

    movements.push(movement);
  });

  db.stockMovements.push(...movements);
  return movements;
}

app.get("/", (req, res) => {
  res.json({
    app: "NexaPOS Pro Backend",
    status: "running",
    message: "Backend is working successfully."
  });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    if (username === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD) {
      const token = signToken({
        id: "super-admin",
        username: SUPER_ADMIN_USERNAME,
        role: "super_admin",
        tenantId: null
      });

      return res.json({
        token,
        user: {
          id: "super-admin",
          username: SUPER_ADMIN_USERNAME,
          name: "Shazee Super Admin",
          role: "super_admin",
          tenantId: null
        }
      });
    }

    const db = ensureCollections(readDb());
    const user = db.users.find((item) => item.username.toLowerCase() === username.toLowerCase());

    if (!user) return res.status(401).json({ message: "Invalid username or password." });

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid username or password." });

    const tenant = db.tenants.find((item) => item.id === user.tenantId);

    if (!tenant || tenant.status !== "active") {
      return res.status(403).json({ message: "This restaurant account is not active." });
    }

    ensureTenantTables(db, tenant.id, user.branchId || null);
    ensureTenantMenu(db, tenant.id, user.branchId || null);
    writeDb(db);

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId || null
    });

    res.json({
      token,
      user: safeUser(user),
      tenant,
      modules: getTenantModules(db, user.tenantId)
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed." });
  }
});

app.get("/api/me", requireAuth, (req, res) => {
  const db = ensureCollections(readDb());

  if (req.user.role === "super_admin") {
    return res.json({
      user: {
        id: "super-admin",
        username: SUPER_ADMIN_USERNAME,
        name: "Shazee Super Admin",
        role: "super_admin",
        tenantId: null
      },
      tenant: null,
      modules: db.modules
    });
  }

  const user = db.users.find((item) => item.id === req.user.id);
  const tenant = db.tenants.find((item) => item.id === req.user.tenantId);

  if (!user || !tenant) return res.status(404).json({ message: "User or restaurant not found." });

  ensureTenantTables(db, tenant.id, user.branchId || null);
  ensureTenantMenu(db, tenant.id, user.branchId || null);
  writeDb(db);

  res.json({
    user: safeUser(user),
    tenant,
    modules: getTenantModules(db, tenant.id)
  });
});

app.get("/api/modules", requireAuth, (req, res) => {
  const db = ensureCollections(readDb());
  res.json(db.modules);
});

app.get("/api/super/tenants", requireAuth, requireSuperAdmin, (req, res) => {
  const db = ensureCollections(readDb());

  const tenants = db.tenants.map((tenant) => ({
    ...tenant,
    usersCount: db.users.filter((user) => user.tenantId === tenant.id).length,
    branchesCount: db.branches.filter((branch) => branch.tenantId === tenant.id).length,
    ordersCount: db.orders.filter((order) => order.tenantId === tenant.id).length,
    tablesCount: db.tables.filter((table) => table.tenantId === tenant.id).length,
    menuItemsCount: db.menuItems.filter((item) => item.tenantId === tenant.id).length,
    inventoryItemsCount: db.inventoryItems.filter((item) => item.tenantId === tenant.id).length
  }));

  res.json(tenants);
});

app.post("/api/super/tenants", requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const {
      restaurantName,
      ownerName,
      username,
      password,
      phone,
      email,
      packageName,
      expiryDate,
      enabledModules
    } = req.body;

    if (!restaurantName || !ownerName || !username || !password) {
      return res.status(400).json({
        message: "Restaurant name, owner name, username and password are required."
      });
    }

    const db = ensureCollections(readDb());

    const usernameExists = db.users.some(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );

    if (usernameExists || username.toLowerCase() === SUPER_ADMIN_USERNAME.toLowerCase()) {
      return res.status(409).json({ message: "Username already exists." });
    }

    const validModuleKeys = db.modules.map((module) => module.key);
    const cleanModules = Array.isArray(enabledModules)
      ? enabledModules.filter((key) => validModuleKeys.includes(key))
      : [];

    const tenantId = uuid();
    const branchId = uuid();
    const userId = uuid();

    const tenant = {
      id: tenantId,
      restaurantName,
      ownerName,
      slug: createSlug(restaurantName) || tenantId,
      phone: phone || "",
      email: email || "",
      packageName: packageName || "Custom",
      enabledModules: cleanModules,
      status: "active",
      subscriptionStatus: "active",
      paymentStatus: "trial",
      expiryDate: expiryDate || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const branch = {
      id: branchId,
      tenantId,
      name: "Main Branch",
      address: "",
      phone: phone || "",
      createdAt: new Date().toISOString()
    };

    const passwordHash = await hashPassword(password);

    const ownerUser = {
      id: userId,
      tenantId,
      branchId,
      name: ownerName,
      username,
      passwordHash,
      role: "owner",
      phone: phone || "",
      email: email || "",
      status: "active",
      createdAt: new Date().toISOString()
    };

    db.tenants.push(tenant);
    db.branches.push(branch);
    db.users.push(ownerUser);

    ensureTenantTables(db, tenantId, branchId);
    ensureTenantMenu(db, tenantId, branchId);

    writeDb(db);

    res.status(201).json({
      message: "Restaurant client created successfully.",
      tenant,
      branch,
      user: safeUser(ownerUser),
      login: { username, password }
    });
  } catch (error) {
    console.error("Create tenant error:", error);
    res.status(500).json({ message: "Failed to create restaurant client." });
  }
});

app.patch("/api/super/tenants/:tenantId/modules", requireAuth, requireSuperAdmin, (req, res) => {
  const { tenantId } = req.params;
  const { enabledModules } = req.body;
  const db = ensureCollections(readDb());

  const tenant = db.tenants.find((item) => item.id === tenantId);
  if (!tenant) return res.status(404).json({ message: "Restaurant client not found." });

  const validModuleKeys = db.modules.map((module) => module.key);

  tenant.enabledModules = Array.isArray(enabledModules)
    ? enabledModules.filter((key) => validModuleKeys.includes(key))
    : tenant.enabledModules;

  tenant.updatedAt = new Date().toISOString();

  writeDb(db);

  res.json({ message: "Modules updated successfully.", tenant });
});

app.get("/api/client/dashboard", requireAuth, tenantOnly, (req, res) => {
  const db = ensureCollections(readDb());
  const tenant = getTenantOrFail(db, req.user.tenantId);

  if (!tenant) return res.status(404).json({ message: "Restaurant not found." });

  ensureTenantTables(db, req.user.tenantId, req.user.branchId || null);
  ensureTenantMenu(db, req.user.tenantId, req.user.branchId || null);
  writeDb(db);

  const tenantOrders = db.orders.filter((order) => order.tenantId === tenant.id);
  const tenantTables = db.tables.filter((table) => table.tenantId === tenant.id);
  const tenantStock = db.inventoryItems.filter((item) => item.tenantId === tenant.id);
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = tenantOrders.filter((order) => order.createdAt?.slice(0, 10) === today);
  const todaySales = todayOrders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  res.json({
    type: "client",
    tenant,
    modules: getTenantModules(db, tenant.id),
    stats: {
      todaySales,
      todayOrders: todayOrders.length,
      activeTables: tenantTables.filter((table) => table.status === "occupied").length,
      pendingKitchenOrders: tenantOrders.filter((order) => ["unconfirmed", "placed", "preparing"].includes(order.kitchenStatus)).length,
      lowStockItems: tenantStock.filter((item) => Number(item.currentStock || 0) <= Number(item.lowStockAlert || 0)).length,
      activeStaff: (db.staff || []).filter((item) => item.tenantId === tenant.id && item.isActive !== false).length
    }
  });
});

app.get("/api/menu", requireAuth, tenantOnly, (req, res) => {
  const db = ensureCollections(readDb());
  const data = ensureTenantMenu(db, req.user.tenantId, req.user.branchId || null);
  ensureInventoryForExistingMenu(db, req.user.tenantId, req.user.branchId || null);
  writeDb(db);

  const categories = data.categories
    .filter((category) => category.tenantId === req.user.tenantId)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

  const items = data.items
    .filter((item) => item.tenantId === req.user.tenantId)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

  res.json({ categories, items });
});

app.post("/api/menu/categories", requireAuth, tenantOnly, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Category name is required." });

  const db = ensureCollections(readDb());
  ensureTenantMenu(db, req.user.tenantId, req.user.branchId || null);

  const exists = db.menuCategories.some(
    (category) =>
      category.tenantId === req.user.tenantId &&
      category.name.toLowerCase() === name.toLowerCase()
  );

  if (exists) return res.status(409).json({ message: "Category already exists." });

  const category = {
    id: uuid(),
    tenantId: req.user.tenantId,
    branchId: req.user.branchId || null,
    name,
    sortOrder: db.menuCategories.filter((item) => item.tenantId === req.user.tenantId).length + 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.menuCategories.push(category);
  writeDb(db);

  res.status(201).json({ message: "Category created.", category });
});

app.put("/api/menu/categories/:categoryId", requireAuth, tenantOnly, (req, res) => {
  const { categoryId } = req.params;
  const { name, isActive } = req.body;
  const db = ensureCollections(readDb());

  const category = db.menuCategories.find(
    (item) => item.id === categoryId && item.tenantId === req.user.tenantId
  );

  if (!category) return res.status(404).json({ message: "Category not found." });

  category.name = name || category.name;
  category.isActive = typeof isActive === "boolean" ? isActive : category.isActive;
  category.updatedAt = new Date().toISOString();

  db.menuItems = db.menuItems.map((item) => {
    if (item.categoryId === category.id && item.tenantId === req.user.tenantId) {
      return { ...item, category: category.name, updatedAt: new Date().toISOString() };
    }
    return item;
  });

  writeDb(db);

  res.json({ message: "Category updated.", category });
});

app.delete("/api/menu/categories/:categoryId", requireAuth, tenantOnly, (req, res) => {
  const { categoryId } = req.params;
  const db = ensureCollections(readDb());

  const category = db.menuCategories.find(
    (item) => item.id === categoryId && item.tenantId === req.user.tenantId
  );

  if (!category) return res.status(404).json({ message: "Category not found." });

  const hasItems = db.menuItems.some(
    (item) => item.categoryId === categoryId && item.tenantId === req.user.tenantId
  );

  if (hasItems) {
    return res.status(400).json({
      message: "Cannot delete category with items. Move or delete items first."
    });
  }

  db.menuCategories = db.menuCategories.filter((item) => item.id !== categoryId);
  writeDb(db);

  res.json({ message: "Category deleted." });
});

app.post("/api/menu/items", requireAuth, tenantOnly, (req, res) => {
  const { categoryId, name, subtitle, price, discount, emoji, sku, imageUrl } = req.body;

  if (!categoryId || !name || price === undefined) {
    return res.status(400).json({ message: "Category, name and price are required." });
  }

  const db = ensureCollections(readDb());
  ensureTenantMenu(db, req.user.tenantId, req.user.branchId || null);

  const category = db.menuCategories.find(
    (item) => item.id === categoryId && item.tenantId === req.user.tenantId
  );

  if (!category) return res.status(404).json({ message: "Category not found." });

  const item = {
    id: uuid(),
    tenantId: req.user.tenantId,
    branchId: req.user.branchId || null,
    categoryId,
    category: category.name,
    name,
    subtitle: subtitle || "",
    price: Number(price || 0),
    discount: discount || "",
    emoji: emoji || "ðŸ½ï¸",
    imageUrl: imageUrl || "",
    sku: sku || `ITEM-${Date.now()}`,
    isActive: true,
    isAvailable: true,
    sortOrder: db.menuItems.filter((menuItem) => menuItem.tenantId === req.user.tenantId).length + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.menuItems.push(item);

  db.inventoryItems.push({
    id: uuid(),
    tenantId: req.user.tenantId,
    branchId: req.user.branchId || null,
    menuItemId: item.id,
    name: item.name,
    sku: item.sku,
    unit: "pcs",
    category: item.category,
    currentStock: 100,
    lowStockAlert: 10,
    costPrice: 0,
    salePrice: Number(item.price || 0),
    trackStock: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  writeDb(db);

  res.status(201).json({ message: "Menu item created.", item });
});

app.put("/api/menu/items/:itemId", requireAuth, tenantOnly, (req, res) => {
  const { itemId } = req.params;
  const { categoryId, name, subtitle, price, discount, emoji, sku, imageUrl, isActive, isAvailable } = req.body;
  const db = ensureCollections(readDb());

  const item = db.menuItems.find(
    (menuItem) => menuItem.id === itemId && menuItem.tenantId === req.user.tenantId
  );

  if (!item) return res.status(404).json({ message: "Menu item not found." });

  let category = null;

  if (categoryId) {
    category = db.menuCategories.find(
      (cat) => cat.id === categoryId && cat.tenantId === req.user.tenantId
    );

    if (!category) return res.status(404).json({ message: "Category not found." });
  }

  item.categoryId = categoryId || item.categoryId;
  item.category = category?.name || item.category;
  item.name = name || item.name;
  item.subtitle = subtitle ?? item.subtitle;
  item.price = price !== undefined ? Number(price || 0) : item.price;
  item.discount = discount ?? item.discount;
  item.emoji = emoji || item.emoji;
  item.sku = sku || item.sku;
  item.imageUrl = imageUrl ?? item.imageUrl;
  item.isActive = typeof isActive === "boolean" ? isActive : item.isActive;
  item.isAvailable = typeof isAvailable === "boolean" ? isAvailable : item.isAvailable;
  item.updatedAt = new Date().toISOString();

  const stockItem = db.inventoryItems.find(
    (inv) => inv.tenantId === req.user.tenantId && inv.menuItemId === item.id
  );

  if (stockItem) {
    stockItem.name = item.name;
    stockItem.sku = item.sku;
    stockItem.category = item.category;
    stockItem.salePrice = Number(item.price || 0);
    stockItem.isActive = item.isActive;
    stockItem.updatedAt = new Date().toISOString();
  }

  writeDb(db);

  res.json({ message: "Menu item updated.", item });
});

app.patch("/api/menu/items/:itemId/toggle", requireAuth, tenantOnly, (req, res) => {
  const { itemId } = req.params;
  const db = ensureCollections(readDb());

  const item = db.menuItems.find(
    (menuItem) => menuItem.id === itemId && menuItem.tenantId === req.user.tenantId
  );

  if (!item) return res.status(404).json({ message: "Menu item not found." });

  item.isActive = !item.isActive;
  item.isAvailable = item.isActive;
  item.updatedAt = new Date().toISOString();

  const stockItem = db.inventoryItems.find(
    (inv) => inv.tenantId === req.user.tenantId && inv.menuItemId === item.id
  );

  if (stockItem) {
    stockItem.isActive = item.isActive;
    stockItem.updatedAt = new Date().toISOString();
  }

  writeDb(db);

  res.json({ message: "Menu item status updated.", item });
});

app.delete("/api/menu/items/:itemId", requireAuth, tenantOnly, (req, res) => {
  const { itemId } = req.params;
  const db = ensureCollections(readDb());

  const item = db.menuItems.find(
    (menuItem) => menuItem.id === itemId && menuItem.tenantId === req.user.tenantId
  );

  if (!item) return res.status(404).json({ message: "Menu item not found." });

  db.menuItems = db.menuItems.filter((menuItem) => menuItem.id !== itemId);
  db.inventoryItems = db.inventoryItems.filter((inv) => inv.menuItemId !== itemId);
  writeDb(db);

  res.json({ message: "Menu item deleted." });
});

app.get("/api/inventory", requireAuth, tenantOnly, (req, res) => {
  const db = ensureCollections(readDb());
  ensureTenantMenu(db, req.user.tenantId, req.user.branchId || null);
  ensureInventoryForExistingMenu(db, req.user.tenantId, req.user.branchId || null);
  writeDb(db);

  const inventory = db.inventoryItems
    .filter((item) => item.tenantId === req.user.tenantId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const movements = db.stockMovements
    .filter((movement) => movement.tenantId === req.user.tenantId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 100);

  res.json({ inventory, movements });
});

app.post("/api/inventory", requireAuth, tenantOnly, (req, res) => {
  const { name, sku, unit, category, currentStock, lowStockAlert, costPrice, salePrice, trackStock } = req.body;

  if (!name) return res.status(400).json({ message: "Inventory item name is required." });

  const db = ensureCollections(readDb());

  const item = {
    id: uuid(),
    tenantId: req.user.tenantId,
    branchId: req.user.branchId || null,
    menuItemId: null,
    name,
    sku: sku || `INV-${Date.now()}`,
    unit: unit || "pcs",
    category: category || "General",
    currentStock: Number(currentStock || 0),
    lowStockAlert: Number(lowStockAlert || 10),
    costPrice: Number(costPrice || 0),
    salePrice: Number(salePrice || 0),
    trackStock: trackStock !== false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.inventoryItems.push(item);

  db.stockMovements.push({
    id: uuid(),
    tenantId: req.user.tenantId,
    branchId: req.user.branchId || null,
    inventoryItemId: item.id,
    menuItemId: null,
    type: "IN",
    reason: "OPENING_STOCK",
    qty: Number(currentStock || 0),
    previousStock: 0,
    newStock: Number(currentStock || 0),
    orderId: null,
    orderNo: "",
    note: "Manual inventory item created",
    createdBy: req.user.username || req.user.id,
    createdAt: new Date().toISOString()
  });

  writeDb(db);

  res.status(201).json({ message: "Inventory item created.", item });
});

app.put("/api/inventory/:itemId", requireAuth, tenantOnly, (req, res) => {
  const { itemId } = req.params;
  const { name, sku, unit, category, lowStockAlert, costPrice, salePrice, trackStock, isActive } = req.body;
  const db = ensureCollections(readDb());

  const item = db.inventoryItems.find(
    (stockItem) => stockItem.id === itemId && stockItem.tenantId === req.user.tenantId
  );

  if (!item) return res.status(404).json({ message: "Inventory item not found." });

  item.name = name || item.name;
  item.sku = sku || item.sku;
  item.unit = unit || item.unit;
  item.category = category || item.category;
  item.lowStockAlert = lowStockAlert !== undefined ? Number(lowStockAlert || 0) : item.lowStockAlert;
  item.costPrice = costPrice !== undefined ? Number(costPrice || 0) : item.costPrice;
  item.salePrice = salePrice !== undefined ? Number(salePrice || 0) : item.salePrice;
  item.trackStock = typeof trackStock === "boolean" ? trackStock : item.trackStock;
  item.isActive = typeof isActive === "boolean" ? isActive : item.isActive;
  item.updatedAt = new Date().toISOString();

  writeDb(db);

  res.json({ message: "Inventory item updated.", item });
});

app.patch("/api/inventory/:itemId/adjust", requireAuth, tenantOnly, (req, res) => {
  const { itemId } = req.params;
  const { type, qty, reason, note } = req.body;
  const db = ensureCollections(readDb());

  const allowedTypes = ["IN", "OUT", "SET"];
  if (!allowedTypes.includes(type)) return res.status(400).json({ message: "Invalid stock adjustment type." });

  const item = db.inventoryItems.find(
    (stockItem) => stockItem.id === itemId && stockItem.tenantId === req.user.tenantId
  );

  if (!item) return res.status(404).json({ message: "Inventory item not found." });

  const amount = Number(qty || 0);
  const previousStock = Number(item.currentStock || 0);

  if (type === "IN") item.currentStock = previousStock + amount;
  if (type === "OUT") item.currentStock = previousStock - amount;
  if (type === "SET") item.currentStock = amount;

  item.updatedAt = new Date().toISOString();

  const movement = {
    id: uuid(),
    tenantId: req.user.tenantId,
    branchId: req.user.branchId || null,
    inventoryItemId: item.id,
    menuItemId: item.menuItemId || null,
    type,
    reason: reason || "MANUAL_ADJUSTMENT",
    qty: amount,
    previousStock,
    newStock: Number(item.currentStock || 0),
    orderId: null,
    orderNo: "",
    note: note || "",
    createdBy: req.user.username || req.user.id,
    createdAt: new Date().toISOString()
  };

  db.stockMovements.push(movement);
  writeDb(db);

  res.json({ message: "Stock adjusted.", item, movement });
});

app.delete("/api/inventory/:itemId", requireAuth, tenantOnly, (req, res) => {
  const { itemId } = req.params;
  const db = ensureCollections(readDb());

  const item = db.inventoryItems.find(
    (stockItem) => stockItem.id === itemId && stockItem.tenantId === req.user.tenantId
  );

  if (!item) return res.status(404).json({ message: "Inventory item not found." });

  if (item.menuItemId) {
    return res.status(400).json({
      message: "This stock item is linked with menu item. Delete menu item first or disable tracking."
    });
  }

  db.inventoryItems = db.inventoryItems.filter((stockItem) => stockItem.id !== itemId);
  writeDb(db);

  res.json({ message: "Inventory item deleted." });
});

app.get("/api/tables", requireAuth, tenantOnly, (req, res) => {
  const db = ensureCollections(readDb());
  const tables = ensureTenantTables(db, req.user.tenantId, req.user.branchId || null);
  writeDb(db);
  res.json(tables);
});

app.patch("/api/tables/:tableId/start", requireAuth, tenantOnly, (req, res) => {
  const { tableId } = req.params;
  const { guests, staff } = req.body;
  const db = ensureCollections(readDb());

  const table = db.tables.find((item) => item.id === tableId && item.tenantId === req.user.tenantId);
  if (!table) return res.status(404).json({ message: "Table not found." });

  table.status = "occupied";
  table.timer = table.timer || "00:00:01";
  table.guests = Number(guests || table.guests || 2);
  table.staff = staff || table.staff || req.user.username || "Staff";
  table.orderNo = table.orderNo || getNextOrderNumber(db, req.user.tenantId);
  table.total = Number(table.total || 0);
  table.currentOrderIds = Array.isArray(table.currentOrderIds) ? table.currentOrderIds : [];
  table.updatedAt = new Date().toISOString();

  writeDb(db);
  res.json({ message: "Table started.", table });
});

app.patch("/api/tables/:tableId/settle", requireAuth, tenantOnly, (req, res) => {
  const { tableId } = req.params;
  const { paymentMethod, paidAmount } = req.body;
  const db = ensureCollections(readDb());

  const table = db.tables.find((item) => item.id === tableId && item.tenantId === req.user.tenantId);
  if (!table) return res.status(404).json({ message: "Table not found." });

  const now = new Date().toISOString();

  db.orders = db.orders.map((order) => {
    if (Array.isArray(table.currentOrderIds) && table.currentOrderIds.includes(order.id)) {
      return {
        ...order,
        paymentStatus: "paid",
        paymentMethod: paymentMethod || order.paymentMethod || "Cash",
        orderStatus: "completed",
        paidAt: now,
        updatedAt: now
      };
    }
    return order;
  });

  const receipt = {
    id: uuid(),
    type: "table_settlement",
    tenantId: req.user.tenantId,
    branchId: req.user.branchId || null,
    tableId: table.id,
    tableName: table.name,
    orderNo: table.orderNo,
    paymentMethod: paymentMethod || "Cash",
    paidAmount: Number(paidAmount || table.total || 0),
    createdAt: now
  };

  db.auditLogs.push({
    id: uuid(),
    action: "TABLE_SETTLED",
    actor: req.user.username,
    details: receipt,
    createdAt: now
  });

  table.status = "available";
  table.timer = "";
  table.guests = 0;
  table.orderNo = "";
  table.staff = "";
  table.total = 0;
  table.currentOrderIds = [];
  table.updatedAt = now;

  writeDb(db);

  res.json({ message: "Table settled successfully.", table, receipt });
});

app.patch("/api/tables/:tableId/clear", requireAuth, tenantOnly, (req, res) => {
  const { tableId } = req.params;
  const db = ensureCollections(readDb());

  const table = db.tables.find((item) => item.id === tableId && item.tenantId === req.user.tenantId);
  if (!table) return res.status(404).json({ message: "Table not found." });

  table.status = "available";
  table.timer = "";
  table.guests = 0;
  table.orderNo = "";
  table.staff = "";
  table.total = 0;
  table.currentOrderIds = [];
  table.updatedAt = new Date().toISOString();

  writeDb(db);
  res.json({ message: "Table cleared.", table });
});

app.post("/api/orders", requireAuth, tenantOnly, (req, res) => {
  try {
    const {
      mode,
      table,
      items,
      customer,
      phone,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentStatus,
      orderStatus,
      kitchenStatus,
      orderInstructions
    } = req.body;

    if (!mode || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Mode and order items are required." });
    }

    const db = ensureCollections(readDb());
    const tenant = getTenantOrFail(db, req.user.tenantId);
    if (!tenant) return res.status(404).json({ message: "Restaurant not found." });

    ensureInventoryForExistingMenu(db, req.user.tenantId, req.user.branchId || null);

    const orderNo = getNextOrderNumber(db, req.user.tenantId);

    const order = {
      id: uuid(),
      orderNo,
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || null,
      createdBy: req.user.id,
      mode,
      table: table || null,
      tableId: table?.id || null,
      tableName: table?.name || "",
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price || 0),
        qty: Number(item.qty || 1),
        category: item.category || "",
        note: item.note || ""
      })),
      customer: customer || {},
      phone: phone || "",
      subtotal: Number(subtotal || 0),
      tax: Number(tax || 0),
      total: Number(total || 0),
      paymentMethod: paymentMethod || "",
      paymentStatus: paymentStatus || "unpaid",
      orderStatus: orderStatus || "placed",
      kitchenStatus: kitchenStatus || "placed",
      orderInstructions: orderInstructions || "",
      staff: req.body.staff || {},
      waiterId: req.body.waiterId || "",
      riderId: req.body.riderId || "",
      cashierId: req.body.cashierId || "",
      waiterName: req.body.waiterName || "",
      riderName: req.body.riderName || "",
      cashierName: req.body.cashierName || "",
      originalTotal: Number(req.body.originalTotal || total || 0),
      discountAmount: Number(req.body.discountAmount || 0),
      discountsApplied: Array.isArray(req.body.discountsApplied) ? req.body.discountsApplied : [],
      couponCode: req.body.couponCode || "",
      taxName: req.body.taxName || "GST",
      taxPercent: Number(req.body.taxPercent || 0),
      serviceChargeName: req.body.serviceChargeName || "Service Charges",
      serviceChargePercent: Number(req.body.serviceChargePercent || 0),
      serviceChargeAmount: Number(req.body.serviceChargeAmount || 0),
      currency: req.body.currency || "Rs",
      restaurantSettings: req.body.restaurantSettings || {},
      inventoryDeducted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.orders.push(order);
    deductInventoryForOrder(db, order, req.user);

    if (mode === "dine_in" && table?.id) {
      const dineTable = db.tables.find((item) => item.id === table.id && item.tenantId === req.user.tenantId);

      if (dineTable) {
        dineTable.status = "occupied";
        dineTable.timer = dineTable.timer || "00:00:01";
        dineTable.guests = Number(dineTable.guests || table.guests || 2);
        dineTable.orderNo = dineTable.orderNo || orderNo;
        dineTable.staff = dineTable.staff || req.user.username || "Staff";
        dineTable.total = Number(dineTable.total || 0) + Number(total || 0);
        dineTable.currentOrderIds = Array.isArray(dineTable.currentOrderIds)
          ? [...dineTable.currentOrderIds, order.id]
          : [order.id];
        dineTable.updatedAt = new Date().toISOString();
      }
    }

    writeDb(db);
    res.status(201).json({ message: "Order saved successfully.", order });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Failed to save order." });
  }
});

app.get("/api/orders", requireAuth, tenantOnly, (req, res) => {
  const db = ensureCollections(readDb());
  const { mode, paymentStatus, kitchenStatus } = req.query;

  let orders = db.orders.filter((order) => order.tenantId === req.user.tenantId);

  if (mode && mode !== "all") orders = orders.filter((order) => order.mode === mode);
  if (paymentStatus && paymentStatus !== "all") orders = orders.filter((order) => order.paymentStatus === paymentStatus);
  if (kitchenStatus && kitchenStatus !== "all") orders = orders.filter((order) => order.kitchenStatus === kitchenStatus);

  orders = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(orders);
});

app.get("/api/kds/orders", requireAuth, tenantOnly, (req, res) => {
  const db = ensureCollections(readDb());

  const orders = db.orders
    .filter((order) => order.tenantId === req.user.tenantId)
    .filter((order) => ["unconfirmed", "placed", "preparing", "ready"].includes(order.kitchenStatus))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json(orders);
});

app.patch("/api/orders/:orderId/kitchen-status", requireAuth, tenantOnly, (req, res) => {
  const { orderId } = req.params;
  const { kitchenStatus } = req.body;
  const allowed = ["unconfirmed", "placed", "preparing", "ready", "served", "completed"];

  if (!allowed.includes(kitchenStatus)) return res.status(400).json({ message: "Invalid kitchen status." });

  const db = ensureCollections(readDb());

  const order = db.orders.find((item) => item.id === orderId && item.tenantId === req.user.tenantId);
  if (!order) return res.status(404).json({ message: "Order not found." });

  order.kitchenStatus = kitchenStatus;
  order.updatedAt = new Date().toISOString();

  if (kitchenStatus === "completed" || kitchenStatus === "served") {
    order.orderStatus = "completed";
  }

  writeDb(db);

  res.json({ message: "Kitchen status updated.", order });
});

app.patch("/api/orders/:orderId/payment", requireAuth, tenantOnly, (req, res) => {
  const { orderId } = req.params;
  const { paymentStatus, paymentMethod } = req.body;
  const allowed = ["paid", "unpaid", "partial", "complimentary"];

  if (!allowed.includes(paymentStatus)) return res.status(400).json({ message: "Invalid payment status." });

  const db = ensureCollections(readDb());

  const order = db.orders.find((item) => item.id === orderId && item.tenantId === req.user.tenantId);
  if (!order) return res.status(404).json({ message: "Order not found." });

  order.paymentStatus = paymentStatus;
  order.paymentMethod = paymentMethod || order.paymentMethod;
  order.updatedAt = new Date().toISOString();

  writeDb(db);

  res.json({ message: "Payment updated.", order });
});

app.listen(PORT, () => {
  console.log(`NexaPOS Pro backend running on http://localhost:${PORT}`);
});















