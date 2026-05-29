const fs = require("fs");
const path = require("path");

const root = "D:\\ShazeeProjects\\nexapos-pro";

const files = {
  roleRoutes: path.join(root, "backend", "src", "routes", "roleAccessRoutes.js"),
  app: path.join(root, "frontend", "src", "App.jsx"),
  dashboard: path.join(root, "frontend", "src", "components", "ClientDashboard.jsx"),
  superAdmin: path.join(root, "frontend", "src", "components", "SuperAdminDashboard.jsx"),
  branchStaff: path.join(root, "frontend", "src", "components", "BranchStaffPanel.jsx"),
  superSaas: path.join(root, "frontend", "src", "components", "SuperClientSaasPanel.jsx")
};

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function backup(file) {
  if (!fs.existsSync(file)) return;
  fs.copyFileSync(file, `${file}.backup-final-saas-${Date.now()}`);
}

function insertBeforeReturnRouter(code, block) {
  if (code.includes("/super/tenants/:tenantId/users") && code.includes("/demo/full-saas")) {
    return code;
  }

  return code.replace("  return router;", `${block}\n  return router;`);
}

function patchBackendRoutes() {
  backup(files.roleRoutes);
  let code = read(files.roleRoutes);

  const block = `

  router.get("/super/tenants/:tenantId/branches", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());
    const { tenantId } = req.params;
    const tenant = db.tenants.find((item) => item.id === tenantId);

    if (!tenant) return res.status(404).json({ message: "Restaurant client not found." });

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

    if (!tenant) return res.status(404).json({ message: "Restaurant client not found." });
    if (!name) return res.status(400).json({ message: "Branch name is required." });

    const exists = db.branches.some(
      (branch) =>
        branch.tenantId === tenantId &&
        String(branch.name || "").toLowerCase() === String(name).toLowerCase()
    );

    if (exists) return res.status(409).json({ message: "Branch already exists." });

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
    makeAudit(db, "SUPER_BRANCH_CREATED", req.user.username, { tenantId, branchId: branch.id, branchName: branch.name });
    writeDb(db);

    res.status(201).json({ message: "Branch created successfully.", branch });
  });

  router.patch("/super/tenants/:tenantId/branches/:branchId", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());
    const { tenantId, branchId } = req.params;
    const { name, city, address, phone, status } = req.body;

    const branch = db.branches.find((item) => item.tenantId === tenantId && item.id === branchId);
    if (!branch) return res.status(404).json({ message: "Branch not found." });

    branch.name = name || branch.name;
    branch.city = city ?? branch.city;
    branch.address = address ?? branch.address;
    branch.phone = phone ?? branch.phone;
    branch.status = status || branch.status;
    branch.updatedAt = new Date().toISOString();

    writeDb(db);
    res.json({ message: "Branch updated successfully.", branch });
  });

  router.get("/super/tenants/:tenantId/users", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());
    const { tenantId } = req.params;
    const tenant = db.tenants.find((item) => item.id === tenantId);

    if (!tenant) return res.status(404).json({ message: "Restaurant client not found." });

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

      if (!tenant) return res.status(404).json({ message: "Restaurant client not found." });
      if (!name || !username || !password || !role) {
        return res.status(400).json({ message: "Name, username, password and role are required." });
      }
      if (!ROLE_PERMISSIONS[role]) return res.status(400).json({ message: "Invalid role." });
      if (role !== "owner" && !branchId) return res.status(400).json({ message: "Branch is required for staff logins." });

      const exists = db.users.some((user) => String(user.username || "").toLowerCase() === String(username).toLowerCase());
      if (exists) return res.status(409).json({ message: "Username already exists." });

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
      makeAudit(db, "SUPER_USER_CREATED", req.user.username, { tenantId, userId: user.id, username: user.username, role: user.role, branchId: user.branchId });
      writeDb(db);

      res.status(201).json({ message: "Login created successfully.", user: cleanUser(user), login: { username, password } });
    } catch (error) {
      res.status(500).json({ message: "Failed to create login.", error: error.message });
    }
  });

  router.patch("/super/tenants/:tenantId/users/:userId", requireSuperAdmin, (req, res) => {
    const db = ensureCollections(readDb());
    const { tenantId, userId } = req.params;
    const { status, role, branchId, permissions } = req.body;

    const user = db.users.find((item) => item.tenantId === tenantId && item.id === userId);
    if (!user) return res.status(404).json({ message: "Login not found." });

    if (role && !ROLE_PERMISSIONS[role]) return res.status(400).json({ message: "Invalid role." });

    user.role = role || user.role;
    user.branchId = user.role === "owner" ? null : branchId || user.branchId;
    user.status = status || user.status;
    user.permissions = {
      ...defaultPermissions(user.role),
      ...(user.permissions || {}),
      ...(permissions || {})
    };
    user.updatedAt = new Date().toISOString();

    writeDb(db);
    res.json({ message: "Login updated successfully.", user: cleanUser(user) });
  });

  router.post("/demo/full-saas", requireSuperAdmin, async (req, res) => {
    try {
      const db = ensureCollections(readDb());

      db.menuItems = Array.isArray(db.menuItems) ? db.menuItems : [];
      db.orders = Array.isArray(db.orders) ? db.orders : [];
      db.customers = Array.isArray(db.customers) ? db.customers : [];
      db.inventoryItems = Array.isArray(db.inventoryItems) ? db.inventoryItems : [];
      db.expenses = Array.isArray(db.expenses) ? db.expenses : [];
      db.kdsSettings = Array.isArray(db.kdsSettings) ? db.kdsSettings : [];

      const exists = db.users.some((user) => String(user.username || "").toLowerCase() === "demopro");

      if (exists) {
        return res.json({
          message: "Full SaaS demo already exists.",
          login: {
            owner: { username: "demopro", password: "demopro123" },
            hydCashier: { username: "hydcashierpro", password: "staff123" },
            khiCashier: { username: "khicashierpro", password: "staff123" },
            kitchen: { username: "hydkitchenpro", password: "kitchen123" },
            rider: { username: "hydriderpro", password: "rider123" }
          }
        });
      }

      const now = new Date().toISOString();
      const tenantId = uuid();

      const tenant = {
        id: tenantId,
        restaurantName: "Nexa Demo Restaurant Group",
        ownerName: "Demo Restaurant Owner",
        slug: "nexa-demo-restaurant-group",
        phone: "03001234567",
        email: "demo@nexapos.com",
        packageName: "Enterprise Multi Branch SaaS",
        enabledModules: ["walk_in","take_away","delivery","dine_in","drive_thru","orders","kds","settings","restaurant_settings","inventory","discounts","staff","customers","analytics","expenses","supplier_purchases","stock_movements","menu_inventory_mapping"],
        status: "active",
        subscriptionStatus: "active",
        paymentStatus: "paid",
        expiryDate: "2030-12-31",
        maxBranches: 10,
        createdAt: now,
        updatedAt: now
      };

      const hyd = createDemoBranch(tenantId, "Hyderabad Main Branch", "Hyderabad", "Auto Bhan Road");
      const khi = createDemoBranch(tenantId, "Karachi Clifton Branch", "Karachi", "Clifton");
      const lhr = createDemoBranch(tenantId, "Lahore Gulberg Branch", "Lahore", "Gulberg");
      const branches = [hyd, khi, lhr];

      const ownerHash = await hashPassword("demopro123");
      const staffHash = await hashPassword("staff123");
      const kitchenHash = await hashPassword("kitchen123");
      const riderHash = await hashPassword("rider123");

      const users = [
        { id: uuid(), tenantId, branchId: null, name: "Demo Group Owner", username: "demopro", passwordHash: ownerHash, role: "owner", phone: "03000000001", email: "owner@nexademo.com", status: "active", permissions: defaultPermissions("owner"), createdAt: now, updatedAt: now },
        { id: uuid(), tenantId, branchId: hyd.id, name: "Hyderabad Cashier", username: "hydcashierpro", passwordHash: staffHash, role: "cashier", phone: "03000000002", email: "hydcashier@nexademo.com", status: "active", permissions: { ...defaultPermissions("cashier"), canEditOrders: true }, createdAt: now, updatedAt: now },
        { id: uuid(), tenantId, branchId: khi.id, name: "Karachi Cashier", username: "khicashierpro", passwordHash: staffHash, role: "cashier", phone: "03000000003", email: "khicashier@nexademo.com", status: "active", permissions: { ...defaultPermissions("cashier"), canEditOrders: true }, createdAt: now, updatedAt: now },
        { id: uuid(), tenantId, branchId: hyd.id, name: "Hyderabad Kitchen", username: "hydkitchenpro", passwordHash: kitchenHash, role: "kitchen", phone: "03000000004", email: "kitchen@nexademo.com", status: "active", permissions: defaultPermissions("kitchen"), createdAt: now, updatedAt: now },
        { id: uuid(), tenantId, branchId: hyd.id, name: "Hyderabad Rider", username: "hydriderpro", passwordHash: riderHash, role: "rider", phone: "03000000005", email: "rider@nexademo.com", status: "active", permissions: defaultPermissions("rider"), createdAt: now, updatedAt: now }
      ];

      const demoMenu = [
        { name: "Zinger Burger", category: "Burgers", price: 650, costPrice: 390 },
        { name: "Double Cheese Burger", category: "Burgers", price: 850, costPrice: 520 },
        { name: "Chicken Biryani", category: "Rice", price: 450, costPrice: 260 },
        { name: "Chicken Karahi", category: "Karahi", price: 1600, costPrice: 980 },
        { name: "Fajita Pizza", category: "Pizza", price: 1400, costPrice: 850 },
        { name: "Loaded Fries", category: "Sides", price: 550, costPrice: 300 },
        { name: "Club Sandwich", category: "Sandwich", price: 750, costPrice: 430 },
        { name: "Cold Drink", category: "Drinks", price: 120, costPrice: 70 }
      ];

      const menuItems = branches.flatMap((branch) =>
        demoMenu.map((item) => ({
          id: uuid(),
          tenantId,
          branchId: branch.id,
          branchName: branch.name,
          name: item.name,
          category: item.category,
          price: item.price,
          costPrice: item.costPrice,
          stock: 100,
          status: "active",
          image: "",
          imageUrl: "",
          createdAt: now,
          updatedAt: now
        }))
      );

      function makeOrder(branch, index, mode, kitchenStatus, paymentStatus, total) {
        const item = menuItems.find((menu) => menu.branchId === branch.id) || menuItems[0];
        return {
          id: uuid(),
          tenantId,
          branchId: branch.id,
          branchName: branch.name,
          orderNo: "#D" + branch.name.slice(0, 3).toUpperCase() + String(index).padStart(3, "0"),
          mode,
          items: [{ id: item.id, name: item.name, category: item.category, price: item.price, qty: 1, quantity: 1 }],
          customer: { firstName: "Demo", lastName: "Customer", address: branch.address },
          phone: "03001234567",
          subtotal: total,
          tax: Math.round(total * 0.05),
          total: Math.round(total * 1.05),
          originalTotal: Math.round(total * 1.05),
          paymentMethod: paymentStatus === "unpaid" ? "Cash on Delivery" : "Cash",
          paymentStatus,
          orderStatus: kitchenStatus === "served" ? "completed" : "placed",
          kitchenStatus,
          createdAt: now,
          updatedAt: now,
          kitchenStatusChangedAt: now
        };
      }

      const orders = [
        makeOrder(hyd, 1, "dine_in", "new", "paid", 1200),
        makeOrder(hyd, 2, "delivery", "preparing", "unpaid", 850),
        makeOrder(hyd, 3, "take_away", "ready", "paid", 650),
        makeOrder(khi, 1, "walk_in", "new", "paid", 1400),
        makeOrder(khi, 2, "delivery", "preparing", "unpaid", 950),
        makeOrder(lhr, 1, "dine_in", "ready", "paid", 1600),
        makeOrder(lhr, 2, "drive_thru", "new", "paid", 750)
      ];

      db.tenants.push(tenant);
      db.branches.push(...branches);
      db.users.push(...users);
      db.menuItems.push(...menuItems);
      db.orders.push(...orders);

      db.kdsSettings.push({
        tenantId,
        autoEnabled: true,
        newToPreparingMinutes: 2,
        preparingToReadyMinutes: 8,
        readyToRiderPickedMinutes: 2,
        riderPickedToOnWayMinutes: 2,
        riderOnWayToDeliveredMinutes: 20,
        deliveredToCashReceivedMinutes: 3,
        updatedAt: now
      });

      writeDb(db);

      res.status(201).json({
        message: "Full SaaS demo created successfully.",
        tenant,
        branches,
        seeded: { users: users.length, menuItems: menuItems.length, orders: orders.length },
        login: {
          owner: { username: "demopro", password: "demopro123" },
          hydCashier: { username: "hydcashierpro", password: "staff123" },
          khiCashier: { username: "khicashierpro", password: "staff123" },
          kitchen: { username: "hydkitchenpro", password: "kitchen123" },
          rider: { username: "hydriderpro", password: "rider123" }
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create full SaaS demo.", error: error.message });
    }
  });

`;

  code = insertBeforeReturnRouter(code, block);
  write(files.roleRoutes, code);
}

