import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const moduleLabels = {
  walk_in: "Walk In",
  take_away: "Take Away",
  delivery: "Delivery",
  dine_in: "Dine In",
  drive_thru: "Drive Thru",
  kiosk: "Kiosk",
  orders: "Orders",
  kds: "KDS",
  settings: "Menu",
  restaurant_settings: "Restaurant Settings",
  inventory: "Inventory",
  discounts: "Discounts",
  staff: "Staff",
  customers: "Customers",
  analytics: "Reports",
  expenses: "Expenses",
  supplier_purchases: "Suppliers",
  stock_movements: "Stock Movements",
  menu_inventory_mapping: "Recipe Mapping"
};

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 30));
  return date.toISOString().slice(0, 10);
}

function statusTone(user) {
  const active = user.isActive !== false && user.status !== "inactive";
  const expiry = user.expiryDate || user.subscription?.expiryDate;
  const expired = expiry ? new Date(expiry) < new Date() : false;

  if (!active) return { label: "Inactive", cls: "inactive" };
  if (expired) return { label: "Expired", cls: "expired" };
  return { label: "Active", cls: "active" };
}

function EditUserModal({ user, packages, allModules, onClose, onSave, saving }) {
  const initialModules =
    user.enabledModules ||
    user.subscription?.enabledModules ||
    [];

  const [form, setForm] = useState({
    username: user.username || "",
    password: "",
    email: user.email || "",
    name: user.name || "",
    restaurantName: user.restaurantName || user.tenant?.restaurantName || user.tenant?.name || "",
    isActive: user.isActive !== false && user.status !== "inactive",
    packageId: user.subscription?.packageId || user.packageId || "",
    packageName: user.packageName || user.subscription?.packageName || "Starter",
    days: 30,
    expiryDate: user.expiryDate || user.subscription?.expiryDate || "",
    enabledModules: initialModules
  });

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleModule(moduleKey) {
    setForm((prev) => {
      const exists = prev.enabledModules.includes(moduleKey);

      return {
        ...prev,
        enabledModules: exists
          ? prev.enabledModules.filter((item) => item !== moduleKey)
          : [...prev.enabledModules, moduleKey]
      };
    });
  }

  function applyPackage(pkg) {
    if (!pkg) return;

    setForm((prev) => ({
      ...prev,
      packageId: pkg.id,
      packageName: pkg.name,
      days: pkg.days || prev.days || 30,
      expiryDate: addDays(pkg.days || 30),
      enabledModules: Array.isArray(pkg.modules) ? pkg.modules : prev.enabledModules
    }));
  }

  return (
    <div className="sa-modal-backdrop">
      <div className="sa-edit-modal">
        <div className="sa-modal-head">
          <div>
            <h2>Edit User Settings</h2>
            <p>Edit login, package, days, expiry and enabled modules.</p>
          </div>

          <button className="sa-icon-btn" onClick={onClose}>âœ•</button>
        </div>

        <div className="sa-edit-grid">
          <section className="sa-edit-section">
            <h3>Account Details</h3>

            <div className="sa-form-grid">
              <label>
                <span>Username</span>
                <input value={form.username} onChange={(e) => update("username", e.target.value)} />
              </label>

              <label>
                <span>New Password</span>
                <input
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Leave empty to keep old password"
                />
              </label>

              <label>
                <span>Email</span>
                <input value={form.email} onChange={(e) => update("email", e.target.value)} />
              </label>

              <label>
                <span>Owner Name</span>
                <input value={form.name} onChange={(e) => update("name", e.target.value)} />
              </label>

              <label>
                <span>Restaurant Name</span>
                <input value={form.restaurantName} onChange={(e) => update("restaurantName", e.target.value)} />
              </label>

              <label className="sa-switch-row">
                <span>Active User</span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => update("isActive", e.target.checked)}
                />
              </label>
            </div>
          </section>

          <section className="sa-edit-section">
            <h3>Package & Subscription</h3>

            <div className="sa-package-grid">
              {packages.map((pkg) => (
                <button
                  key={pkg.id || pkg.name}
                  className={`sa-package-card ${form.packageName === pkg.name ? "active" : ""}`}
                  onClick={() => applyPackage(pkg)}
                  type="button"
                >
                  <strong>{pkg.name}</strong>
                  <span>{pkg.days || 30} days</span>
                  <small>{Array.isArray(pkg.modules) ? pkg.modules.length : 0} modules</small>
                </button>
              ))}
            </div>

            <div className="sa-form-grid" style={{ marginTop: 14 }}>
              <label>
                <span>Package Name</span>
                <input value={form.packageName} onChange={(e) => update("packageName", e.target.value)} />
              </label>

              <label>
                <span>Add Days</span>
                <input
                  type="number"
                  value={form.days}
                  onChange={(e) => {
                    const days = Number(e.target.value || 0);
                    update("days", days);
                    update("expiryDate", addDays(days));
                  }}
                />
              </label>

              <label>
                <span>Expiry Date</span>
                <input type="date" value={form.expiryDate} onChange={(e) => update("expiryDate", e.target.value)} />
              </label>
            </div>
          </section>

          <section className="sa-edit-section full">
            <h3>Enabled Modules</h3>

            <div className="sa-module-grid">
              {allModules.map((moduleKey) => (
                <button
                  type="button"
                  key={moduleKey}
                  className={`sa-module-chip ${form.enabledModules.includes(moduleKey) ? "active" : ""}`}
                  onClick={() => toggleModule(moduleKey)}
                >
                  {form.enabledModules.includes(moduleKey) ? "âœ“" : "+"} {moduleLabels[moduleKey] || moduleKey}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="sa-modal-actions">
          <button className="sa-soft-btn" onClick={onClose}>Cancel</button>
          <button className="sa-primary-btn" onClick={() => onSave(user, form)} disabled={saving}>
            {saving ? "Saving..." : "Save User Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserCard({ user, onEdit, onToggle }) {
  const tone = statusTone(user);
  const modules = user.enabledModules || user.subscription?.enabledModules || [];
  const expiry = user.expiryDate || user.subscription?.expiryDate || "Not set";

  return (
    <div className="sa-user-card">
      <div className="sa-user-top">
        <div>
          <h3>{user.restaurantName || user.tenant?.restaurantName || user.username}</h3>
          <p>{user.username} Â· {user.email || "No email"}</p>
        </div>

        <span className={`sa-status ${tone.cls}`}>{tone.label}</span>
      </div>

      <div className="sa-user-meta">
        <div>
          <span>Package</span>
          <strong>{user.packageName || user.subscription?.packageName || "Starter"}</strong>
        </div>

        <div>
          <span>Expiry</span>
          <strong>{expiry}</strong>
        </div>

        <div>
          <span>Modules</span>
          <strong>{modules.length}</strong>
        </div>
      </div>

      <div className="sa-module-preview">
        {modules.slice(0, 7).map((moduleKey) => (
          <span key={moduleKey}>{moduleLabels[moduleKey] || moduleKey}</span>
        ))}
        {modules.length > 7 ? <span>+{modules.length - 7}</span> : null}
      </div>

      <div className="sa-card-actions">
        <button className="sa-primary-btn" onClick={() => onEdit(user)}>Edit User</button>
        <button
          className={user.isActive === false || user.status === "inactive" ? "sa-soft-btn" : "sa-danger-btn"}
          onClick={() => onToggle(user)}
        >
          {user.isActive === false || user.status === "inactive" ? "Activate" : "Deactivate"}
        </button>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard({ token, refreshSession, onOpenModule }) {
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);

    try {
      const res = await api(token).get("/api/super-admin-control/users");
      setUsers(res.data.users || []);
      setPackages(res.data.packages || []);
      setAllModules(res.data.allModules || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load super admin users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();

    return users.filter((user) => {
      return (
        !q ||
        String(user.username || "").toLowerCase().includes(q) ||
        String(user.email || "").toLowerCase().includes(q) ||
        String(user.restaurantName || "").toLowerCase().includes(q) ||
        String(user.packageName || "").toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  async function saveUser(user, form) {
    setSaving(true);

    try {
      const res = await api(token).patch(`/api/super-admin-control/users/${user.id}`, form);

      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? res.data.user : item))
      );

      setEditingUser(null);
      alert("User settings updated successfully.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update user settings.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleUser(user) {
    const nextActive = user.isActive === false || user.status === "inactive";

    try {
      await api(token).patch(`/api/super-admin-control/users/${user.id}/status`, {
        isActive: nextActive
      });

      await loadUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update user status.");
    }
  }

  const stats = {
    total: users.length,
    active: users.filter((user) => statusTone(user).cls === "active").length,
    expired: users.filter((user) => statusTone(user).cls === "expired").length,
    inactive: users.filter((user) => statusTone(user).cls === "inactive").length
  };

  return (
    <div className="sa-page">
      <style>
        {`
          .sa-page {
            min-height: calc(100vh - 72px);
            padding: 18px;
            color: white;
            background:
              radial-gradient(circle at 12% 16%, rgba(34,211,238,.12), transparent 28%),
              radial-gradient(circle at 84% 12%, rgba(168,85,247,.12), transparent 30%),
              linear-gradient(180deg,#020617,#071028);
          }

          .sa-head {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            align-items: start;
            margin-bottom: 16px;
          }

          .sa-title {
            margin: 0;
            font-size: 36px;
            font-weight: 1000;
            letter-spacing: -.04em;
          }

          .sa-sub {
            margin: 6px 0 0;
            color: #94a3b8;
          }

          .sa-head-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .sa-primary-btn,
          .sa-soft-btn,
          .sa-danger-btn,
          .sa-icon-btn {
            border: 0;
            color: white;
            font-weight: 900;
            cursor: pointer;
            transition: .18s ease;
          }

          .sa-primary-btn,
          .sa-soft-btn,
          .sa-danger-btn {
            min-height: 43px;
            border-radius: 15px;
            padding: 0 14px;
          }

          .sa-primary-btn {
            background: linear-gradient(135deg,#06b6d4,#2563eb);
          }

          .sa-soft-btn,
          .sa-icon-btn {
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.10);
          }

          .sa-danger-btn {
            background: rgba(239,68,68,.16);
            border: 1px solid rgba(239,68,68,.24);
            color: #fecaca;
          }

          .sa-primary-btn:disabled {
            opacity: .55;
            cursor: not-allowed;
          }

          .sa-icon-btn {
            width: 46px;
            height: 46px;
            border-radius: 16px;
          }

          .sa-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 14px;
          }

          .sa-stat {
            padding: 15px;
            border-radius: 23px;
            background: rgba(15,23,42,.78);
            border: 1px solid rgba(255,255,255,.10);
          }

          .sa-stat span {
            color: #94a3b8;
            font-size: 12px;
            font-weight: 800;
          }

          .sa-stat strong {
            display: block;
            margin-top: 6px;
            font-size: 29px;
            font-weight: 1000;
          }

          .sa-toolbar {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 12px;
            padding: 14px;
            border-radius: 24px;
            background: rgba(15,23,42,.78);
            border: 1px solid rgba(255,255,255,.10);
            margin-bottom: 14px;
          }

          .sa-search {
            height: 45px;
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,.10);
            background: rgba(255,255,255,.07);
            color: white;
            padding: 0 14px;
            outline: none;
            font-weight: 800;
          }

          .sa-user-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 14px;
          }

          .sa-user-card {
            padding: 15px;
            border-radius: 26px;
            background: rgba(15,23,42,.80);
            border: 1px solid rgba(255,255,255,.10);
            box-shadow: 0 20px 50px rgba(0,0,0,.22);
          }

          .sa-user-top {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: start;
          }

          .sa-user-top h3 {
            margin: 0;
            font-size: 22px;
          }

          .sa-user-top p {
            margin: 5px 0 0;
            color: #94a3b8;
            font-size: 13px;
          }

          .sa-status {
            border-radius: 999px;
            padding: 7px 10px;
            font-size: 12px;
            font-weight: 950;
          }

          .sa-status.active {
            color: #86efac;
            background: rgba(34,197,94,.13);
            border: 1px solid rgba(34,197,94,.24);
          }

          .sa-status.expired {
            color: #fde68a;
            background: rgba(250,204,21,.13);
            border: 1px solid rgba(250,204,21,.24);
          }

          .sa-status.inactive {
            color: #fca5a5;
            background: rgba(239,68,68,.13);
            border: 1px solid rgba(239,68,68,.24);
          }

          .sa-user-meta {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 9px;
            margin-top: 13px;
          }

          .sa-user-meta div {
            padding: 10px;
            border-radius: 16px;
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.08);
          }

          .sa-user-meta span {
            color: #94a3b8;
            font-size: 11px;
            font-weight: 800;
          }

          .sa-user-meta strong {
            display: block;
            margin-top: 5px;
            font-size: 13px;
          }

          .sa-module-preview {
            margin-top: 12px;
            display: flex;
            gap: 7px;
            flex-wrap: wrap;
          }

          .sa-module-preview span {
            padding: 6px 9px;
            border-radius: 999px;
            background: rgba(34,211,238,.10);
            color: #a5f3fc;
            font-size: 11px;
            font-weight: 850;
          }

          .sa-card-actions {
            display: grid;
            grid-template-columns: 1fr 130px;
            gap: 9px;
            margin-top: 13px;
          }

          .sa-empty {
            padding: 28px;
            border-radius: 24px;
            background: rgba(15,23,42,.78);
            border: 1px solid rgba(255,255,255,.10);
            color: #94a3b8;
          }

          .sa-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(2,6,23,.75);
            backdrop-filter: blur(10px);
            display: grid;
            place-items: center;
            padding: 18px;
          }

          .sa-edit-modal {
            width: min(1180px, calc(100vw - 36px));
            max-height: calc(100vh - 36px);
            overflow: hidden;
            display: grid;
            grid-template-rows: auto 1fr auto;
            border-radius: 30px;
            background: #0f172a;
            border: 1px solid rgba(255,255,255,.12);
            box-shadow: 0 30px 90px rgba(0,0,0,.45);
          }

          .sa-modal-head {
            padding: 18px 20px;
            border-bottom: 1px solid rgba(255,255,255,.08);
            display: flex;
            justify-content: space-between;
            gap: 12px;
          }

          .sa-modal-head h2 {
            margin: 0;
          }

          .sa-modal-head p {
            margin: 5px 0 0;
            color: #94a3b8;
          }

          .sa-edit-grid {
            overflow-y: auto;
            min-height: 0;
            padding: 16px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }

          .sa-edit-section {
            border-radius: 24px;
            background: rgba(255,255,255,.055);
            border: 1px solid rgba(255,255,255,.09);
            padding: 14px;
          }

          .sa-edit-section.full {
            grid-column: 1 / -1;
          }

          .sa-edit-section h3 {
            margin: 0 0 12px;
            font-size: 18px;
          }

          .sa-form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .sa-form-grid label,
          .sa-switch-row {
            display: grid;
            gap: 7px;
          }

          .sa-form-grid span {
            color: #cbd5e1;
            font-size: 12px;
            font-weight: 850;
          }

          .sa-form-grid input {
            height: 43px;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,.10);
            background: rgba(255,255,255,.08);
            color: white;
            padding: 0 12px;
            outline: none;
            font-weight: 800;
          }

          .sa-switch-row {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            border-radius: 16px;
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.08);
          }

          .sa-switch-row input {
            width: 22px;
            height: 22px;
          }

          .sa-package-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .sa-package-card {
            min-height: 95px;
            border-radius: 18px;
            border: 1px solid rgba(255,255,255,.10);
            background: rgba(255,255,255,.06);
            color: white;
            cursor: pointer;
            display: grid;
            justify-items: start;
            align-content: center;
            gap: 5px;
            padding: 12px;
            text-align: left;
          }

          .sa-package-card.active {
            background: rgba(34,211,238,.14);
            border-color: rgba(34,211,238,.34);
          }

          .sa-package-card span,
          .sa-package-card small {
            color: #94a3b8;
          }

          .sa-module-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .sa-module-chip {
            min-height: 37px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,.10);
            background: rgba(255,255,255,.07);
            color: white;
            padding: 0 12px;
            cursor: pointer;
            font-weight: 850;
          }

          .sa-module-chip.active {
            background: rgba(34,211,238,.16);
            border-color: rgba(34,211,238,.34);
            color: #a5f3fc;
          }

          .sa-modal-actions {
            padding: 14px 16px;
            border-top: 1px solid rgba(255,255,255,.08);
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          @media (max-width: 900px) {
            .sa-stats,
            .sa-toolbar,
            .sa-edit-grid,
            .sa-form-grid,
            .sa-package-grid {
              grid-template-columns: 1fr;
            }

            .sa-edit-section.full {
              grid-column: auto;
            }

            .sa-head {
              display: grid;
            }

            .sa-head-actions {
              justify-content: flex-start;
            }
          }
        `}
      </style>

      <div className="sa-head">
        <div>
          <h1 className="sa-title">Super Admin Control Center</h1>
          <p className="sa-sub">
            Manage customers, active users, packages, expiry days, passwords and enabled modules.
          </p>
        </div>

        <div className="sa-head-actions">
          <button className="sa-soft-btn" onClick={loadUsers}>Refresh</button>
          <button className="sa-primary-btn" onClick={() => onOpenModule?.({ key: "super_packages", name: "Packages" })}>
            Package Builder
          </button>
          <button className="sa-soft-btn" onClick={() => onOpenModule?.({ key: "super_subscriptions", name: "Subscriptions" })}>
            Subscriptions
          </button>
        </div>
      </div>

      <div className="sa-stats">
        <div className="sa-stat"><span>Total Users</span><strong>{stats.total}</strong></div>
        <div className="sa-stat"><span>Active</span><strong>{stats.active}</strong></div>
        <div className="sa-stat"><span>Expired</span><strong>{stats.expired}</strong></div>
        <div className="sa-stat"><span>Inactive</span><strong>{stats.inactive}</strong></div>
      </div>

      <div className="sa-toolbar">
        <input
          className="sa-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user, restaurant, email, package..."
        />

        <button className="sa-primary-btn" onClick={loadUsers}>
          Reload Users
        </button>
      </div>

      {loading ? (
        <div className="sa-empty">Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="sa-empty">No client users found.</div>
      ) : (
        <div className="sa-user-grid">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={setEditingUser}
              onToggle={toggleUser}
            />
          ))}
        </div>
      )}

      {editingUser ? (
        <EditUserModal
          user={editingUser}
          packages={packages}
          allModules={allModules}
          onClose={() => setEditingUser(null)}
          onSave={saveUser}
          saving={saving}
        />
      ) : null}
    </div>
  );
}

