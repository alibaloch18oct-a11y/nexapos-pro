const fs = require("fs");
const path = require("path");

const root = "D:\\ShazeeProjects\\nexapos-pro";
const roleRoutes = path.join(root, "backend", "src", "routes", "roleAccessRoutes.js");
const saasPanel = path.join(root, "frontend", "src", "components", "SuperClientSaasPanel.jsx");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function backup(file) {
  fs.copyFileSync(file, `${file}.backup-fix-saas-client-id-${Date.now()}`);
}

function patchBackend() {
  backup(roleRoutes);
  let code = read(roleRoutes);

  if (!code.includes("function findTenantForSuperSetup")) {
    code = code.replace(
      "module.exports = function roleAccessRoutes({ readDb, writeDb, hashPassword }) {",
      `function findTenantForSuperSetup(db, tenantOrClientId) {
  const directTenant = db.tenants.find((item) => item.id === tenantOrClientId);
  if (directTenant) return directTenant;

  const clientUser = db.users.find((item) => item.id === tenantOrClientId);
  if (clientUser?.tenantId) {
    const tenant = db.tenants.find((item) => item.id === clientUser.tenantId);
    if (tenant) return tenant;
  }

  const tenantByClientUser = db.tenants.find(
    (item) => item.ownerUserId === tenantOrClientId || item.userId === tenantOrClientId || item.clientId === tenantOrClientId
  );
  if (tenantByClientUser) return tenantByClientUser;

  return null;
}

function resolveTenantIdForSuperSetup(db, tenantOrClientId) {
  const tenant = findTenantForSuperSetup(db, tenantOrClientId);
  return tenant?.id || tenantOrClientId;
}

module.exports = function roleAccessRoutes({ readDb, writeDb, hashPassword }) {`
    );
  }

  // Replace tenant lookup in super branch/user routes
  code = code.replaceAll(
    "const tenant = db.tenants.find((item) => item.id === tenantId);",
    "const tenant = findTenantForSuperSetup(db, tenantId);"
  );

  // Make branch filtering use resolved real tenant id
  code = code.replaceAll(
    ".filter((branch) => branch.tenantId === tenantId)",
    ".filter((branch) => branch.tenantId === resolveTenantIdForSuperSetup(db, tenantId))"
  );

  code = code.replaceAll(
    "branch.tenantId === tenantId &&",
    "branch.tenantId === resolveTenantIdForSuperSetup(db, tenantId) &&"
  );

  code = code.replaceAll(
    "branch.tenantId === tenantId",
    "branch.tenantId === resolveTenantIdForSuperSetup(db, tenantId)"
  );

  code = code.replaceAll(
    "user.tenantId === tenantId",
    "user.tenantId === resolveTenantIdForSuperSetup(db, tenantId)"
  );

  // Make new branch save with real tenant id
  code = code.replaceAll(
    "tenantId,",
    "tenantId,"
  );

  // Patch specific branch creation object safely
  code = code.replace(
    `const branch = {
      id: uuid(),
      tenantId,
      name,`,
    `const realTenantId = resolveTenantIdForSuperSetup(db, tenantId);

    const branch = {
      id: uuid(),
      tenantId: realTenantId,
      name,`
  );

  // Patch duplicate if branch object has already changed once
  code = code.replace(
    `const branch = {
      id: uuid(),
      tenantId: resolveTenantIdForSuperSetup(db, tenantId),
      name,`,
    `const realTenantId = resolveTenantIdForSuperSetup(db, tenantId);

    const branch = {
      id: uuid(),
      tenantId: realTenantId,
      name,`
  );

  // Patch new user tenantId to real tenant id
  code = code.replace(
    `const user = {
        id: uuid(),
        tenantId,`,
    `const realTenantId = resolveTenantIdForSuperSetup(db, tenantId);

      const user = {
        id: uuid(),
        tenantId: realTenantId,`
  );

  // Avoid duplicate const realTenantId inside same function from multiple runs
  code = code.replaceAll(
    "const realTenantId = resolveTenantIdForSuperSetup(db, tenantId);\n\n    const realTenantId = resolveTenantIdForSuperSetup(db, tenantId);",
    "const realTenantId = resolveTenantIdForSuperSetup(db, tenantId);"
  );

  code = code.replaceAll(
    "const realTenantId = resolveTenantIdForSuperSetup(db, tenantId);\n\n      const realTenantId = resolveTenantIdForSuperSetup(db, tenantId);",
    "const realTenantId = resolveTenantIdForSuperSetup(db, tenantId);"
  );

  write(roleRoutes, code);
}

function patchFrontend() {
  backup(saasPanel);
  let code = read(saasPanel);

  if (!code.includes("const setupClientId")) {
    code = code.replace(
      "export default function SuperClientSaasPanel({ token, client, onBack }) {",
      `export default function SuperClientSaasPanel({ token, client, onBack }) {
  const setupClientId = client?.tenantId || client?.tenant?.id || client?.id;`
    );
  }

  code = code.replaceAll("client.id", "setupClientId");

  // Keep display client.id untouched where needed? Not required here because setupClientId is the correct API id.
  write(saasPanel, code);
}

patchBackend();
patchFrontend();

console.log("SaaS client ID fix installed.");
console.log("Now run backend checks and frontend build.");