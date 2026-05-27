const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

const DATABASE_PROVIDER = String(process.env.DATABASE_PROVIDER || "local").toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL || "";

let pool = null;
let memoryDb = null;
let initialized = false;
let writeQueue = Promise.resolve();

function initialData() {
  return {
    tenants: [],
    users: [],
    branches: [],
    modules: [],
    orders: [],
    tables: [],
    menuCategories: [],
    menuItems: [],
    inventoryItems: [],
    stockMovements: [],
    menuInventoryMappings: [],
    suppliers: [],
    purchaseInvoices: [],
    expenses: [],
    customers: [],
    customerPointLogs: [],
    driveThruTickets: [],
    auditLogs: [],
    staff: [],
    restaurantSettings: [],
    packages: [],
    subscriptions: [],
    subscriptionPayments: [],
    kdsSettings: []
  };
}

function normalizeDb(data) {
  const base = initialData();
  const clean = data && typeof data === "object" ? data : {};

  Object.keys(base).forEach((key) => {
    if (!Array.isArray(clean[key])) clean[key] = base[key];
  });

  return clean;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || initialData()));
}

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureDbFile() {
  ensureDataDir();

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData(), null, 2));
  }
}

function readLocalDb() {
  ensureDbFile();

  const raw = fs.readFileSync(DB_PATH, "utf-8");

  try {
    return normalizeDb(JSON.parse(raw));
  } catch (error) {
    console.error("Database JSON is corrupted:", error);
    throw new Error("Database file is corrupted.");
  }
}

function writeLocalDb(data) {
  ensureDataDir();
  const clean = normalizeDb(clone(data));
  fs.writeFileSync(DB_PATH, JSON.stringify(clean, null, 2));
  return clean;
}

function isSupabaseMode() {
  return ["supabase", "postgres", "postgresql"].includes(DATABASE_PROVIDER);
}

function getPool() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required when DATABASE_PROVIDER=supabase.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.PG_POOL_MAX || 12),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000
    });
  }

  return pool;
}

function toJson(value) {
  return JSON.stringify(value || {});
}

function normalizeOrderRow(row) {
  if (!row) return null;

  const raw = row.raw && typeof row.raw === "object" ? row.raw : {};

  return {
    ...raw,
    id: row.id || raw.id,
    orderNo: row.order_no || raw.orderNo || raw.order_no,
    tenantId: row.tenant_id || raw.tenantId,
    branchId: row.branch_id || raw.branchId || null,
    createdBy: row.created_by || raw.createdBy || "",
    mode: row.mode || raw.mode || "",
    tableId: row.table_id || raw.tableId || null,
    tableName: row.table_name || raw.tableName || "",
    customer: row.customer || raw.customer || {},
    phone: row.phone || raw.phone || "",
    paymentMethod: row.payment_method || raw.paymentMethod || "",
    paymentStatus: row.payment_status || raw.paymentStatus || "unpaid",
    orderStatus: row.order_status || raw.orderStatus || "placed",
    kitchenStatus: row.kitchen_status || raw.kitchenStatus || "placed",
    total: Number(row.total ?? raw.total ?? 0),
    subtotal: Number(row.subtotal ?? raw.subtotal ?? 0),
    tax: Number(row.tax ?? raw.tax ?? 0),
    riderId: row.rider_id || raw.riderId || "",
    riderName: row.rider_name || raw.riderName || "",
    waiterId: row.waiter_id || raw.waiterId || "",
    waiterName: row.waiter_name || raw.waiterName || "",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : raw.createdAt,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : raw.updatedAt,
    items: Array.isArray(row.items) ? row.items : Array.isArray(raw.items) ? raw.items : []
  };
}

