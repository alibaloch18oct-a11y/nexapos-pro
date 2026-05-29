const fs = require("fs");
const path = require("path");

const root = "D:\\ShazeeProjects\\nexapos-pro";
const backendRoleRoutes = path.join(root, "backend", "src", "routes", "roleAccessRoutes.js");
const superPanel = path.join(root, "frontend", "src", "components", "SuperClientSaasPanel.jsx");
const superAdmin = path.join(root, "frontend", "src", "components", "SuperAdminDashboard.jsx");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function backup(file) {
  const backupPath = `${file}.backup-before-final-saas-${Date.now()}`;
  fs.copyFileSync(file, backupPath);
  console.log("Backup:", backupPath);
}

function patchBackend() {
  backup(backendRoleRoutes);
  let code = read(backendRoleRoutes);

  const backendRoutes = `

  router.get("/super/tenants/:tenantId/branches", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());
    const { tenantId } = req.params;

    const tenant = db.tenants.find((item) => item.id === tenantId);

    if (!tenant) {
      return res.status(404).json({ message: "Restaurant client not found." });
    }

    const branches = db.branches
      .filter((branch) => branch.tenantId === tenantId)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    res.json({ tenant, branches });
  });

  router.post("/super/tenants/:tenantId/branches", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());
    const { tenantId } = req.params;
    const { name, city, address, phone, status } = req.body;

    const tenant = db.tenants.find((item) => item.id === tenantId);

    if (!tenant) {
      return res.status(404).json({ message: "Restaurant client not found." });
    }

    if (!name) {
      return res.status(400).json({ message: "Branch name is required." });
    }

    const exists = db.branches.some(
      (branch) =>
        branch.tenantId === tenantId &&
        String(branch.name || "").toLowerCase() === String(name).toLowerCase()
    );

    if (exists) {
      return res.status(409).json({ message: "Branch already exists for this restaurant." });
    }

    const branch = {
      id: uuid(),
      tenantId,
      name,
      city: city || "",
      address: address || "",
      phone: phone || "",
      status: status || "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.branches.push(branch);

    makeAudit(db, "SUPER_BRANCH_CREATED", req.user.username, {
      tenantId,
      tenantName: tenant.restaurantName,
      branchId: branch.id,
      branchName: branch.name
    });

    writeDb(db);

    res.status(201).json({
      message: "Branch created successfully.",
      branch
    });
  });

  router.patch("/super/tenants/:tenantId/branches/:branchId", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());
    const { tenantId, branchId } = req.params;
    const { name, city, address, phone, status } = req.body;

    const branch = db.branches.find(
      (item) => item.tenantId === tenantId && item.id === branchId
    );

    if (!branch) {
      return res.status(404).json({ message: "Branch not found." });
    }

    branch.name = name || branch.name;
    branch.city = city ?? branch.city;
    branch.address = address ?? branch.address;
    branch.phone = phone ?? branch.phone;
    branch.status = status || branch.status;
    branch.updatedAt = new Date().toISOString();

    makeAudit(db, "SUPER_BRANCH_UPDATED", req.user.username, {
      tenantId,
      branchId,
      branchName: branch.name
    });

    writeDb(db);

    res.json({
      message: "Branch updated successfully.",
      branch
    });
  });

  router.get("/super/tenants/:tenantId/users", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());
    const { tenantId } = req.params;

    const tenant = db.tenants.find((item) => item.id === tenantId);

    if (!tenant) {
      return res.status(404).json({ message: "Restaurant client not found." });
    }

    const users = db.users
      .filter((user) => user.tenantId === tenantId)
      .map(cleanUser)
      .sort((a, b) => String(a.name || a.username || "").localeCompare(String(b.name || b.username || "")));

    res.json({ tenant, users });
  });

  router.post("/super/tenants/:tenantId/users", requireSuperAdmin, async (req, res) => {
    try {
      const db = ensureCollections(readDb());
      const { tenantId } = req.params;
      const { name, username, password, role, branchId, phone, email, permissions } = req.body;

      const tenant = db.tenants.find((item) => item.id === tenantId);

      if (!tenant) {
        return res.status(404).json({ message: "Restaurant client not found." });
      }

      if (!name || !username || !password || !role) {
        return res.status(400).json({ message: "Name, username, password and role are required." });
      }

      if (!ROLE_PERMISSIONS[role]) {
        return res.status(400).json({ message: "Invalid role." });
      }

      if (role !== "owner" && !branchId) {
        return res.status(400).json({ message: "Branch is required for staff/manager logins." });
      }

      const exists = db.users.some(
        (user) => String(user.username || "").toLowerCase() === String(username).toLowerCase()
      );

      if (exists) {
        return res.status(409).json({ message: "Username already exists." });
      }

      if (branchId) {
        const branch = db.branches.find(
          (item) => item.tenantId === tenantId && item.id === branchId
        );

        if (!branch) {
          return res.status(404).json({ message: "Branch not found for this restaurant." });
        }
      }

      const passwordHash = await hashPassword(password);

      const user = {
        id: uuid(),
        tenantId,
        branchId: role === "owner" ? null : branchId,
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

      makeAudit(db, "SUPER_USER_CREATED", req.user.username, {
        tenantId,
        tenantName: tenant.restaurantName,
        userId: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branchId
      });

      writeDb(db);

      res.status(201).json({
        message: "Login created successfully.",
        user: cleanUser(user),
        login: { username, password }
      });
    } catch (error) {
      console.error("Super create user error:", error);
      res.status(500).json({ message: "Failed to create login.", error: error.message });
    }
  });

  router.patch("/super/tenants/:tenantId/users/:userId", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());
    const { tenantId, userId } = req.params;
    const { name, role, branchId, phone, email, status, permissions } = req.body;

    const user = db.users.find(
      (item) => item.tenantId === tenantId && item.id === userId
    );

    if (!user) {
      return res.status(404).json({ message: "Login not found." });
    }

    if (role && !ROLE_PERMISSIONS[role]) {
      return res.status(400).json({ message: "Invalid role." });
    }

    user.name = name || user.name;
    user.role = role || user.role;
    user.branchId = user.role === "owner" ? null : branchId || user.branchId;
    user.phone = phone ?? user.phone;
    user.email = email ?? user.email;
    user.status = status || user.status;
    user.permissions = {
      ...defaultPermissions(user.role),
      ...(user.permissions || {}),
      ...(permissions || {})
    };
    user.updatedAt = new Date().toISOString();

    makeAudit(db, "SUPER_USER_UPDATED", req.user.username, {
      tenantId,
      userId: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId
    });

    writeDb(db);

    res.json({
      message: "Login updated successfully.",
      user: cleanUser(user)
    });
  });

`;

  if (!code.includes('/super/tenants/:tenantId/users')) {
    code = code.replace("  return router;", backendRoutes + "\n  return router;");
  }

  write(backendRoleRoutes, code);
}

