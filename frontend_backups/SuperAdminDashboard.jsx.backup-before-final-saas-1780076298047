import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const moduleLabels = {
  walk_in: "Walk In", take_away: "Take Away", delivery: "Delivery", dine_in: "Dine In",
  drive_thru: "Drive Thru", kiosk: "Kiosk", orders: "Orders", kds: "KDS",
  settings: "Menu", restaurant_settings: "Restaurant Settings", inventory: "Inventory",
  discounts: "Discounts", staff: "Staff", customers: "Customers", analytics: "Reports",
  expenses: "Expenses", supplier_purchases: "Suppliers", stock_movements: "Stock Movements",
  menu_inventory_mapping: "Recipe Mapping"
};

const moduleIcons = {
  walk_in: "Ÿš¶", take_away: "Ÿ›ï¸", delivery: "Ÿ›µ", dine_in: "Ÿ½ï¸", drive_thru: "Ÿš—",
  kiosk: "˜ï¸", orders: "Ÿ“‹", kds: "Ÿ–¥ï¸", settings: "Ÿ”", restaurant_settings: "š™ï¸",
  inventory: "Ÿ“¦", discounts: "Ÿ·ï¸", staff: "Ÿ‘¥", customers: "ŸŽ", analytics: "Ÿ“ˆ",
  expenses: "Ÿ’¸", supplier_purchases: "Ÿšš", stock_movements: "Ÿ”", menu_inventory_mapping: "Ÿ§¾"
};

const restaurantModules = [
  "walk_in", "take_away", "delivery", "dine_in", "orders", "kds", "settings",
  "restaurant_settings", "inventory", "discounts", "staff", "customers"
];

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 30));
  return date.toISOString().slice(0, 10);
}

function normalizeUser(user) {
  const tenant = user?.tenant || {};
  const subscription = user?.subscription || {};
  const enabledModules = user?.enabledModules || subscription?.enabledModules || tenant?.enabledModules || [];

  return {
    ...user,
    restaurantName: user?.restaurantName || tenant?.restaurantName || tenant?.name || "Restaurant",
    ownerName: user?.name || tenant?.ownerName || "Owner",
    phone: user?.phone || tenant?.phone || "",
    packageName: user?.packageName || subscription?.packageName || tenant?.packageName || "Starter",
    packageId: user?.packageId || subscription?.packageId || tenant?.packageId || "",
    expiryDate: user?.expiryDate || subscription?.expiryDate || tenant?.expiryDate || "",
    enabledModules,
    isActive: user?.isActive !== false && user?.status !== "inactive" && tenant?.status !== "inactive" && subscription?.status !== "inactive"
  };
}

function statusTone(user) {
  const expiry = user.expiryDate;
  const expired = expiry ? new Date(expiry) < new Date() : false;
  if (!user.isActive) return { label: "Inactive", cls: "inactive", icon: "›”" };
  if (expired) return { label: "Expired", cls: "expired", icon: "³" };
  return { label: "Active", cls: "active", icon: "œ…" };
}

function initials(name) {
  return String(name || "NX")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NX";
}

