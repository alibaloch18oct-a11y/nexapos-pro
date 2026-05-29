import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import SuperClientSaasPanel from "./SuperClientSaasPanel";

const MODULES = [
  { key: "walk_in", label: "Walk In POS" },
  { key: "take_away", label: "Take Away" },
  { key: "delivery", label: "Delivery" },
  { key: "dine_in", label: "Dine In" },
  { key: "drive_thru", label: "Drive Thru" },
  { key: "orders", label: "Orders" },
  { key: "kds", label: "KDS Kitchen" },
  { key: "settings", label: "Menu Settings" },
  { key: "restaurant_settings", label: "Restaurant Settings" },
  { key: "inventory", label: "Inventory" },
  { key: "discounts", label: "Discounts" },
  { key: "staff", label: "Staff" },
  { key: "customers", label: "Customers" },
  { key: "analytics", label: "Reports" },
  { key: "expenses", label: "Expenses" },
  { key: "supplier_purchases", label: "Supplier Purchases" },
  { key: "stock_movements", label: "Stock Movements" },
  { key: "menu_inventory_mapping", label: "Menu Inventory Mapping" }
];

const EMPTY_FORM = {
  restaurantName: "",
  ownerName: "",
  username: "",
  password: "",
  phone: "",
  email: "",
  packageName: "Starter",
  maxBranches: 1,
  expiryDate: "",
  status: "active",
  subscriptionStatus: "active",
  paymentStatus: "paid",
  enabledModules: ["walk_in", "take_away", "delivery", "orders", "kds", "staff", "customers", "analytics"]
};

function todayPlus(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.clients)) return data.clients;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function safeText(value, fallback = "") {
  return String(value || fallback || "")
    .replace(/\uFFFD/g, "")
    .replace(/\u00C2/g, "")
    .replace(/\u00C3/g, "")
    .replace(/\u00E2/g, "")
    .replace(/\u00F0/g, "")
    .trim();
}

