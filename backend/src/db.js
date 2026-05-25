const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

function ensureDbFile() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      tenants: [],
      users: [],
      branches: [],
      modules: [],
      orders: [],
      menuItems: [],
      tables: [],
      auditLogs: []
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

function readDb() {
  ensureDbFile();

  const raw = fs.readFileSync(DB_PATH, "utf-8");

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Database JSON is corrupted:", error);
    throw new Error("Database file is corrupted.");
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  return data;
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
  readDb,
  writeDb,
  logAudit
};