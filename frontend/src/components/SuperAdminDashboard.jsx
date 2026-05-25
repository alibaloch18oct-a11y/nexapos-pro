import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Building2,
  CalendarClock,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { api } from "../lib/api";

const defaultForm = {
  restaurantName: "",
  ownerName: "",
  username: "",
  password: "",
  phone: "",
  email: "",
  packageName: "Custom",
  expiryDate: "",
  enabledModules: []
};

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="nexa-field">
      <span className="nexa-label">{label}</span>
      <div className="nexa-input-wrap">
        <input
          className="nexa-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
        />
      </div>
    </label>
  );
}

function ModuleToggle({ module, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 18,
        border: active ? "1px solid rgba(34,211,238,.55)" : "1px solid rgba(255,255,255,.10)",
        background: active ? "rgba(34,211,238,.15)" : "rgba(255,255,255,.055)",
        color: "white",
        padding: 11,
        textAlign: "left",
        minHeight: 70,
        cursor: "pointer"
      }}
    >
      <strong>{module.name}</strong>
      <p className="nexa-small" style={{ marginBottom: 0 }}>
        {module.description}
      </p>
    </button>
  );
}

function getExpiryStatus(tenant) {
  if (!tenant.expiryDate) {
    return {
      label: "No expiry",
      color: "#a5f3fc",
      expired: false,
      soon: false
    };
  }

  const expiry = new Date(tenant.expiryDate);
  const now = new Date();
  const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return {
      label: "Expired",
      color: "#fca5a5",
      expired: true,
      soon: false
    };
  }

  if (days <= 7) {
    return {
      label: `${days} days left`,
      color: "#fde68a",
      expired: false,
      soon: true
    };
  }

  return {
    label: `${days} days left`,
    color: "#86efac",
    expired: false,
    soon: false
  };
}

