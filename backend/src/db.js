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
    subscriptionPayments: []
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
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000
    });
  }

  return pool;
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
      CREATE INDEX IF NOT EXISTS nexa_app_state_updated_at_idx
      ON nexa_app_state (updated_at);
    `);
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
      return normalizeDb(result.rows[0].data);
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

    console.log("Supabase was empty. Local db.json migrated to Supabase.");
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
  console.log("Database provider: Supabase/PostgreSQL");
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
      console.error("Failed to persist Supabase database:", error);
    });

  return clean;
}

async function flushDbWrites() {
  await writeQueue;
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
  logAudit
};