function createSuperSaasPanel() {
  const content = `
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
  const [branchForm, setBranchForm] = useState({ name: "", city: "", address: "", phone: "" });
  const [userForm, setUserForm] = useState({ name: "", username: "", password: "", role: "owner", branchId: "", phone: "", email: "", canEditOrders: true });

  const branchById = useMemo(() => {
    const map = {};
    branches.forEach((branch) => { map[branch.id] = branch; });
    return map;
  }, [branches]);

  async function loadAll() {
    if (!client?.id) return;
    setLoading(true);
    try {
      const [branchRes, userRes] = await Promise.all([
        api(token).get("/api/role-access/super/tenants/" + client.id + "/branches"),
        api(token).get("/api/role-access/super/tenants/" + client.id + "/users")
      ]);
      setTenant(branchRes.data.tenant || userRes.data.tenant || client);
      setBranches(branchRes.data.branches || []);
      setUsers(userRes.data.users || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load SaaS setup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [client?.id]);

  async function createBranch(event) {
    event.preventDefault();
    if (!branchForm.name.trim()) return alert("Branch name is required.");
    try {
      await api(token).post("/api/role-access/super/tenants/" + client.id + "/branches", branchForm);
      setBranchForm({ name: "", city: "", address: "", phone: "" });
      await loadAll();
      alert("Branch created.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create branch.");
    }
  }

  async function createLogin(event) {
    event.preventDefault();
    if (!userForm.name || !userForm.username || !userForm.password || !userForm.role) return alert("Name, username, password and role are required.");
    if (userForm.role !== "owner" && !userForm.branchId) return alert("Select branch for this login.");

    try {
      await api(token).post("/api/role-access/super/tenants/" + client.id + "/users", {
        ...userForm,
        branchId: userForm.role === "owner" ? null : userForm.branchId,
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

      setUserForm({ name: "", username: "", password: "", role: "owner", branchId: branches[0]?.id || "", phone: "", email: "", canEditOrders: true });
      await loadAll();
      alert("Login created.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create login.");
    }
  }

  async function toggleUser(user) {
    try {
      await api(token).patch("/api/role-access/super/tenants/" + client.id + "/users/" + user.id, {
        status: user.status === "inactive" ? "active" : "inactive"
      });
      await loadAll();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update login.");
    }
  }

  return (
    <div className="sf-page">
      <style>{\`
        .sf-page{min-height:100vh;padding:18px;color:white;background:linear-gradient(135deg,#020617,#0f172a)}
        .sf-head,.sf-panel,.sf-card{border-radius:28px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.12);box-shadow:0 22px 60px rgba(0,0,0,.24)}
        .sf-head{padding:18px;display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}
        .sf-title{margin:10px 0 0;font-size:36px;font-weight:1000;letter-spacing:-.04em}
        .sf-sub{margin:8px 0 0;color:#94a3b8;font-weight:750}
        .sf-btn{height:44px;border:0;border-radius:16px;padding:0 14px;font-weight:1000;color:white;cursor:pointer;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
        .sf-primary{background:linear-gradient(135deg,#06b6d4,#2563eb)}
        .sf-layout{display:grid;grid-template-columns:minmax(320px,390px) minmax(320px,390px) minmax(0,1fr);gap:14px}
        .sf-panel{padding:16px;min-width:0}
        .sf-form{display:grid;gap:10px}
        .sf-input,.sf-select{width:100%;height:46px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:#020617;color:white;padding:0 13px;outline:none;font-weight:850}
        .sf-select option{background:#020617;color:white}
        .sf-check{display:flex;align-items:center;gap:9px;padding:11px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font-weight:850}
        .sf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
        .sf-card{padding:15px;min-width:0;overflow:hidden;margin-bottom:10px}
        .sf-card h3{margin:0;font-size:19px;font-weight:1000;word-break:break-word}
        .sf-card p{margin:6px 0;color:#94a3b8;font-weight:800;word-break:break-word}
        .sf-badge{display:inline-flex;margin:8px 6px 0 0;padding:7px 10px;border-radius:999px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.22);color:#a5f3fc;font-size:12px;font-weight:1000}
        @media(max-width:1250px){.sf-layout{grid-template-columns:1fr}.sf-head{flex-direction:column}}
      \`}</style>

      <header className="sf-head">
        <div>
          <button className="sf-btn" onClick={onBack}>Back</button>
          <h1 className="sf-title">Complete SaaS Setup</h1>
          <p className="sf-sub">{tenant?.restaurantName || client?.restaurantName || "Restaurant"} - branches, owner, managers and staff logins.</p>
        </div>
        <button className="sf-btn sf-primary" onClick={loadAll}>Refresh</button>
      </header>

      <div className="sf-layout">
        <section className="sf-panel">
          <h2 style={{ marginTop: 0 }}>1. Create Branch</h2>
          <form className="sf-form" onSubmit={createBranch}>
            <input className="sf-input" placeholder="Branch name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
            <input className="sf-input" placeholder="City" value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} />
            <input className="sf-input" placeholder="Address" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
            <input className="sf-input" placeholder="Phone" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
            <button className="sf-btn sf-primary" type="submit">Create Branch</button>
          </form>

          <h2>Branches</h2>
          {branches.length === 0 ? <div className="sf-card">No branches yet.</div> : branches.map((branch) => (
            <div className="sf-card" key={branch.id}>
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
            <button className="sf-btn sf-primary" type="submit">Create Login</button>
          </form>
        </section>

        <section className="sf-panel">
          <h2 style={{ marginTop: 0 }}>Created Logins</h2>
          {loading ? <div className="sf-card">Loading setup...</div> : users.length === 0 ? <div className="sf-card">No logins yet.</div> : (
            <div className="sf-grid">
              {users.map((user) => (
                <div className="sf-card" key={user.id || user.username}>
                  <h3>{user.name || user.username}</h3>
                  <p>@{user.username}</p>
                  <p>{roleName(user.role)}</p>
                  <span className="sf-badge">{user.role === "owner" ? "All Branches" : branchById[user.branchId]?.name || "No Branch"}</span>
                  <span className="sf-badge">{user.status || "active"}</span>
                  <div style={{ marginTop: 12 }}>
                    <button className="sf-btn" onClick={() => toggleUser(user)}>{user.status === "inactive" ? "Activate" : "Disable"}</button>
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
  write(files.superSaas, content);
}

function createBranchStaffPanel() {
  const content = `
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const ROLES = [
  { value: "branch_manager", label: "Branch Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "waiter", label: "Waiter" },
  { value: "kitchen", label: "Kitchen Staff" },
  { value: "rider", label: "Delivery Rider" }
];

function roleName(role) {
  return ROLES.find((item) => item.value === role)?.label || role || "Staff";
}

export default function BranchStaffPanel({ token, session, roleContext, onBack }) {
  const access = roleContext || session?.roleContext || {};
  const permissions = access?.permissions || {};
  const branches = access?.branches || [];
  const canViewAllBranches = permissions.canViewAllBranches === true;
  const saved = localStorage.getItem("nexapos_selected_branch_id");
  const [selectedBranchId, setSelectedBranchId] = useState(canViewAllBranches ? saved || "all" : access?.activeBranch?.id || session?.user?.branchId || "");
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "cashier", branchId: "", phone: "", email: "", canEditOrders: true });

  const branchById = useMemo(() => {
    const map = {};
    branches.forEach((branch) => { map[branch.id] = branch; });
    return map;
  }, [branches]);

  const visibleUsers = useMemo(() => {
    if (canViewAllBranches && selectedBranchId === "all") return users;
    const target = canViewAllBranches ? selectedBranchId : access?.activeBranch?.id || session?.user?.branchId || selectedBranchId;
    return users.filter((user) => String(user.branchId || "") === String(target));
  }, [users, selectedBranchId, canViewAllBranches, access?.activeBranch?.id, session?.user?.branchId]);

  async function loadUsers() {
    try {
      const res = await api(token).get("/api/role-access/users");
      setUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load staff.");
    }
  }

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => {
    if (selectedBranchId !== "all") setForm((prev) => ({ ...prev, branchId: selectedBranchId }));
  }, [selectedBranchId]);

  async function createStaff(event) {
    event.preventDefault();
    const branchId = form.branchId || (selectedBranchId !== "all" ? selectedBranchId : "");
    if (!branchId) return alert("Select branch before creating staff.");
    if (!form.name || !form.username || !form.password || !form.role) return alert("Name, username, password and role are required.");

    try {
      await api(token).post("/api/role-access/users", {
        ...form,
        branchId,
        permissions: {
          canEditOrders: Boolean(form.canEditOrders),
          canUsePOS: ["cashier", "waiter", "branch_manager"].includes(form.role),
          canUseKDS: ["kitchen", "branch_manager"].includes(form.role),
          canUseDelivery: ["rider", "branch_manager"].includes(form.role),
          canViewCosts: false,
          canViewProfitLoss: false,
          canViewPurchases: false
        }
      });

      setForm({ name: "", username: "", password: "", role: "cashier", branchId, phone: "", email: "", canEditOrders: true });
      await loadUsers();
      alert("Staff created.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create staff.");
    }
  }

  return (
    <div className="sf-page">
      <style>{\`
        .sf-page{min-height:100vh;padding:18px;color:white;background:linear-gradient(135deg,#020617,#0f172a)}
        .sf-head,.sf-panel,.sf-card{border-radius:28px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.12);box-shadow:0 22px 60px rgba(0,0,0,.24)}
        .sf-head{padding:18px;display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}
        .sf-title{margin:10px 0 0;font-size:34px;font-weight:1000;letter-spacing:-.04em}
        .sf-sub{margin:8px 0 0;color:#94a3b8;font-weight:750}
        .sf-btn{height:44px;border:0;border-radius:16px;padding:0 14px;font-weight:1000;color:white;cursor:pointer;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
        .sf-primary{background:linear-gradient(135deg,#06b6d4,#2563eb)}
        .sf-layout{display:grid;grid-template-columns:minmax(320px,390px) minmax(0,1fr);gap:14px}
        .sf-panel{padding:16px;min-width:0}
        .sf-form{display:grid;gap:10px}
        .sf-input,.sf-select{width:100%;height:46px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:#020617;color:white;padding:0 13px;outline:none;font-weight:850}
        .sf-select option{background:#020617;color:white}
        .sf-check{display:flex;align-items:center;gap:9px;padding:11px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font-weight:850}
        .sf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
        .sf-card{padding:15px;min-width:0;overflow:hidden;margin-bottom:10px}
        .sf-card h3{margin:0;font-size:19px;font-weight:1000;word-break:break-word}
        .sf-card p{margin:6px 0;color:#94a3b8;font-weight:800;word-break:break-word}
        .sf-badge{display:inline-flex;margin:8px 6px 0 0;padding:7px 10px;border-radius:999px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.22);color:#a5f3fc;font-size:12px;font-weight:1000}
        @media(max-width:1050px){.sf-layout{grid-template-columns:1fr}.sf-head{flex-direction:column}}
      \`}</style>

      <header className="sf-head">
        <div>
          <button className="sf-btn" onClick={onBack}>Back</button>
          <h1 className="sf-title">Branch Staff Management</h1>
          <p className="sf-sub">Staff logins are separated by branch.</p>
        </div>
        <button className="sf-btn sf-primary" onClick={loadUsers}>Refresh</button>
      </header>

      <div className="sf-layout">
        <section className="sf-panel">
          <h2 style={{ marginTop: 0 }}>Create Staff</h2>
          <form className="sf-form" onSubmit={createStaff}>
            <input className="sf-input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="sf-input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input className="sf-input" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select className="sf-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
            <select className="sf-select" value={form.branchId || selectedBranchId} disabled={!canViewAllBranches} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">Select Branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <input className="sf-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="sf-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label className="sf-check">
              <input type="checkbox" checked={form.canEditOrders} onChange={(e) => setForm({ ...form, canEditOrders: e.target.checked })} />
              Allow order edit
            </label>
            <button className="sf-btn sf-primary" type="submit">Create Staff</button>
          </form>
        </section>

        <section className="sf-panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Staff Directory</h2>
            {canViewAllBranches ? (
              <select className="sf-select" value={selectedBranchId} onChange={(e) => {
                setSelectedBranchId(e.target.value);
                localStorage.setItem("nexapos_selected_branch_id", e.target.value);
              }}>
                <option value="all">All Branches</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            ) : null}
          </div>

          {visibleUsers.length === 0 ? <div className="sf-card">No staff found for this branch.</div> : (
            <div className="sf-grid">
              {visibleUsers.map((user) => (
                <div className="sf-card" key={user.id || user.username}>
                  <h3>{user.name || user.username}</h3>
                  <p>@{user.username}</p>
                  <p>{roleName(user.role)}</p>
                  <span className="sf-badge">{branchById[user.branchId]?.name || "No Branch"}</span>
                  <span className="sf-badge">{user.status || "active"}</span>
                  <span className="sf-badge">{user.permissions?.canEditOrders ? "Can edit orders" : "No edit"}</span>
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
  write(files.branchStaff, content);
}

function patchApp() {
  backup(files.app);
  let code = read(files.app);

  if (!code.includes("BranchStaffPanel")) {
    code = code.replace(
      'import StaffPanel from "./components/StaffPanel";',
      'import StaffPanel from "./components/StaffPanel";\nimport BranchStaffPanel from "./components/BranchStaffPanel";'
    );
  }

  code = code.replace(/<StaffPanel token=\{token\} session=\{[^}]+\}[^>]*onBack=\{closeModule\} \/>/g, '<BranchStaffPanel token={token} session={branchAwareSession} roleContext={roleContext} onBack={closeModule} />');

  code = code.replace(/activeModule\?\.key === "cashier"\s*\|\|\s*/g, "");

  if (!code.includes('activeModule?.key === "cashier"')) {
    code = code.replace(
      'activeModule?.key === "drive_thru"',
      'activeModule?.key === "drive_thru" ||\n    activeModule?.key === "cashier"'
    );
  }

  write(files.app, code);
}

function patchDashboard() {
  backup(files.dashboard);
  let code = read(files.dashboard);

  code = code.replace(/\{\s*key:\s*"[^"]+",\s*name:\s*"Cashier"[\s\S]*?\},/, '{ key: "cashier", modeKey: "walk_in", name: "Cashier", subtitle: "Cashier POS Terminal", icon: "BILL", bg: "linear-gradient(135deg,#ccfbf1,#2dd4bf)", dark: true },');
  code = code.replace(/\{\s*key:\s*"staff",\s*name:\s*"Staff"[\s\S]*?\},/, '{ key: "staff", name: "Staff", subtitle: "Branch staff control", icon: "TEAM", bg: "linear-gradient(135deg,#dbeafe,#60a5fa)", dark: true },');

  if (!code.includes('"cashier"')) {
    code = code.replace(
      'const sellingModes = ["walk_in", "take_away", "delivery", "drive_thru", "kiosk"];',
      'const sellingModes = ["walk_in", "take_away", "delivery", "drive_thru", "kiosk", "cashier"];'
    );
  } else {
    code = code.replace(
      'const sellingModes = ["walk_in", "take_away", "delivery", "drive_thru", "kiosk"];',
      'const sellingModes = ["walk_in", "take_away", "delivery", "drive_thru", "kiosk", "cashier"];'
    );
  }

  code = code.replace(/modeKey:\s*key,/g, 'modeKey: key === "cashier" ? "walk_in" : key,');

  write(files.dashboard, code);
}

function patchSuperAdmin() {
  backup(files.superAdmin);
  let code = read(files.superAdmin);

  if (!code.includes("SuperClientSaasPanel")) {
    code = code.replace(
      'import React, { useEffect, useMemo, useState } from "react";',
      'import React, { useEffect, useMemo, useState } from "react";\nimport SuperClientSaasPanel from "./SuperClientSaasPanel";'
    );
  }

  if (!code.includes("saasClient")) {
    code = code.replace(
      'const [loading, setLoading] = useState(true);',
      'const [loading, setLoading] = useState(true);\n  const [saasClient, setSaasClient] = useState(null);'
    );
  }

  if (!code.includes("if (saasClient)")) {
    code = code.replace(
      "return (",
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

  if (!code.includes("SaaS Setup")) {
    code = code.replace(
      '<button onClick={() => extendUser(data.id, 7)}>+7 days</button>',
      '<button onClick={() => setSaasClient(data)}>SaaS Setup</button>\\n          <button onClick={() => extendUser(data.id, 7)}>+7 days</button>'
    );

    code = code.replace(
      '<button className="sa-action" onClick={() => extendUser(data.id, 7)}>+7 days</button>',
      '<button className="sa-action" onClick={() => setSaasClient(data)}>SaaS Setup</button>\\n          <button className="sa-action" onClick={() => extendUser(data.id, 7)}>+7 days</button>'
    );
  }

  code = code.replace(/[\u00C2\u00C3\u00E2\u00F0\uFFFD]/g, "");
  write(files.superAdmin, code);
}

patchBackendRoutes();
createSuperSaasPanel();
createBranchStaffPanel();
patchApp();
patchDashboard();
patchSuperAdmin();

console.log("Final SaaS fix installed.");
console.log("Next:");
console.log("1) cd backend && node --check src/routes/roleAccessRoutes.js");
console.log("2) cd frontend && npm run build");