function ClientModal({ mode, user, packages, allModules, createdLogin, saving, onClose, onSave }) {
  const editing = mode === "edit";
  const base = editing ? normalizeUser(user) : null;
  const [form, setForm] = useState(() => editing ? {
    restaurantName: base.restaurantName || "",
    ownerName: base.ownerName || "",
    username: base.username || "",
    password: "",
    email: base.email || "",
    phone: base.phone || "",
    packageId: base.packageId || "",
    packageName: base.packageName || "Starter",
    days: 30,
    expiryDate: base.expiryDate || "",
    isActive: base.isActive,
    enabledModules: base.enabledModules || []
  } : {
    restaurantName: "",
    ownerName: "",
    username: "",
    password: "",
    email: "",
    phone: "",
    packageId: "restaurant",
    packageName: "Restaurant Pro",
    days: 30,
    expiryDate: addDays(30),
    isActive: true,
    enabledModules: restaurantModules
  });

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyPackage(pkg) {
    setForm((prev) => ({
      ...prev,
      packageId: pkg.id || prev.packageId,
      packageName: pkg.name || prev.packageName,
      days: Number(pkg.days || prev.days || 30),
      expiryDate: addDays(Number(pkg.days || prev.days || 30)),
      enabledModules: Array.isArray(pkg.modules) ? pkg.modules : prev.enabledModules
    }));
  }

  function toggleModule(key) {
    setForm((prev) => ({
      ...prev,
      enabledModules: prev.enabledModules.includes(key)
        ? prev.enabledModules.filter((item) => item !== key)
        : [...prev.enabledModules, key]
    }));
  }

  return (
    <div className="sa-modal-backdrop">
      <div className="sa-modal">
        <div className="sa-modal-head">
          <div>
            <h2>{editing ? "Edit Client Master Control" : "Create New Client"}</h2>
            <p>{editing ? "Edit login, modules, package, expiry and status." : "Create restaurant account, owner login, package and modules."}</p>
          </div>
          <button className="sa-icon-btn" onClick={onClose}>—</button>
        </div>

        <div className="sa-modal-body">
          <section className="sa-box">
            <h3>Business & Owner</h3>
            <div className="sa-form-grid">
              <label><span>Restaurant Name</span><input value={form.restaurantName} onChange={(e) => update("restaurantName", e.target.value)} placeholder="Nexa Demo Restaurant" /></label>
              <label><span>Owner Name</span><input value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} placeholder="Owner name" /></label>
              <label><span>Email</span><input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="client@email.com" /></label>
              <label><span>Phone</span><input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="03000000000" /></label>
            </div>
          </section>

          <section className="sa-box">
            <h3>Login & Account Status</h3>
            <div className="sa-form-grid">
              <label><span>Username</span><input value={form.username} onChange={(e) => update("username", e.target.value)} placeholder="demo" /></label>
              <label><span>{editing ? "New Password" : "Password"}</span><input value={form.password} onChange={(e) => update("password", e.target.value)} placeholder={editing ? "Leave blank to keep old password" : "demo123"} /></label>
              <label className="sa-switch-row"><span>Client Active<small>Disable to block login.</small></span><input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} /></label>
            </div>
            {createdLogin ? (
              <div className="sa-login-box">
                <div><strong>Login Created</strong><span>{createdLogin.username} / {createdLogin.password}</span></div>
                <button className="sa-soft-btn" onClick={() => navigator.clipboard?.writeText(`Username: ${createdLogin.username}\nPassword: ${createdLogin.password}`)}>Copy</button>
              </div>
            ) : null}
          </section>

          <section className="sa-box full">
            <div className="sa-section-head"><h3>Package & Subscription</h3><div className="sa-mini-actions"><button onClick={() => update("expiryDate", addDays(7))}>7 Days</button><button onClick={() => update("expiryDate", addDays(30))}>30 Days</button><button onClick={() => update("expiryDate", addDays(365))}>1 Year</button></div></div>
            <div className="sa-package-grid">
              {packages.map((pkg) => <button key={pkg.id || pkg.name} className={`sa-package-card ${form.packageName === pkg.name ? "active" : ""}`} onClick={() => applyPackage(pkg)}><strong>{pkg.name}</strong><span>{pkg.days || 30} days</span><small>{pkg.modules?.length || 0} modules</small></button>)}
            </div>
            <div className="sa-form-grid top-gap">
              <label><span>Package Name</span><input value={form.packageName} onChange={(e) => update("packageName", e.target.value)} /></label>
              <label><span>Add Days</span><input type="number" value={form.days} onChange={(e) => { const days = Number(e.target.value || 0); update("days", days); update("expiryDate", addDays(days)); }} /></label>
              <label><span>Expiry Date</span><input type="date" value={form.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} /></label>
            </div>
          </section>

          <section className="sa-box full">
            <div className="sa-section-head"><h3>Module Access</h3><div className="sa-mini-actions"><button onClick={() => update("enabledModules", allModules)}>Enable All</button><button onClick={() => update("enabledModules", [])}>Clear</button></div></div>
            <div className="sa-module-grid">
              {allModules.map((key) => <button key={key} className={`sa-module-chip ${form.enabledModules.includes(key) ? "active" : ""}`} onClick={() => toggleModule(key)}>{moduleIcons[key] || "€¢"} {moduleLabels[key] || key}</button>)}
            </div>
          </section>
        </div>

        <div className="sa-modal-actions">
          <button className="sa-soft-btn" onClick={onClose}>Cancel</button>
          <button className="sa-primary-btn" disabled={saving} onClick={() => onSave(user, form)}>{saving ? "Saving..." : editing ? "Save Client Control" : "Create Client"}</button>
        </div>
      </div>
    </div>
  );
}

