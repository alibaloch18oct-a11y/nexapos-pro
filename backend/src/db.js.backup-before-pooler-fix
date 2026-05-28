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
      max: Number(process.env.PG_POOL_MAX || 20),
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_order_counters (
        tenant_id TEXT PRIMARY KEY,
        current_number INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_tenants (
        id TEXT PRIMARY KEY,
        restaurant_name TEXT,
        owner_name TEXT,
        slug TEXT,
        phone TEXT,
        email TEXT,
        package_name TEXT,
        status TEXT,
        subscription_status TEXT,
        payment_status TEXT,
        expiry_date TEXT,
        enabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        branch_id TEXT,
        name TEXT,
        username TEXT UNIQUE,
        password_hash TEXT,
        role TEXT,
        phone TEXT,
        email TEXT,
        status TEXT,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_branches (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT,
        address TEXT,
        phone TEXT,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_modules (
        key TEXT PRIMARY KEY,
        label TEXT,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_menu_categories (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        branch_id TEXT,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_menu_items (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        branch_id TEXT,
        category_id TEXT,
        category TEXT,
        name TEXT NOT NULL,
        subtitle TEXT,
        price NUMERIC DEFAULT 0,
        sku TEXT,
        emoji TEXT,
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        is_available BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_tables (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        branch_id TEXT,
        name TEXT,
        floor TEXT,
        shape TEXT,
        chairs INTEGER DEFAULT 4,
        x NUMERIC DEFAULT 0,
        y NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'available',
        guests INTEGER DEFAULT 0,
        order_no TEXT,
        staff TEXT,
        total NUMERIC DEFAULT 0,
        current_order_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_staff (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        branch_id TEXT,
        name TEXT NOT NULL,
        role TEXT,
        phone TEXT,
        email TEXT,
        is_active BOOLEAN DEFAULT true,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_customers (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        points NUMERIC DEFAULT 0,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nexa_inventory_items (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        branch_id TEXT,
        menu_item_id TEXT,
        name TEXT NOT NULL,
        sku TEXT,
        unit TEXT,
        category TEXT,
        current_stock NUMERIC DEFAULT 0,
        low_stock_alert NUMERIC DEFAULT 0,
        cost_price NUMERIC DEFAULT 0,
        sale_price NUMERIC DEFAULT 0,
        track_stock BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);


    await client.query(`CREATE INDEX IF NOT EXISTS nexa_app_state_updated_at_idx ON nexa_app_state (updated_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_orders_tenant_created_idx ON nexa_orders (tenant_id, created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_orders_tenant_payment_idx ON nexa_orders (tenant_id, payment_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_orders_tenant_kitchen_idx ON nexa_orders (tenant_id, kitchen_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_orders_tenant_mode_idx ON nexa_orders (tenant_id, mode);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_order_items_order_idx ON nexa_order_items (order_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_tenants_status_idx ON nexa_tenants (status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_users_tenant_idx ON nexa_users (tenant_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_menu_items_tenant_idx ON nexa_menu_items (tenant_id, is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_tables_tenant_idx ON nexa_tables (tenant_id, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_staff_tenant_idx ON nexa_staff (tenant_id, is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_customers_tenant_idx ON nexa_customers (tenant_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS nexa_inventory_tenant_idx ON nexa_inventory_items (tenant_id);`);
  } finally {
    client.release();
  }
}


async function syncCoreTablesFromAppState(seedDb) {
  if (!isSupabaseMode()) return;

  const db = normalizeDb(seedDb);
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    for (const tenant of db.tenants || []) {
      await client.query(
        `
          INSERT INTO nexa_tenants (
            id, restaurant_name, owner_name, slug, phone, email, package_name,
            status, subscription_status, payment_status, expiry_date, enabled_modules, raw, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15)
          ON CONFLICT (id) DO UPDATE SET
            restaurant_name = EXCLUDED.restaurant_name,
            owner_name = EXCLUDED.owner_name,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            package_name = EXCLUDED.package_name,
            status = EXCLUDED.status,
            subscription_status = EXCLUDED.subscription_status,
            payment_status = EXCLUDED.payment_status,
            expiry_date = EXCLUDED.expiry_date,
            enabled_modules = EXCLUDED.enabled_modules,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `,
        [
          tenant.id,
          tenant.restaurantName || tenant.restaurant_name || "",
          tenant.ownerName || tenant.owner_name || "",
          tenant.slug || tenant.id,
          tenant.phone || "",
          tenant.email || "",
          tenant.packageName || tenant.package_name || "",
          tenant.status || "active",
          tenant.subscriptionStatus || tenant.subscription_status || "active",
          tenant.paymentStatus || tenant.payment_status || "trial",
          tenant.expiryDate || tenant.expiry_date || "",
          JSON.stringify(tenant.enabledModules || []),
          JSON.stringify(tenant),
          tenant.createdAt || new Date().toISOString(),
          tenant.updatedAt || new Date().toISOString()
        ]
      );
    }

    for (const user of db.users || []) {
      await client.query(
        `
          INSERT INTO nexa_users (
            id, tenant_id, branch_id, name, username, password_hash, role, phone, email, status, raw, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)
          ON CONFLICT (id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            branch_id = EXCLUDED.branch_id,
            name = EXCLUDED.name,
            username = EXCLUDED.username,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            status = EXCLUDED.status,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `,
        [
          user.id,
          user.tenantId || user.tenant_id || null,
          user.branchId || user.branch_id || null,
          user.name || "",
          user.username || "",
          user.passwordHash || user.password_hash || "",
          user.role || "owner",
          user.phone || "",
          user.email || "",
          user.status || "active",
          JSON.stringify(user),
          user.createdAt || new Date().toISOString(),
          user.updatedAt || new Date().toISOString()
        ]
      );
    }

    for (const branch of db.branches || []) {
      await client.query(
        `
          INSERT INTO nexa_branches (id, tenant_id, name, address, phone, raw, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            phone = EXCLUDED.phone,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `,
        [
          branch.id,
          branch.tenantId || branch.tenant_id,
          branch.name || "",
          branch.address || "",
          branch.phone || "",
          JSON.stringify(branch),
          branch.createdAt || new Date().toISOString(),
          branch.updatedAt || new Date().toISOString()
        ]
      );
    }

    for (const module of db.modules || []) {
      await client.query(
        `
          INSERT INTO nexa_modules (key, label, raw, updated_at)
          VALUES ($1,$2,$3::jsonb,NOW())
          ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, raw = EXCLUDED.raw, updated_at = NOW()
        `,
        [module.key, module.label || module.name || module.key, JSON.stringify(module)]
      );
    }

    for (const category of db.menuCategories || []) {
      await client.query(
        `
          INSERT INTO nexa_menu_categories (id, tenant_id, branch_id, name, sort_order, is_active, raw, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            sort_order = EXCLUDED.sort_order,
            is_active = EXCLUDED.is_active,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `,
        [
          category.id,
          category.tenantId || category.tenant_id,
          category.branchId || category.branch_id || null,
          category.name || "",
          Number(category.sortOrder || category.sort_order || 0),
          category.isActive !== false,
          JSON.stringify(category),
          category.createdAt || new Date().toISOString(),
          category.updatedAt || new Date().toISOString()
        ]
      );
    }

    for (const item of db.menuItems || []) {
      await client.query(
        `
          INSERT INTO nexa_menu_items (
            id, tenant_id, branch_id, category_id, category, name, subtitle, price, sku,
            emoji, image_url, is_active, is_available, sort_order, raw, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17)
          ON CONFLICT (id) DO UPDATE SET
            category_id = EXCLUDED.category_id,
            category = EXCLUDED.category,
            name = EXCLUDED.name,
            subtitle = EXCLUDED.subtitle,
            price = EXCLUDED.price,
            sku = EXCLUDED.sku,
            emoji = EXCLUDED.emoji,
            image_url = EXCLUDED.image_url,
            is_active = EXCLUDED.is_active,
            is_available = EXCLUDED.is_available,
            sort_order = EXCLUDED.sort_order,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `,
        [
          item.id,
          item.tenantId || item.tenant_id,
          item.branchId || item.branch_id || null,
          item.categoryId || item.category_id || null,
          item.category || "",
          item.name || "",
          item.subtitle || "",
          Number(item.price || 0),
          item.sku || "",
          item.emoji || "",
          item.imageUrl || item.image_url || "",
          item.isActive !== false,
          item.isAvailable !== false,
          Number(item.sortOrder || item.sort_order || 0),
          JSON.stringify(item),
          item.createdAt || new Date().toISOString(),
          item.updatedAt || new Date().toISOString()
        ]
      );
    }

    for (const table of db.tables || []) {
      await client.query(
        `
          INSERT INTO nexa_tables (
            id, tenant_id, branch_id, name, floor, shape, chairs, x, y, status, guests,
            order_no, staff, total, current_order_ids, raw, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$18)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            floor = EXCLUDED.floor,
            shape = EXCLUDED.shape,
            chairs = EXCLUDED.chairs,
            x = EXCLUDED.x,
            y = EXCLUDED.y,
            status = EXCLUDED.status,
            guests = EXCLUDED.guests,
            order_no = EXCLUDED.order_no,
            staff = EXCLUDED.staff,
            total = EXCLUDED.total,
            current_order_ids = EXCLUDED.current_order_ids,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `,
        [
          table.id,
          table.tenantId || table.tenant_id,
          table.branchId || table.branch_id || null,
          table.name || "",
          table.floor || "",
          table.shape || "rect",
          Number(table.chairs || 4),
          Number(table.x || 0),
          Number(table.y || 0),
          table.status || "available",
          Number(table.guests || 0),
          table.orderNo || table.order_no || "",
          table.staff || "",
          Number(table.total || 0),
          JSON.stringify(table.currentOrderIds || table.current_order_ids || []),
          JSON.stringify(table),
          table.createdAt || new Date().toISOString(),
          table.updatedAt || new Date().toISOString()
        ]
      );
    }

    for (const item of db.staff || []) {
      await client.query(
        `
          INSERT INTO nexa_staff (id, tenant_id, branch_id, name, role, phone, email, is_active, raw, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            is_active = EXCLUDED.is_active,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `,
        [
          item.id,
          item.tenantId || item.tenant_id,
          item.branchId || item.branch_id || null,
          item.name || "",
          item.role || item.type || "",
          item.phone || "",
          item.email || "",
          item.isActive !== false,
          JSON.stringify(item),
          item.createdAt || new Date().toISOString(),
          item.updatedAt || new Date().toISOString()
        ]
      );
    }

    for (const customer of db.customers || []) {
      await client.query(
        `
          INSERT INTO nexa_customers (id, tenant_id, name, phone, email, address, points, raw, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            address = EXCLUDED.address,
            points = EXCLUDED.points,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `,
        [
          customer.id,
          customer.tenantId || customer.tenant_id,
          customer.name || customer.customerName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
          customer.phone || "",
          customer.email || "",
          customer.address || "",
          Number(customer.points || customer.loyaltyPoints || 0),
          JSON.stringify(customer),
          customer.createdAt || new Date().toISOString(),
          customer.updatedAt || new Date().toISOString()
        ]
      );
    }

    for (const item of db.inventoryItems || []) {
      await client.query(
        `
          INSERT INTO nexa_inventory_items (
            id, tenant_id, branch_id, menu_item_id, name, sku, unit, category,
            current_stock, low_stock_alert, cost_price, sale_price, track_stock, is_active, raw, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            sku = EXCLUDED.sku,
            unit = EXCLUDED.unit,
            category = EXCLUDED.category,
            current_stock = EXCLUDED.current_stock,
            low_stock_alert = EXCLUDED.low_stock_alert,
            cost_price = EXCLUDED.cost_price,
            sale_price = EXCLUDED.sale_price,
            track_stock = EXCLUDED.track_stock,
            is_active = EXCLUDED.is_active,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `,
        [
          item.id,
          item.tenantId || item.tenant_id,
          item.branchId || item.branch_id || null,
          item.menuItemId || item.menu_item_id || null,
          item.name || "",
          item.sku || "",
          item.unit || "pcs",
          item.category || "",
          Number(item.currentStock || item.current_stock || 0),
          Number(item.lowStockAlert || item.low_stock_alert || 0),
          Number(item.costPrice || item.cost_price || 0),
          Number(item.salePrice || item.sale_price || 0),
          item.trackStock !== false,
          item.isActive !== false,
          JSON.stringify(item),
          item.createdAt || new Date().toISOString(),
          item.updatedAt || new Date().toISOString()
        ]
      );
    }

    await client.query("COMMIT");
    console.log("Core app_state data synced into PostgreSQL SaaS tables.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to sync core tables from app_state:", error);
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
      await syncCoreTablesFromAppState(db);
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
    await syncCoreTablesFromAppState(localSeed);
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
    `
      INSERT INTO nexa_order_counters (tenant_id, current_number, updated_at)
      VALUES ($1, 1, NOW())
      ON CONFLICT (tenant_id)
      DO UPDATE SET current_number = nexa_order_counters.current_number + 1, updated_at = NOW()
      RETURNING current_number
    `,
    [tenantId]
  );

  return `#${String(Number(result.rows[0]?.current_number || 1)).padStart(4, "0")}`;
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
  if (!isSupabaseMode()) {
    const orders = await getOrdersForTenant(tenantId, { limit: 300 });
    return orders
      .filter((order) => ["unconfirmed", "placed", "new", "preparing", "ready", "rider_picked", "rider_on_way", "rider_delivered", "cash_received"].includes(order.kitchenStatus))
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }

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
      WHERE
        o.tenant_id = $1
        AND o.payment_status <> 'cancelled'
        AND o.order_status <> 'cancelled'
        AND o.kitchen_status IN ('unconfirmed','placed','new','preparing','ready','rider_picked','rider_on_way','rider_delivered','cash_received')
      GROUP BY o.id
      ORDER BY o.created_at ASC
      LIMIT 300
    `,
    [tenantId]
  );

  return result.rows.map(normalizeOrderRow);
}

async function findOrderForTenant(tenantId, orderId) {
  if (!isSupabaseMode()) {
    const orders = await getOrdersForTenant(tenantId, { limit: 500 });
    return orders.find((order) => order.id === orderId || order.orderNo === orderId);
  }

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
      WHERE o.tenant_id = $1 AND (o.id = $2 OR o.order_no = $2)
      GROUP BY o.id
      LIMIT 1
    `,
    [tenantId, orderId]
  );

  return normalizeOrderRow(result.rows[0]);
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