async function ensurePostgresSchema() {
  const client = await getPool().connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_app_state (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_orders (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        branch_id TEXT,
        order_no TEXT NOT NULL,
        created_by TEXT,
        mode TEXT,
        table_id TEXT,
        table_name TEXT,
        customer JSONB NOT NULL DEFAULT '{}'::jsonb,
        phone TEXT,
        payment_method TEXT,
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        order_status TEXT NOT NULL DEFAULT 'placed',
        kitchen_status TEXT NOT NULL DEFAULT 'placed',
        total NUMERIC NOT NULL DEFAULT 0,
        subtotal NUMERIC NOT NULL DEFAULT 0,
        tax NUMERIC NOT NULL DEFAULT 0,
        rider_id TEXT,
        rider_name TEXT,
        waiter_id TEXT,
        waiter_name TEXT,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES nexa_orders(id) ON DELETE CASCADE,
        tenant_id TEXT NOT NULL,
        menu_item_id TEXT,
        name TEXT NOT NULL,
        category TEXT,
        qty NUMERIC NOT NULL DEFAULT 1,
        price NUMERIC NOT NULL DEFAULT 0,
        line_total NUMERIC NOT NULL DEFAULT 0,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_kds_settings (
        tenant_id TEXT PRIMARY KEY,
        settings JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_audit_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        action TEXT NOT NULL,
        actor TEXT,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS nexa_app_state_updated_at_idx ON nexa_app_state (updated_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_orders_tenant_created_idx ON nexa_orders (tenant_id, created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_orders_tenant_payment_idx ON nexa_orders (tenant_id, payment_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_orders_tenant_kitchen_idx ON nexa_orders (tenant_id, kitchen_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_orders_tenant_mode_idx ON nexa_orders (tenant_id, mode);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_order_items_order_idx ON nexa_order_items (order_id);`);
  } finally {
    client.release();
  }
}

async function migrateOrdersToTablesIfEmpty(seedDb) {
  if (!isSupabaseMode()) return;

  const db = normalizeDb(seedDb);
  if (!Array.isArray(db.orders) || db.orders.length === 0) return;

  const client = await getPool().connect();

  try {
    const count = await client.query("SELECT COUNT(*)::int AS count FROM nexa_orders");
    if (Number(count.rows[0]?.count || 0) > 0) return;

    for (const order of db.orders) {
      await upsertOrderWithClient(client, order);
    }

    console.log(`Migrated ${db.orders.length} existing JSON orders into nexa_orders tables.`);
  } finally {
    client.release();
  }
}

async function loadSupabaseDb() {
  await ensurePostgresSchema();

  const client = await getPool().connect();

  try {
    const result = await client.query(
      "SELECT data FROM nexa_app_state WHERE id = $1 LIMIT 1",
      ["main"]
    );

    if (result.rows.length > 0) {
      const db = normalizeDb(result.rows[0].data);
      await migrateOrdersToTablesIfEmpty(db);
      return db;
    }

    const localSeed = fs.existsSync(DB_PATH) ? readLocalDb() : initialData();

    await client.query(
      `
        INSERT INTO nexa_app_state (id, data, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `,
      ["main", JSON.stringify(localSeed)]
    );

    console.log("Supabase was empty. Local db.json migrated to Supabase app_state.");
    await migrateOrdersToTablesIfEmpty(localSeed);
    return normalizeDb(localSeed);
  } finally {
    client.release();
  }
}

async function persistSupabaseDb(data) {
  const clean = normalizeDb(clone(data));

  await ensurePostgresSchema();

  const client = await getPool().connect();

  try {
    await client.query(
      `
        INSERT INTO nexa_app_state (id, data, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `,
      ["main", JSON.stringify(clean)]
    );
  } finally {
    client.release();
  }
}

async function initDb() {
  if (initialized) return memoryDb;

  if (!isSupabaseMode()) {
    memoryDb = readLocalDb();
    initialized = true;
    console.log("Database provider: local JSON");
    return memoryDb;
  }

  memoryDb = await loadSupabaseDb();
  initialized = true;
  console.log("Database provider: Supabase/PostgreSQL with order tables");
  return memoryDb;
}

function readDb() {
  if (!initialized) {
    if (isSupabaseMode()) {
      throw new Error("Database is not initialized yet. Make sure initDb() runs before app.listen().");
    }

    memoryDb = readLocalDb();
    initialized = true;
  }

  return clone(memoryDb);
}

function writeDb(data) {
  const clean = normalizeDb(clone(data));
  memoryDb = clean;

  if (!isSupabaseMode()) {
    writeLocalDb(clean);
    return clean;
  }

  writeQueue = writeQueue
    .then(() => persistSupabaseDb(clean))
    .catch((error) => {
      console.error("Failed to persist Supabase app_state:", error);
    });

  return clean;
}

async function flushDbWrites() {
  await writeQueue;
}

function getNextLocalOrderNumber(db, tenantId) {
  const count = (db.orders || []).filter((order) => order.tenantId === tenantId).length;
  return `#${String(count + 1).padStart(4, "0")}`;
}

async function getNextOrderNumberForTenant(tenantId) {
  if (!isSupabaseMode()) {
    return getNextLocalOrderNumber(readDb(), tenantId);
  }

  const result = await getPool().query(
    "SELECT COUNT(*)::int AS count FROM nexa_orders WHERE tenant_id = $1",
    [tenantId]
  );

  return `#${String(Number(result.rows[0]?.count || 0) + 1).padStart(4, "0")}`;
}

async function upsertOrderWithClient(client, order) {
  const clean = clone(order);
  const items = Array.isArray(clean.items) ? clean.items : [];
  const now = new Date().toISOString();

  clean.id = clean.id || `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  clean.orderNo = clean.orderNo || `#${Date.now()}`;
  clean.createdAt = clean.createdAt || now;
  clean.updatedAt = clean.updatedAt || now;

  await client.query(
    `
      INSERT INTO nexa_orders (
        id, tenant_id, branch_id, order_no, created_by, mode, table_id, table_name,
        customer, phone, payment_method, payment_status, order_status, kitchen_status,
        total, subtotal, tax, rider_id, rider_name, waiter_id, waiter_name, raw, created_at, updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19,$20,$21,$22::jsonb,$23,$24
      )
      ON CONFLICT (id) DO UPDATE SET
        order_no = EXCLUDED.order_no,
        branch_id = EXCLUDED.branch_id,
        created_by = EXCLUDED.created_by,
        mode = EXCLUDED.mode,
        table_id = EXCLUDED.table_id,
        table_name = EXCLUDED.table_name,
        customer = EXCLUDED.customer,
        phone = EXCLUDED.phone,
        payment_method = EXCLUDED.payment_method,
        payment_status = EXCLUDED.payment_status,
        order_status = EXCLUDED.order_status,
        kitchen_status = EXCLUDED.kitchen_status,
        total = EXCLUDED.total,
        subtotal = EXCLUDED.subtotal,
        tax = EXCLUDED.tax,
        rider_id = EXCLUDED.rider_id,
        rider_name = EXCLUDED.rider_name,
        waiter_id = EXCLUDED.waiter_id,
        waiter_name = EXCLUDED.waiter_name,
        raw = EXCLUDED.raw,
        updated_at = NOW()
    `,
    [
      clean.id,
      clean.tenantId,
      clean.branchId || null,
      clean.orderNo,
      clean.createdBy || "",
      clean.mode || "",
      clean.tableId || clean.table?.id || null,
      clean.tableName || clean.table?.name || "",
      toJson(clean.customer || {}),
      clean.phone || "",
      clean.paymentMethod || "",
      clean.paymentStatus || "unpaid",
      clean.orderStatus || "placed",
      clean.kitchenStatus || "placed",
      Number(clean.total || 0),
      Number(clean.subtotal || 0),
      Number(clean.tax || 0),
      clean.riderId || clean.staff?.rider?.id || "",
      clean.riderName || clean.staff?.rider?.name || "",
      clean.waiterId || clean.staff?.waiter?.id || "",
      clean.waiterName || clean.staff?.waiter?.name || "",
      toJson(clean),
      clean.createdAt,
      clean.updatedAt
    ]
  );

  await client.query("DELETE FROM nexa_order_items WHERE order_id = $1", [clean.id]);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] || {};
    const qty = Number(item.qty || item.quantity || 1);
    const price = Number(item.price || 0);
    const itemId = item.lineId || `${clean.id}-item-${index}-${item.id || Date.now()}`;

    await client.query(
      `
        INSERT INTO nexa_order_items (
          id, order_id, tenant_id, menu_item_id, name, category, qty, price, line_total, raw, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW())
      `,
      [
        itemId,
        clean.id,
        clean.tenantId,
        item.id || item.menuItemId || "",
        item.name || "Item",
        item.category || "",
        qty,
        price,
        qty * price,
        toJson(item)
      ]
    );
  }

  return clean;
}

async function saveOrderRecord(order) {
  if (!isSupabaseMode()) {
    const db = readDb();
    db.orders = Array.isArray(db.orders) ? db.orders : [];
    const index = db.orders.findIndex((item) => item.id === order.id);
    if (index >= 0) db.orders[index] = order;
    else db.orders.push(order);
    writeDb(db);
    return order;
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const saved = await upsertOrderWithClient(client, order);
    await client.query("COMMIT");
    return saved;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getOrdersForTenant(tenantId, filters = {}) {
  if (!isSupabaseMode()) {
    let orders = (readDb().orders || []).filter((order) => order.tenantId === tenantId);
    if (filters.mode && filters.mode !== "all") orders = orders.filter((order) => order.mode === filters.mode);
    if (filters.paymentStatus && filters.paymentStatus !== "all") orders = orders.filter((order) => order.paymentStatus === filters.paymentStatus);
    if (filters.kitchenStatus && filters.kitchenStatus !== "all") orders = orders.filter((order) => order.kitchenStatus === filters.kitchenStatus);
    return orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  const params = [tenantId];
  const where = ["o.tenant_id = $1"];

  if (filters.mode && filters.mode !== "all") {
    params.push(filters.mode);
    where.push(`o.mode = $${params.length}`);
  }

  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    params.push(filters.paymentStatus);
    where.push(`o.payment_status = $${params.length}`);
  }

  if (filters.kitchenStatus && filters.kitchenStatus !== "all") {
    params.push(filters.kitchenStatus);
    where.push(`o.kitchen_status = $${params.length}`);
  }

  const limit = Math.min(500, Math.max(1, Number(filters.limit || 250)));
  params.push(limit);

  const result = await getPool().query(
    `
      SELECT
        o.*,
        COALESCE(
          json_agg(oi.raw ORDER BY oi.created_at) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM nexa_orders o
      LEFT JOIN nexa_order_items oi ON oi.order_id = o.id
      WHERE ${where.join(" AND ")}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $${params.length}
    `,
    params
  );

  return result.rows.map(normalizeOrderRow);
}

async function getKitchenOrdersForTenant(tenantId) {
  const orders = await getOrdersForTenant(tenantId, { limit: 300 });
  return orders
    .filter((order) => ["unconfirmed", "placed", "new", "preparing", "ready", "rider_picked", "rider_on_way", "rider_delivered", "cash_received"].includes(order.kitchenStatus))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

async function findOrderForTenant(tenantId, orderId) {
  const orders = await getOrdersForTenant(tenantId, { limit: 500 });
  return orders.find((order) => order.id === orderId || order.orderNo === orderId);
}

async function updateOrderRecord(tenantId, orderId, updater) {
  const order = await findOrderForTenant(tenantId, orderId);
  if (!order) return null;

  const updated = updater(order) || order;
  updated.updatedAt = new Date().toISOString();

  return saveOrderRecord(updated);
}

async function getKdsSettingsRecord(tenantId, defaults = {}) {
  if (!isSupabaseMode()) {
    const db = readDb();
    db.kdsSettings = Array.isArray(db.kdsSettings) ? db.kdsSettings : [];
    let settings = db.kdsSettings.find((item) => item.tenantId === tenantId);

    if (!settings) {
      settings = {
        id: `kds-settings-${tenantId}`,
        tenantId,
        ...defaults,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.kdsSettings.push(settings);
      writeDb(db);
    }

    return { ...defaults, ...settings };
  }

  const result = await getPool().query(
    "SELECT settings FROM nexa_kds_settings WHERE tenant_id = $1",
    [tenantId]
  );

  if (result.rows.length > 0) {
    return { ...defaults, ...result.rows[0].settings };
  }

  const settings = {
    id: `kds-settings-${tenantId}`,
    tenantId,
    ...defaults,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await getPool().query(
    `
      INSERT INTO nexa_kds_settings (tenant_id, settings, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (tenant_id)
      DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()
    `,
    [tenantId, JSON.stringify(settings)]
  );

  return settings;
}

async function saveKdsSettingsRecord(tenantId, settings) {
  if (!isSupabaseMode()) {
    const db = readDb();
    db.kdsSettings = Array.isArray(db.kdsSettings) ? db.kdsSettings : [];
    const index = db.kdsSettings.findIndex((item) => item.tenantId === tenantId);
    if (index >= 0) db.kdsSettings[index] = settings;
    else db.kdsSettings.push(settings);
    writeDb(db);
    return settings;
  }

  await getPool().query(
    `
      INSERT INTO nexa_kds_settings (tenant_id, settings, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (tenant_id)
      DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()
    `,
    [tenantId, JSON.stringify(settings)]
  );

  return settings;
}

async function addAuditLog(log) {
  const clean = {
    id: log.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tenantId: log.tenantId || null,
    action: log.action || "AUDIT",
    actor: log.actor || "",
    details: log.details || {},
    createdAt: log.createdAt || new Date().toISOString()
  };

  if (!isSupabaseMode()) {
    const db = readDb();
    db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
    db.auditLogs.push(clean);
    writeDb(db);
    return clean;
  }

  await getPool().query(
    `
      INSERT INTO nexa_audit_logs (id, tenant_id, action, actor, details, created_at)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6)
      ON CONFLICT (id) DO NOTHING
    `,
    [clean.id, clean.tenantId, clean.action, clean.actor, JSON.stringify(clean.details), clean.createdAt]
  );

  return clean;
}

function logAudit(action, actor, details = {}) {
  const db = readDb();

  db.auditLogs.push({
    id: cryptoRandomId(),
    action,
    actor,
    details,
    createdAt: new Date().toISOString()
  });

  writeDb(db);
}

function cryptoRandomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

module.exports = {
  initDb,
  readDb,
  writeDb,
  flushDbWrites,
  logAudit,
  getPool,
  isSupabaseMode,
  getNextOrderNumberForTenant,
  saveOrderRecord,
  getOrdersForTenant,
  getKitchenOrdersForTenant,
  findOrderForTenant,
  updateOrderRecord,
  getKdsSettingsRecord,
  saveKdsSettingsRecord,
  addAuditLog
};