function createFrontendPanel() {
  const component = `
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const ROLES = [
  { value: "owner", label: "Restaurant Owner" },
  { value: "branch_manager", label: "Branch Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "waiter", label: "Waiter" },
  { value: "kitchen", label: "Kitchen Staff" },
  { value: "rider", label: "Delivery Rider" }
];

function roleName(role) {
  return ROLES.find((item) => item.value === role)?.label || role || "User";
}

export default function SuperClientSaasPanel({ token, client, onBack }) {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [tenant, setTenant] = useState(client || null);
  const [loading, setLoading] = useState(true);
  const [savingBranch, setSavingBranch] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const [branchForm, setBranchForm] = useState({
    name: "",
    city: "",
    address: "",
    phone: ""
  });

  const [userForm, setUserForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "owner",
    branchId: "",
    phone: "",
    email: "",
    canEditOrders: true
  });

  const branchById = useMemo(() => {
    const map = {};
    branches.forEach((branch) => {
      map[branch.id] = branch;
    });
    return map;
  }, [branches]);

  async function loadAll() {
    if (!client?.id) return;

    setLoading(true);

    try {
      const [branchRes, userRes] = await Promise.all([
        api(token).get(\`/api/role-access/super/tenants/\${client.id}/branches\`),
        api(token).get(\`/api/role-access/super/tenants/\${client.id}/users\`)
      ]);

      setTenant(branchRes.data.tenant || userRes.data.tenant || client);
      setBranches(branchRes.data.branches || []);
      setUsers(userRes.data.users || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load SaaS setup.");
      setBranches([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [client?.id]);

  useEffect(() => {
    if (userForm.role !== "owner" && !userForm.branchId && branches[0]?.id) {
      setUserForm((prev) => ({ ...prev, branchId: branches[0].id }));
    }
  }, [branches, userForm.role]);

  async function createBranch(event) {
    event.preventDefault();

    if (!branchForm.name.trim()) {
      alert("Branch name is required.");
      return;
    }

    setSavingBranch(true);

    try {
      await api(token).post(\`/api/role-access/super/tenants/\${client.id}/branches\`, {
        name: branchForm.name.trim(),
        city: branchForm.city.trim(),
        address: branchForm.address.trim(),
        phone: branchForm.phone.trim()
      });

      setBranchForm({ name: "", city: "", address: "", phone: "" });
      await loadAll();
      alert("Branch created.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create branch.");
    } finally {
      setSavingBranch(false);
    }
  }

  async function createLogin(event) {
    event.preventDefault();

    if (!userForm.name || !userForm.username || !userForm.password || !userForm.role) {
      alert("Name, username, password and role are required.");
      return;
    }

    if (userForm.role !== "owner" && !userForm.branchId) {
      alert("Select branch for staff/manager login.");
      return;
    }

    setSavingUser(true);

    try {
      await api(token).post(\`/api/role-access/super/tenants/\${client.id}/users\`, {
        name: userForm.name.trim(),
        username: userForm.username.trim(),
        password: userForm.password,
        role: userForm.role,
        branchId: userForm.role === "owner" ? null : userForm.branchId,
        phone: userForm.phone,
        email: userForm.email,
        permissions: {
          canEditOrders: Boolean(userForm.canEditOrders),
          canUsePOS: ["owner", "branch_manager", "cashier", "waiter"].includes(userForm.role),
          canUseKDS: ["owner", "branch_manager", "kitchen"].includes(userForm.role),
          canUseDelivery: ["owner", "branch_manager", "rider"].includes(userForm.role),
          canViewCosts: userForm.role === "owner",
          canViewProfitLoss: userForm.role === "owner",
          canViewPurchases: userForm.role === "owner"
        }
      });

      setUserForm({
        name: "",
        username: "",
        password: "",
        role: "owner",
        branchId: branches[0]?.id || "",
        phone: "",
        email: "",
        canEditOrders: true
      });

      await loadAll();
      alert("Login created.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create login.");
    } finally {
      setSavingUser(false);
    }
  }

  async function toggleUser(user) {
    try {
      await api(token).patch(\`/api/role-access/super/tenants/\${client.id}/users/\${user.id}\`, {
        status: user.status === "inactive" ? "active" : "inactive"
      });

      await loadAll();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update login.");
    }
  }

  return (
    <div className="saas-final-page">
      <style>{\`
        .saas-final-page {
          min-height: 100vh;
          padding: 18px;
          color: white;
          background:
            radial-gradient(circle at 12% 18%, rgba(34,211,238,.14), transparent 30%),
            radial-gradient(circle at 88% 12%, rgba(168,85,247,.18), transparent 30%),
            linear-gradient(135deg,#020617,#0f172a);
        }

        .sf-head,
        .sf-panel,
        .sf-card {
          border-radius: 28px;
          background: rgba(15,23,42,.78);
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: 0 22px 60px rgba(0,0,0,.24);
          backdrop-filter: blur(18px);
        }

        .sf-head {
          padding: 18px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .sf-title {
          margin: 10px 0 0;
          font-size: 36px;
          font-weight: 1000;
          letter-spacing: -.04em;
        }

        .sf-sub {
          margin: 8px 0 0;
          color: #94a3b8;
          font-weight: 750;
        }

        .sf-back,
        .sf-primary,
        .sf-soft {
          height: 44px;
          border: 0;
          border-radius: 16px;
          padding: 0 14px;
          font-weight: 1000;
          color: white;
          cursor: pointer;
        }

        .sf-back,
        .sf-soft {
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.12);
        }

        .sf-primary {
          background: linear-gradient(135deg,#06b6d4,#2563eb);
        }

        .sf-layout {
          display: grid;
          grid-template-columns: minmax(320px, 390px) minmax(320px, 390px) minmax(0, 1fr);
          gap: 14px;
        }

        .sf-panel {
          padding: 16px;
          min-width: 0;
        }

        .sf-form {
          display: grid;
          gap: 10px;
        }

        .sf-input,
        .sf-select {
          width: 100%;
          height: 46px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.12);
          background: #020617;
          color: white;
          padding: 0 13px;
          outline: none;
          font-weight: 850;
        }

        .sf-select option {
          background: #020617;
          color: white;
        }

        .sf-check {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px;
          border-radius: 16px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.1);
          font-weight: 850;
        }

        .sf-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }

        .sf-card {
          padding: 15px;
          min-width: 0;
          overflow: hidden;
        }

        .sf-card h3 {
          margin: 0;
          font-size: 19px;
          font-weight: 1000;
          word-break: break-word;
        }

        .sf-card p {
          margin: 6px 0;
          color: #94a3b8;
          font-weight: 800;
          word-break: break-word;
        }

        .sf-badge {
          display: inline-flex;
          margin: 8px 6px 0 0;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(34,211,238,.12);
          border: 1px solid rgba(34,211,238,.22);
          color: #a5f3fc;
          font-size: 12px;
          font-weight: 1000;
        }

        .sf-badge.warn {
          background: rgba(250,204,21,.12);
          border-color: rgba(250,204,21,.22);
          color: #fde68a;
        }

        @media (max-width: 1250px) {
          .sf-layout {
            grid-template-columns: 1fr;
          }

          .sf-head {
            flex-direction: column;
          }
        }
      \`}</style>

      <header className="sf-head">
        <div>
          <button className="sf-back" onClick={onBack}>Back</button>
          <h1 className="sf-title">Complete SaaS Setup</h1>
          <p className="sf-sub">
            {tenant?.restaurantName || client?.restaurantName || "Restaurant"} - branches, owner login, managers and staff logins.
          </p>
        </div>

        <button className="sf-primary" onClick={loadAll}>Refresh</button>
      </header>

      <div className="sf-layout">
        <section className="sf-panel">
          <h2 style={{ marginTop: 0 }}>1. Create Branch</h2>
          <form className="sf-form" onSubmit={createBranch}>
            <input className="sf-input" placeholder="Branch name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
            <input className="sf-input" placeholder="City" value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} />
            <input className="sf-input" placeholder="Address" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
            <input className="sf-input" placeholder="Phone" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
            <button className="sf-primary" type="submit" disabled={savingBranch}>
              {savingBranch ? "Creating..." : "Create Branch"}
            </button>
          </form>

          <div style={{ height: 16 }} />

          <h2>Branches</h2>
          {branches.length === 0 ? (
            <div className="sf-card">No branches yet.</div>
          ) : branches.map((branch) => (
            <div className="sf-card" key={branch.id} style={{ marginBottom: 10 }}>
              <h3>{branch.name}</h3>
              <p>{branch.city || "No city"}</p>
              <p>{branch.address || "No address"}</p>
              <span className="sf-badge">{branch.status || "active"}</span>
            </div>
          ))}
        </section>

        <section className="sf-panel">
          <h2 style={{ marginTop: 0 }}>2. Create Login</h2>
          <form className="sf-form" onSubmit={createLogin}>
            <input className="sf-input" placeholder="Full name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            <input className="sf-input" placeholder="Username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
            <input className="sf-input" placeholder="Password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />

            <select className="sf-select" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
              {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>

            {userForm.role !== "owner" ? (
              <select className="sf-select" value={userForm.branchId} onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value })}>
                <option value="">Select Branch</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            ) : null}

            <input className="sf-input" placeholder="Phone" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
            <input className="sf-input" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />

            <label className="sf-check">
              <input type="checkbox" checked={userForm.canEditOrders} onChange={(e) => setUserForm({ ...userForm, canEditOrders: e.target.checked })} />
              Allow order edit
            </label>

            <button className="sf-primary" type="submit" disabled={savingUser}>
              {savingUser ? "Creating..." : "Create Login"}
            </button>
          </form>
        </section>

        <section className="sf-panel">
          <h2 style={{ marginTop: 0 }}>Created Logins</h2>
          {loading ? (
            <div className="sf-card">Loading SaaS setup...</div>
          ) : users.length === 0 ? (
            <div className="sf-card">No logins created yet.</div>
          ) : (
            <div className="sf-grid">
              {users.map((user) => (
                <div className="sf-card" key={user.id || user.username}>
                  <h3>{user.name || user.username}</h3>
                  <p>@{user.username}</p>
                  <p>{roleName(user.role)}</p>
                  <span className="sf-badge">{user.role === "owner" ? "All Branches" : branchById[user.branchId]?.name || "No Branch"}</span>
                  <span className={user.status === "inactive" ? "sf-badge warn" : "sf-badge"}>{user.status || "active"}</span>
                  <div style={{ marginTop: 12 }}>
                    <button className="sf-soft" onClick={() => toggleUser(user)}>
                      {user.status === "inactive" ? "Activate" : "Disable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
`;

  write(superPanel, component);
}