export default function SuperAdminDashboard({ token, session, onLogout }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, expiryDate: todayPlus(30) });

  const [saasClient, setSaasClient] = useState(null);
  const [search, setSearch] = useState("");

  async function loadClients() {
    setLoading(true);

    try {
      const res = await api(token).get("/api/super-admin-control/users");
      setClients(normalizeList(res.data));
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load clients.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;

    return clients.filter((client) => {
      return [
        client.restaurantName,
        client.ownerName,
        client.username,
        client.email,
        client.phone,
        client.packageName,
        client.status
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [clients, search]);

  function openCreateClient() {
    setEditingClient(null);
    setForm({
      ...EMPTY_FORM,
      expiryDate: todayPlus(30)
    });
    setShowClientModal(true);
  }

  function openEditClient(client) {
    setEditingClient(client);
    setForm({
      restaurantName: client.restaurantName || "",
      ownerName: client.ownerName || client.name || "",
      username: client.username || "",
      password: "",
      phone: client.phone || "",
      email: client.email || "",
      packageName: client.packageName || client.package || "Starter",
      maxBranches: Number(client.maxBranches || 1),
      expiryDate: String(client.expiryDate || "").slice(0, 10) || todayPlus(30),
      status: client.status || (client.isActive === false ? "inactive" : "active"),
      subscriptionStatus: client.subscriptionStatus || "active",
      paymentStatus: client.paymentStatus || "paid",
      enabledModules: Array.isArray(client.enabledModules)
        ? client.enabledModules
        : Array.isArray(client.modules)
          ? client.modules
          : EMPTY_FORM.enabledModules
    });
    setShowClientModal(true);
  }

  function closeClientModal() {
    setShowClientModal(false);
    setEditingClient(null);
    setSaving(false);
  }

  function toggleModule(key) {
    setForm((prev) => {
      const exists = prev.enabledModules.includes(key);

      return {
        ...prev,
        enabledModules: exists
          ? prev.enabledModules.filter((item) => item !== key)
          : [...prev.enabledModules, key]
      };
    });
  }

  function selectAllModules() {
    setForm((prev) => ({
      ...prev,
      enabledModules: MODULES.map((item) => item.key)
    }));
  }

  function clearModules() {
    setForm((prev) => ({
      ...prev,
      enabledModules: []
    }));
  }

  async function saveClient(event) {
    event.preventDefault();

    if (!form.restaurantName || !form.username) {
      alert("Restaurant name and username are required.");
      return;
    }

    if (!editingClient && !form.password) {
      alert("Password is required for new client.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        maxBranches: Number(form.maxBranches || 1),
        enabledModules: form.enabledModules || []
      };

      if (!payload.password) {
        delete payload.password;
      }

      if (editingClient?.id) {
        await api(token).patch(`/api/super-admin-control/users/${editingClient.id}`, payload);
        alert("Client updated successfully.");
      } else {
        await api(token).post("/api/super-admin-control/users", payload);
        alert("Client created successfully.");
      }

      closeClientModal();
      await loadClients();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save client.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleClientStatus(client) {
    try {
      const nextStatus = client.status === "inactive" || client.isActive === false ? "active" : "inactive";

      await api(token).patch(`/api/super-admin-control/users/${client.id}`, {
        status: nextStatus,
        isActive: nextStatus === "active"
      });

      await loadClients();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update client status.");
    }
  }

  async function extendClient(client, days) {
    try {
      const current = client.expiryDate ? new Date(client.expiryDate) : new Date();
      current.setDate(current.getDate() + days);

      await api(token).patch(`/api/super-admin-control/users/${client.id}`, {
        expiryDate: current.toISOString().slice(0, 10),
        subscriptionStatus: "active"
      });

      await loadClients();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to extend subscription.");
    }
  }

  if (saasClient) {
    return (
      <SuperClientSaasPanel
        token={token}
        client={saasClient}
        onBack={() => setSaasClient(null)}
      />
    );
  }

  return (
    <div className="super-admin-page">
      <style>{`
        .super-admin-page {
          min-height: 100vh;
          padding: 18px;
          color: white;
          background:
            radial-gradient(circle at 12% 18%, rgba(34,211,238,.14), transparent 28%),
            radial-gradient(circle at 88% 10%, rgba(168,85,247,.16), transparent 28%),
            linear-gradient(135deg,#020617,#0f172a);
        }

        .sa-head,
        .sa-toolbar,
        .sa-card,
        .sa-modal {
          border-radius: 28px;
          background: rgba(15,23,42,.78);
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: 0 22px 60px rgba(0,0,0,.24);
          backdrop-filter: blur(18px);
        }

        .sa-head {
          padding: 18px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .sa-title {
          margin: 8px 0 0;
          font-size: 38px;
          font-weight: 1000;
          letter-spacing: -.05em;
        }

        .sa-sub {
          margin: 8px 0 0;
          color: #94a3b8;
          font-weight: 750;
        }

        .sa-kicker {
          display: inline-flex;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(34,211,238,.13);
          color: #a5f3fc;
          border: 1px solid rgba(34,211,238,.24);
          font-size: 12px;
          font-weight: 1000;
        }

        .sa-btn {
          height: 44px;
          border: 0;
          border-radius: 16px;
          padding: 0 14px;
          color: white;
          font-weight: 1000;
          cursor: pointer;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.12);
        }

        .sa-primary {
          background: linear-gradient(135deg,#06b6d4,#2563eb);
          border: 0;
        }

        .sa-danger {
          background: rgba(239,68,68,.18);
          border-color: rgba(239,68,68,.28);
        }

        .sa-toolbar {
          padding: 14px;
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 10px;
          margin-bottom: 14px;
        }

        .sa-input,
        .sa-select {
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

        .sa-select option {
          background: #020617;
          color: white;
        }

        .sa-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: 14px;
        }

        .sa-card {
          padding: 16px;
          min-width: 0;
          overflow: hidden;
        }

        .sa-card h3 {
          margin: 0;
          font-size: 21px;
          font-weight: 1000;
          word-break: break-word;
        }

        .sa-card p {
          margin: 6px 0;
          color: #94a3b8;
          font-weight: 800;
          word-break: break-word;
        }

        .sa-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .sa-badge {
          display: inline-flex;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(34,211,238,.12);
          border: 1px solid rgba(34,211,238,.22);
          color: #a5f3fc;
          font-size: 12px;
          font-weight: 1000;
        }

        .sa-badge.warn {
          background: rgba(250,204,21,.12);
          border-color: rgba(250,204,21,.22);
          color: #fde68a;
        }

        .sa-badge.danger {
          background: rgba(239,68,68,.12);
          border-color: rgba(239,68,68,.22);
          color: #fca5a5;
        }

        .sa-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .sa-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(2,6,23,.78);
          display: grid;
          place-items: center;
          z-index: 9999;
          padding: 18px;
        }

        .sa-modal {
          width: min(980px, 96vw);
          max-height: 92vh;
          overflow: auto;
          padding: 18px;
        }

        .sa-modal-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 14px;
        }

        .sa-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .sa-module-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 8px;
          margin-top: 10px;
        }

        .sa-chip {
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 16px;
          padding: 10px;
          background: rgba(255,255,255,.06);
          color: white;
          font-weight: 900;
          cursor: pointer;
          text-align: left;
        }

        .sa-chip.active {
          background: rgba(34,211,238,.18);
          border-color: rgba(34,211,238,.45);
          color: #a5f3fc;
        }

        @media (max-width: 850px) {
          .sa-head,
          .sa-toolbar,
          .sa-form-grid {
            grid-template-columns: 1fr;
            flex-direction: column;
          }

          .sa-toolbar {
            display: grid;
          }
        }
      `}</style>

      <header className="sa-head">
        <div>
          <div className="sa-kicker">Super Admin Master Control</div>
          <h1 className="sa-title">NexaPOS SaaS Command Center</h1>
          <p className="sa-sub">
            Create restaurant clients, manage packages, modules, branches and all role-based logins.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="sa-btn" onClick={loadClients}>Refresh</button>
          <button className="sa-btn sa-primary" onClick={openCreateClient}>Add New Client</button>
          {onLogout ? <button className="sa-btn sa-danger" onClick={onLogout}>Logout</button> : null}
        </div>
      </header>

      <section className="sa-toolbar">
        <input
          className="sa-input"
          placeholder="Search clients by restaurant, username, owner, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="sa-btn" onClick={selectAllModules}>Default Modules</button>
        <button className="sa-btn sa-primary" onClick={openCreateClient}>Create Client</button>
      </section>

      {loading ? (
        <div className="sa-card">Loading clients...</div>
      ) : filteredClients.length === 0 ? (
        <div className="sa-card">No clients found. Click Add New Client.</div>
      ) : (
        <section className="sa-grid">
          {filteredClients.map((client) => {
            const active = client.status !== "inactive" && client.isActive !== false;
            const modules = Array.isArray(client.enabledModules) ? client.enabledModules : [];

            return (
              <article className="sa-card" key={client.id || client.username}>
                <h3>{safeText(client.restaurantName, "Restaurant Client")}</h3>
                <p>@{safeText(client.username, "username")}</p>
                <p>{safeText(client.ownerName || client.name, "Owner")} - {safeText(client.phone, "No phone")}</p>
                <p>{safeText(client.email, "No email")}</p>

                <div className="sa-badges">
                  <span className={active ? "sa-badge" : "sa-badge danger"}>{active ? "Active" : "Inactive"}</span>
                  <span className="sa-badge">{safeText(client.packageName || client.package, "Package")}</span>
                  <span className="sa-badge">Branches: {client.maxBranches || 1}</span>
                  <span className={client.paymentStatus === "unpaid" ? "sa-badge warn" : "sa-badge"}>
                    {safeText(client.paymentStatus, "paid")}
                  </span>
                </div>

                <div className="sa-badges">
                  {modules.slice(0, 7).map((key) => (
                    <span className="sa-badge" key={key}>{safeText(MODULES.find((m) => m.key === key)?.label, key)}</span>
                  ))}
                  {modules.length > 7 ? <span className="sa-badge">+{modules.length - 7} more</span> : null}
                </div>

                <div className="sa-actions">
                  <button className="sa-btn sa-primary" onClick={() => setSaasClient(client)}>SaaS Setup</button>
                  <button className="sa-btn" onClick={() => openEditClient(client)}>Edit</button>
                  <button className="sa-btn" onClick={() => extendClient(client, 7)}>+7 days</button>
                  <button className="sa-btn" onClick={() => extendClient(client, 30)}>+30 days</button>
                  <button className={active ? "sa-btn sa-danger" : "sa-btn sa-primary"} onClick={() => toggleClientStatus(client)}>
                    {active ? "Disable" : "Activate"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showClientModal ? (
        <div className="sa-modal-backdrop">
          <form className="sa-modal" onSubmit={saveClient}>
            <div className="sa-modal-head">
              <div>
                <div className="sa-kicker">{editingClient ? "Edit Client" : "Create Client"}</div>
                <h2 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 1000 }}>
                  {editingClient ? "Edit Restaurant Client" : "Add New Restaurant Client"}
                </h2>
              </div>

              <button className="sa-btn" type="button" onClick={closeClientModal}>x</button>
            </div>

            <div className="sa-form-grid">
              <input className="sa-input" placeholder="Restaurant name" value={form.restaurantName} onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} />
              <input className="sa-input" placeholder="Owner name" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
              <input className="sa-input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <input className="sa-input" placeholder={editingClient ? "New password optional" : "Password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <input className="sa-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="sa-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

              <select className="sa-select" value={form.packageName} onChange={(e) => setForm({ ...form, packageName: e.target.value })}>
                <option value="Starter">Starter</option>
                <option value="Business">Business</option>
                <option value="Enterprise Multi-Branch">Enterprise Multi-Branch</option>
              </select>

              <input className="sa-input" type="number" min="1" placeholder="Max branches" value={form.maxBranches} onChange={(e) => setForm({ ...form, maxBranches: e.target.value })} />

              <input className="sa-input" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />

              <select className="sa-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select className="sa-select" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>

              <select className="sa-select" value={form.subscriptionStatus} onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })}>
                <option value="active">Subscription Active</option>
                <option value="expired">Expired</option>
                <option value="trial">Trial</option>
              </select>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>Enabled Modules</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="sa-btn" type="button" onClick={selectAllModules}>Select All</button>
                  <button className="sa-btn" type="button" onClick={clearModules}>Clear</button>
                </div>
              </div>

              <div className="sa-module-grid">
                {MODULES.map((module) => (
                  <button
                    key={module.key}
                    type="button"
                    className={form.enabledModules.includes(module.key) ? "sa-chip active" : "sa-chip"}
                    onClick={() => toggleModule(module.key)}
                  >
                    {module.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="sa-btn" type="button" onClick={closeClientModal}>Cancel</button>
              <button className="sa-btn sa-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingClient ? "Save Changes" : "Create Client"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