function ClientCard({ user, onEdit, onToggle, onQuickDays }) {
  const data = normalizeUser(user);
  const tone = statusTone(data);
  const modules = data.enabledModules || [];

  return (
    <div className="sa-card">
      <div className="sa-card-top">
        <div className="sa-avatar">{initials(data.restaurantName)}</div>
        <div><h3>{data.restaurantName}</h3><p>{data.username} · {data.email || "No email"}</p><small>{data.phone || "No phone"}</small></div>
        <span className={`sa-status ${tone.cls}`}>{tone.icon} {tone.label}</span>
      </div>

      <div className="sa-meta-grid">
        <div><span>Package</span><strong>{data.packageName}</strong></div>
        <div><span>Expiry</span><strong>{data.expiryDate || "Not set"}</strong></div>
        <div><span>Modules</span><strong>{modules.length}</strong></div>
      </div>

      <div className="sa-module-preview">
        {modules.slice(0, 8).map((key) => <span key={key}>{moduleIcons[key] || "€¢"} {moduleLabels[key] || key}</span>)}
        {modules.length > 8 ? <span>+{modules.length - 8}</span> : null}
      </div>

      <div className="sa-days-row"><button onClick={() => onQuickDays(user, 7)}>+7 days</button><button onClick={() => onQuickDays(user, 30)}>+30 days</button><button onClick={() => onQuickDays(user, 365)}>+1 year</button></div>
      <div className="sa-actions"><button className="sa-primary-btn" onClick={() => onEdit(user)}>Edit Control</button><button className="sa-soft-btn" onClick={() => navigator.clipboard?.writeText(`Restaurant: ${data.restaurantName}\nUsername: ${data.username}`)}>Copy Login</button><button className={data.isActive ? "sa-danger-btn" : "sa-soft-btn"} onClick={() => onToggle(user)}>{data.isActive ? "Disable" : "Activate"}</button></div>
    </div>
  );
}