export default function SuperAdminDashboard({ token, refreshSession, onOpenModule }) {
  const [tenants, setTenants] = useState([]);
  const [modules, setModules] = useState([]);
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const tenantsWithStatus = useMemo(() => {
    return tenants.map((tenant) => ({
      ...tenant,
      expiryStatus: getExpiryStatus(tenant)
    }));
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    return tenantsWithStatus.filter((tenant) => {
      if (!search) return true;

      const query = search.toLowerCase();

      return (
        tenant.restaurantName.toLowerCase().includes(query) ||
        tenant.ownerName.toLowerCase().includes(query) ||
        String(tenant.phone || "").toLowerCase().includes(query) ||
        String(tenant.packageName || "").toLowerCase().includes(query) ||
        String(tenant.paymentStatus || "").toLowerCase().includes(query)
      );
    });
  }, [tenantsWithStatus, search]);

  async function loadData() {
    try {
      const [tenantRes, moduleRes, packageRes] = await Promise.all([
        api(token).get("/api/super/tenants"),
        api(token).get("/api/modules"),
        api(token).get("/api/packages")
      ]);

      setTenants(tenantRes.data || []);
      setModules(moduleRes.data || []);
      setPackages(packageRes.data.packages || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load super admin data.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleModule(key) {
    if (form.enabledModules.includes(key)) {
      setValue("enabledModules", form.enabledModules.filter((item) => item !== key));
    } else {
      setValue("enabledModules", [...form.enabledModules, key]);
    }
  }

  function applyPackage(packageId) {
    const plan = packages.find((item) => item.id === packageId);

    if (!plan) return;

    setForm((prev) => ({
      ...prev,
      packageName: plan.name,
      enabledModules: plan.enabledModules || []
    }));
  }

  async function createTenant(e) {
    e.preventDefault();

    if (!form.restaurantName || !form.ownerName || !form.username || !form.password) {
      alert("Restaurant name, owner name, username and password are required.");
      return;
    }

    setSaving(true);

    try {
      await api(token).post("/api/super/tenants", form);
      alert("Client created successfully.");

      setForm(defaultForm);
      setShowForm(false);
      await loadData();
      await refreshSession?.();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create client.");
    } finally {
      setSaving(false);
    }
  }

  async function quickToggleModule(tenant, moduleKey) {
    const enabled = tenant.enabledModules || [];
    const nextModules = enabled.includes(moduleKey)
      ? enabled.filter((item) => item !== moduleKey)
      : [...enabled, moduleKey];

    try {
      await api(token).patch(`/api/super/tenants/${tenant.id}/modules`, {
        enabledModules: nextModules
      });

      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update modules.");
    }
  }

  const activeTenants = tenantsWithStatus.filter((tenant) => tenant.status === "active" && !tenant.expiryStatus.expired);
  const expiredTenants = tenantsWithStatus.filter((tenant) => tenant.expiryStatus.expired);
  const expiringTenants = tenantsWithStatus.filter((tenant) => tenant.expiryStatus.soon);

  return (
    <div className="nexa-container">
      <div className="nexa-hero-panel">
        <div className="nexa-badge">
          <ShieldCheck size={16} /> Super Admin Control
        </div>
        <h2 className="nexa-client-title">NexaPOS Pro Command Center</h2>
        <p className="nexa-hero-p">
          Create restaurant clients, assign packages, monitor renewals and lock expired accounts from one SaaS control center.
        </p>
      </div>

      <div className="nexa-stats">
        {[
          ["Total Clients", tenants.length, Building2],
          ["Active Clients", activeTenants.length, CheckCircle2],
          ["Expired", expiredTenants.length, ShieldAlert],
          ["Expiring Soon", expiringTenants.length, CalendarClock],
          ["Packages", packages.length, PackagePlus]
        ].map(([label, value, Icon]) => (
          <div className="nexa-stat-card" key={label}>
            <Icon color="#d8b4fe" size={30} />
            <p className="nexa-stat-label">{label}</p>
            <p className="nexa-stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div className="nexa-row-between" style={{ marginBottom: 14 }}>
        <div>
          <h3 className="nexa-section-title">Client Management</h3>
          <p className="nexa-section-sub">One app, many restaurant clients, separate data per account.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="nexa-logout" onClick={loadData}>
            <RefreshCw size={16} /> Refresh
          </button>

          <button className="nexa-logout" onClick={() => onOpenModule?.({ key: "super_subscriptions" })}>
            <BadgeDollarSign size={16} /> Subscriptions
          </button>

          <button className="nexa-logout" onClick={() => onOpenModule?.({ key: "super_packages" })}>
            <PackagePlus size={16} /> Package Builder
          </button>

          <button className="nexa-create-btn" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> {showForm ? "Close Form" : "Create Client"}
          </button>
        </div>
      </div>

      {showForm ? (
        <form className="nexa-panel" onSubmit={createTenant} style={{ marginBottom: 16 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>Create Restaurant Client</h2>
              <p className="nexa-section-sub">Create login and enable selected modules.</p>
            </div>
            <Sparkles color="#a5f3fc" size={28} />
          </div>

          <div className="nexa-form-grid">
            <Field label="Restaurant Name" value={form.restaurantName} onChange={(v) => setValue("restaurantName", v)} />
            <Field label="Owner Name" value={form.ownerName} onChange={(v) => setValue("ownerName", v)} />
          </div>

          <div className="nexa-form-grid">
            <Field label="Username" value={form.username} onChange={(v) => setValue("username", v)} />
            <Field label="Password" value={form.password} onChange={(v) => setValue("password", v)} />
          </div>

          <div className="nexa-form-grid">
            <Field label="Phone" value={form.phone} onChange={(v) => setValue("phone", v)} />
            <Field label="Email" value={form.email} onChange={(v) => setValue("email", v)} />
          </div>

          <div className="nexa-form-grid">
            <label className="nexa-field">
              <span className="nexa-label">Apply Package</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  onChange={(e) => applyPackage(e.target.value)}
                  defaultValue=""
                >
                  <option value="">Select package template</option>
                  {packages.filter((plan) => plan.isActive !== false).map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · Rs {plan.monthlyPrice}/month
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <Field label="Expiry Date" type="date" value={form.expiryDate} onChange={(v) => setValue("expiryDate", v)} />
          </div>

          <Field label="Package Name" value={form.packageName} onChange={(v) => setValue("packageName", v)} />

          <div style={{ marginTop: 14 }}>
            <div className="nexa-row-between">
              <strong>Select Modules</strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="nexa-pill" onClick={() => setValue("enabledModules", modules.map((module) => module.key))}>
                  Select All
                </button>
                <button type="button" className="nexa-pill" onClick={() => setValue("enabledModules", [])}>
                  Clear
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10, marginTop: 10 }}>
              {modules.map((module) => (
                <ModuleToggle
                  key={module.key}
                  module={module}
                  active={form.enabledModules.includes(module.key)}
                  onClick={() => toggleModule(module.key)}
                />
              ))}
            </div>
          </div>

          <button className="nexa-create-btn" disabled={saving} style={{ width: "100%", marginTop: 16 }}>
            <KeyRound size={16} />
            {saving ? "Creating Client..." : "Create Client Login"}
          </button>
        </form>
      ) : null}

      <div className="nexa-panel">
        <div className="nexa-row-between" style={{ marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0 }}>Restaurant Clients</h2>
            <p className="nexa-section-sub">{filteredTenants.length} clients showing</p>
          </div>

          <div className="nexa-input-wrap" style={{ minWidth: 300 }}>
            <Search size={16} color="#a5f3fc" />
            <input
              className="nexa-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
          {filteredTenants.map((tenant) => (
            <div
              key={tenant.id}
              style={{
                borderRadius: 22,
                border: tenant.expiryStatus.expired ? "1px solid rgba(239,68,68,.38)" : "1px solid rgba(255,255,255,.11)",
                background: tenant.expiryStatus.expired ? "rgba(239,68,68,.10)" : "rgba(255,255,255,.055)",
                padding: 14
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{tenant.restaurantName}</h3>
                  <p className="nexa-small">Owner: {tenant.ownerName}</p>
                  <p className="nexa-small">Package: {tenant.packageName || "Custom"}</p>
                </div>

                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 16,
                    background: tenant.expiryStatus.expired ? "rgba(239,68,68,.16)" : "rgba(34,211,238,.14)",
                    display: "grid",
                    placeItems: "center",
                    color: tenant.expiryStatus.color
                  }}
                >
                  {tenant.expiryStatus.expired ? <ShieldAlert size={22} /> : <Building2 size={22} />}
                </div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div className="nexa-pill">
                  <Users size={14} /> Users {tenant.usersCount || 0}
                </div>
                <div className="nexa-pill">
                  <ShieldCheck size={14} /> {tenant.status}
                </div>
                <div className="nexa-pill" style={{ color: tenant.expiryStatus.color }}>
                  <CalendarClock size={14} /> {tenant.expiryStatus.label}
                </div>
                <div className="nexa-pill">
                  <PackagePlus size={14} /> {tenant.enabledModules?.length || 0} modules
                </div>
                <div className="nexa-pill">
                  Pay: {tenant.paymentStatus || "trial"}
                </div>
                <div className="nexa-pill">
                  Sub: {tenant.subscriptionStatus || "active"}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <p className="nexa-small">Quick Module Toggle</p>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {modules.slice(0, 10).map((module) => {
                    const enabled = tenant.enabledModules?.includes(module.key);

                    return (
                      <button
                        key={module.key}
                        className="nexa-pill"
                        onClick={() => quickToggleModule(tenant, module.key)}
                        style={{
                          background: enabled ? "rgba(34,197,94,.18)" : "rgba(255,255,255,.06)",
                          color: enabled ? "#86efac" : "#cbd5e1"
                        }}
                      >
                        {enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                        {module.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 16,
                  background: "rgba(2,6,23,.48)",
                  border: "1px solid rgba(255,255,255,.08)"
                }}
              >
                <p className="nexa-small">Login URL</p>
                <strong>Use same app link with this client username/password.</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}