function patchSuperAdmin() {
  backup(superAdmin);
  let code = read(superAdmin);

  if (!code.includes('SuperClientSaasPanel')) {
    code = code.replace(
      'import React, { useEffect, useMemo, useState } from "react";',
      'import React, { useEffect, useMemo, useState } from "react";\nimport SuperClientSaasPanel from "./SuperClientSaasPanel";'
    );
  }

  if (!code.includes('saasClient, setSaasClient')) {
    code = code.replace(
      'const [loading, setLoading] = useState(true);',
      'const [loading, setLoading] = useState(true);\n  const [saasClient, setSaasClient] = useState(null);'
    );
  }

  if (!code.includes('if (saasClient)')) {
    code = code.replace(
      'return (',
      `if (saasClient) {
    return (
      <SuperClientSaasPanel
        token={token}
        client={saasClient}
        onBack={() => setSaasClient(null)}
      />
    );
  }

  return (`,
      1
    );
  }

  if (!code.includes('SaaS Setup')) {
    code = code.replace(
      '<button onClick={() => extendUser(data.id, 7)}>+7 days</button>',
      '<button onClick={() => setSaasClient(data)}>SaaS Setup</button>\\n          <button onClick={() => extendUser(data.id, 7)}>+7 days</button>'
    );

    code = code.replace(
      '<button className="sa-action" onClick={() => extendUser(data.id, 7)}>+7 days</button>',
      '<button className="sa-action" onClick={() => setSaasClient(data)}>SaaS Setup</button>\\n          <button className="sa-action" onClick={() => extendUser(data.id, 7)}>+7 days</button>'
    );
  }

  const badReplacements = [
    [/[\u00C2\u00C3\u00E2\u00F0\uFFFD]/g, ""],
    [/Ã—/g, "x"],
    [/Â·/g, "-"],
    [/â€¢/g, "-"]
  ];

  for (const [pattern, replacement] of badReplacements) {
    code = code.replace(pattern, replacement);
  }

  write(superAdmin, code);
}

patchBackend();
createFrontendPanel();
patchSuperAdmin();

console.log("Final SaaS installer completed.");
console.log("Now run:");
console.log("cd D:\\\\ShazeeProjects\\\\nexapos-pro\\\\backend && node --check src\\\\routes\\\\roleAccessRoutes.js");
console.log("cd D:\\\\ShazeeProjects\\\\nexapos-pro\\\\frontend && npm run build");