export default function SuperAdminDashboard({ token, onOpenModule }) {
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [createdLogin, setCreatedLogin] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api(token).get("/api/super-admin-control/users");
      setUsers((res.data.users || []).map(normalizeUser));
      setPackages(res.data.packages || []);
      setAllModules(res.data.allModules || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load super admin users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  const stats = useMemo(() => {
    const list = users.map(normalizeUser);
    return { total: list.length, active: list.filter((u) => statusTone(u).cls === "active").length, expired: list.filter((u) => statusTone(u).cls === "expired").length, inactive: list.filter((u) => statusTone(u).cls === "inactive").length, modules: list.reduce((s, u) => s + (u.enabledModules?.length || 0), 0) };
  }, [users]);

  const uniquePackages = useMemo(() => [...new Set(users.map((u) => normalizeUser(u).packageName).filter(Boolean))], [users]);

  const filteredUsers = useMemo(() => users.filter((raw) => {
    const user = normalizeUser(raw);
    const q = search.toLowerCase();
    const bySearch = !q || [user.restaurantName, user.username, user.email, user.phone, user.packageName].some((value) => String(value || "").toLowerCase().includes(q));
    const byStatus = statusFilter === "all" || statusTone(user).cls === statusFilter;
    const byPackage = packageFilter === "all" || user.packageName === packageFilter;
    return bySearch && byStatus && byPackage;
  }), [users, search, statusFilter, packageFilter]);

  async function createClient(_, form) {
    if (!form.restaurantName || !form.ownerName || !form.username || !form.password) {
      alert("Restaurant name, owner name, username and password are required.");
      return;
    }
    setSaving(true);
    setCreatedLogin(null);
    try {
      const res = await api(token).post("/api/super-admin-control/users", form);
      setCreatedLogin(res.data.login || null);
      await loadUsers();
      alert("Client created successfully.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create client.");
    } finally {
      setSaving(false);
    }
  }

  async function saveUser(user, form) {
    setSaving(true);
    try {
      const res = await api(token).patch(`/api/super-admin-control/users/${user.id}`, form);
      setUsers((prev) => prev.map((item) => item.id === user.id ? normalizeUser(res.data.user) : item));
      setEditingUser(null);
      alert("Client settings updated successfully.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update client settings.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleUser(user) {
    const current = normalizeUser(user);
    try {
      await api(token).patch(`/api/super-admin-control/users/${user.id}/status`, { isActive: !current.isActive });
      await loadUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update status.");
    }
  }

  async function quickDays(user, days) {
    const current = normalizeUser(user);
    try {
      await api(token).patch(`/api/super-admin-control/users/${user.id}`, { ...current, days });
      await loadUsers();
      alert(`${days} days added/set successfully.`);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update days.");
    }
  }

  return (
    <div className="sa-page">
      <style>{`
        .sa-page{min-height:calc(100vh - 72px);padding:18px;color:white;background:radial-gradient(circle at 10% 14%,rgba(34,211,238,.14),transparent 30%),radial-gradient(circle at 86% 10%,rgba(168,85,247,.16),transparent 32%),linear-gradient(180deg,#020617,#071028)}
        .sa-head{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start;margin-bottom:16px}.sa-kicker{display:inline-flex;gap:7px;padding:7px 11px;border-radius:999px;background:rgba(34,211,238,.11);border:1px solid rgba(34,211,238,.20);color:#a5f3fc;font-size:12px;font-weight:950;margin-bottom:9px}.sa-title{margin:0;font-size:38px;font-weight:1000;letter-spacing:-.05em}.sa-sub{margin:6px 0 0;color:#94a3b8}.sa-head-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
        .sa-primary-btn,.sa-soft-btn,.sa-danger-btn,.sa-icon-btn{border:0;color:white;font-weight:900;cursor:pointer;transition:.18s ease}.sa-primary-btn,.sa-soft-btn,.sa-danger-btn{min-height:43px;border-radius:15px;padding:0 14px}.sa-primary-btn{background:linear-gradient(135deg,#06b6d4,#2563eb);box-shadow:0 16px 32px rgba(37,99,235,.22)}.sa-soft-btn,.sa-icon-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10)}.sa-danger-btn{background:rgba(239,68,68,.16);border:1px solid rgba(239,68,68,.24);color:#fecaca}.sa-icon-btn{width:46px;height:46px;border-radius:16px;font-size:24px}.sa-primary-btn:disabled{opacity:.55;cursor:not-allowed}
        .sa-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:14px}.sa-stat{padding:15px;border-radius:23px;background:radial-gradient(circle at top left,rgba(34,211,238,.10),transparent 35%),rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.10);box-shadow:0 16px 42px rgba(0,0,0,.18)}.sa-stat span{color:#94a3b8;font-size:12px;font-weight:800}.sa-stat strong{display:block;margin-top:6px;font-size:30px;font-weight:1000}
        .sa-toolbar{display:grid;grid-template-columns:1fr 170px 150px auto;gap:12px;padding:14px;border-radius:24px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.10);margin-bottom:14px}.sa-search,.sa-select{height:45px;border-radius:15px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:white;padding:0 14px;outline:none;font-weight:800}.sa-select option{color:#111827}
        .sa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(370px,1fr));gap:14px}.sa-card{padding:15px;border-radius:28px;background:radial-gradient(circle at 18% 0%,rgba(34,211,238,.10),transparent 30%),rgba(15,23,42,.84);border:1px solid rgba(255,255,255,.10);box-shadow:0 22px 54px rgba(0,0,0,.24)}.sa-card-top{display:grid;grid-template-columns:58px 1fr auto;gap:12px;align-items:start}.sa-avatar{width:54px;height:54px;border-radius:19px;background:linear-gradient(135deg,#22d3ee,#2563eb);display:grid;place-items:center;font-weight:1000}.sa-card h3{margin:0;font-size:22px}.sa-card p{margin:5px 0 0;color:#94a3b8;font-size:13px}.sa-card small{display:block;margin-top:4px;color:#64748b;font-weight:850}.sa-status{border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;white-space:nowrap}.sa-status.active{color:#86efac;background:rgba(34,197,94,.13);border:1px solid rgba(34,197,94,.24)}.sa-status.expired{color:#fde68a;background:rgba(250,204,21,.13);border:1px solid rgba(250,204,21,.24)}.sa-status.inactive{color:#fca5a5;background:rgba(239,68,68,.13);border:1px solid rgba(239,68,68,.24)}
        .sa-meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:13px}.sa-meta-grid div{padding:10px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}.sa-meta-grid span{color:#94a3b8;font-size:11px;font-weight:800}.sa-meta-grid strong{display:block;margin-top:5px;font-size:13px}.sa-module-preview{margin-top:12px;display:flex;gap:7px;flex-wrap:wrap;min-height:30px}.sa-module-preview span{padding:6px 9px;border-radius:999px;background:rgba(34,211,238,.10);color:#a5f3fc;font-size:11px;font-weight:850}.sa-days-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.sa-days-row button,.sa-mini-actions button{min-height:34px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:white;cursor:pointer;font-weight:850}.sa-actions{display:grid;grid-template-columns:1fr 110px 105px;gap:9px;margin-top:13px}.sa-empty{padding:28px;border-radius:24px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.10);color:#94a3b8}
        .sa-modal-backdrop{position:fixed;inset:0;z-index:9999;background:rgba(2,6,23,.75);backdrop-filter:blur(10px);display:grid;place-items:center;padding:18px}.sa-modal{width:min(1240px,calc(100vw - 36px));max-height:calc(100vh - 36px);overflow:hidden;display:grid;grid-template-rows:auto 1fr auto;border-radius:30px;background:#0f172a;border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 90px rgba(0,0,0,.45)}.sa-modal-head{padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;gap:12px}.sa-modal-head h2{margin:0}.sa-modal-head p{margin:5px 0 0;color:#94a3b8}.sa-modal-body{overflow-y:auto;min-height:0;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px}.sa-box{border-radius:24px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.09);padding:14px}.sa-box.full{grid-column:1/-1}.sa-section-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.sa-box h3{margin:0 0 12px;font-size:18px}.sa-form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.sa-form-grid.top-gap{margin-top:14px}.sa-form-grid label{display:grid;gap:7px}.sa-form-grid span,.sa-switch-row span{color:#cbd5e1;font-size:12px;font-weight:850}.sa-form-grid input{height:43px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.08);color:white;padding:0 12px;outline:none;font-weight:800}.sa-switch-row{grid-column:1/-1;display:flex!important;align-items:center;justify-content:space-between;padding:12px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}.sa-switch-row small{display:block;margin-top:4px;color:#94a3b8;font-size:11px}.sa-switch-row input{width:22px;height:22px}.sa-package-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.sa-package-card{min-height:95px;border-radius:18px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.06);color:white;cursor:pointer;display:grid;justify-items:start;align-content:center;gap:5px;padding:12px;text-align:left}.sa-package-card.active{background:rgba(34,211,238,.14);border-color:rgba(34,211,238,.34)}.sa-package-card span,.sa-package-card small{color:#94a3b8}.sa-module-grid{display:flex;flex-wrap:wrap;gap:8px}.sa-module-chip{min-height:39px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:white;padding:0 12px;cursor:pointer;font-weight:850}.sa-module-chip.active{background:rgba(34,211,238,.16);border-color:rgba(34,211,238,.34);color:#a5f3fc}.sa-modal-actions{padding:14px 16px;border-top:1px solid rgba(255,255,255,.08);display:grid;grid-template-columns:1fr 1fr;gap:10px}.sa-login-box{margin-top:12px;border-radius:18px;padding:12px;background:rgba(34,197,94,.10);border:1px solid rgba(34,197,94,.20);display:flex;justify-content:space-between;gap:12px;align-items:center}.sa-login-box span{display:block;margin-top:5px;color:#cbd5e1}
        @media(max-width:1050px){.sa-head,.sa-toolbar,.sa-stats,.sa-modal-body,.sa-form-grid,.sa-package-grid{grid-template-columns:1fr}.sa-head-actions{justify-content:flex-start}.sa-box.full,.sa-switch-row{grid-column:auto}.sa-actions{grid-template-columns:1fr}}
      `}</style>

      <div className="sa-head">
        <div><div className="sa-kicker">Ÿ‘‘ Super Admin Master Control</div><h1 className="sa-title">NexaPOS Command Center</h1><p className="sa-sub">Create clients, control logins, packages, subscription days, module access and status.</p></div>
        <div className="sa-head-actions"><button className="sa-primary-btn" onClick={() => { setCreatedLogin(null); setCreatingClient(true); }}>+ Add New Client</button><button className="sa-soft-btn" onClick={loadUsers}>Refresh</button><button className="sa-soft-btn" onClick={() => onOpenModule?.({ key: "super_packages", name: "Packages" })}>Package Builder</button><button className="sa-soft-btn" onClick={() => onOpenModule?.({ key: "super_subscriptions", name: "Subscriptions" })}>Subscriptions</button></div>
      </div>

      <div className="sa-stats"><div className="sa-stat"><span>Total Clients</span><strong>{stats.total}</strong></div><div className="sa-stat"><span>Active</span><strong>{stats.active}</strong></div><div className="sa-stat"><span>Expired</span><strong>{stats.expired}</strong></div><div className="sa-stat"><span>Inactive</span><strong>{stats.inactive}</strong></div><div className="sa-stat"><span>Modules Sold</span><strong>{stats.modules}</strong></div></div>

      <div className="sa-toolbar"><input className="sa-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search restaurant, user, email, phone, package..." /><select className="sa-select" value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)}><option value="all">All Packages</option>{uniquePackages.map((pkg) => <option key={pkg} value={pkg}>{pkg}</option>)}</select><select className="sa-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All Status</option><option value="active">Active</option><option value="expired">Expired</option><option value="inactive">Inactive</option></select><button className="sa-primary-btn" onClick={loadUsers}>Reload Users</button></div>

      {loading ? <div className="sa-empty">Loading clients...</div> : filteredUsers.length === 0 ? <div className="sa-empty">No clients found. Click Add New Client to create restaurant login.</div> : <div className="sa-grid">{filteredUsers.map((user) => <ClientCard key={user.id} user={user} onEdit={setEditingUser} onToggle={toggleUser} onQuickDays={quickDays} />)}</div>}

      {editingUser ? <ClientModal mode="edit" user={editingUser} packages={packages} allModules={allModules} saving={saving} onClose={() => setEditingUser(null)} onSave={saveUser} /> : null}
      {creatingClient ? <ClientModal mode="create" user={null} packages={packages} allModules={allModules} createdLogin={createdLogin} saving={saving} onClose={() => { setCreatingClient(false); setCreatedLogin(null); }} onSave={createClient} /> : null}
    </div>
  );
}

