import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Box,
  Building2,
  CalendarClock,
  ChevronLeft,
  Eye,
  EyeOff,
  PackagePlus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X
} from "lucide-react";
import { api } from "../lib/api";

const emptyPackage = {
  id: "",
  name: "",
  description: "",
  monthlyPrice: "",
  yearlyPrice: "",
  maxUsers: "1",
  maxBranches: "1",
  enabledModules: [],
  isActive: true
};

const emptyAssign = {
  tenantId: "",
  packageId: "",
  billingCycle: "monthly",
  expiryDate: "",
  overrideModules: []
};

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="nexa-field">
      <span className="nexa-label">{label}</span>
      <div className="nexa-input-wrap">
        <input
          className="nexa-input"
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
        />
      </div>
    </label>
  );
}

function moduleName(module) {
  return module?.name || module?.key || "Module";
}

function getAllModules(modules) {
  const extras = [
    {
      key: "restaurant_settings",
      name: "Branding & Receipt",
      description: "Restaurant branding, tax, service and receipt settings.",
      icon: "Building2"
    },
    {
      key: "staff",
      name: "Staff Management",
      description: "Waiters, riders, cashiers and kitchen staff.",
      icon: "Users"
    },
    {
      key: "discounts",
      name: "Discount System",
      description: "Cash/card/item/order/coupon discounts.",
      icon: "BadgePercent"
    },
    {
      key: "inventory",
      name: "Inventory",
      description: "Stock, low stock and stock deduction.",
      icon: "Boxes"
    }
  ];

  return [...modules, ...extras].filter((module, index, arr) => {
    return arr.findIndex((item) => item.key === module.key) === index;
  });
}

function ModuleSelector({ modules, selected, onChange }) {
  function toggle(key) {
    if (selected.includes(key)) {
      onChange(selected.filter((item) => item !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  function selectAll() {
    onChange(modules.map((module) => module.key));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div className="nexa-row-between" style={{ marginBottom: 10 }}>
        <strong>Included Modules</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="nexa-pill" onClick={selectAll}>Select All</button>
          <button type="button" className="nexa-pill" onClick={clearAll}>Clear</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 9 }}>
        {modules.map((module) => {
          const active = selected.includes(module.key);

          return (
            <button
              type="button"
              key={module.key}
              onClick={() => toggle(module.key)}
              style={{
                minHeight: 70,
                borderRadius: 18,
                border: active ? "1px solid rgba(34,211,238,.55)" : "1px solid rgba(255,255,255,.10)",
                background: active ? "rgba(34,211,238,.15)" : "rgba(255,255,255,.055)",
                color: "white",
                textAlign: "left",
                padding: 11,
                cursor: "pointer"
              }}
            >
              <strong>{moduleName(module)}</strong>
              <p className="nexa-small" style={{ marginBottom: 0 }}>{module.key}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PackageCard({ plan, modules, active, onEdit, onToggle, onDelete }) {
  const included = modules.filter((module) => plan.enabledModules?.includes(module.key));

  return (
    <div
      style={{
        borderRadius: 22,
        border: active ? "1px solid rgba(34,211,238,.55)" : "1px solid rgba(255,255,255,.11)",
        background: active ? "rgba(34,211,238,.12)" : "rgba(255,255,255,.055)",
        padding: 14
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{plan.name}</h3>
          <p className="nexa-small">{plan.description || "No description"}</p>
        </div>

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 16,
            background: "rgba(34,211,238,.14)",
            display: "grid",
            placeItems: "center",
            color: "#a5f3fc"
          }}
        >
          <PackagePlus size={22} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <div className="nexa-pill">Monthly Rs {plan.monthlyPrice}</div>
        <div className="nexa-pill">Yearly Rs {plan.yearlyPrice}</div>
        <div className="nexa-pill">
          <Users size={14} /> {plan.maxUsers} users
        </div>
        <div className="nexa-pill">
          <Building2 size={14} /> {plan.maxBranches} branches
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <p className="nexa-small">Modules: {included.length}</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {included.slice(0, 8).map((module) => (
            <span key={module.key} className="nexa-pill">{moduleName(module)}</span>
          ))}
          {included.length > 8 ? <span className="nexa-pill">+{included.length - 8} more</span> : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
        <button className="nexa-pill" type="button" onClick={() => onEdit(plan)}>Edit</button>
        <button className="nexa-pill" type="button" onClick={() => onToggle(plan)}>
          {plan.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button className="nexa-logout" type="button" onClick={() => onDelete(plan)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function PackageBuilderPanel({ token, onBack }) {
  const [packages, setPackages] = useState([]);
  const [modules, setModules] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState(emptyPackage);
  const [assignForm, setAssignForm] = useState(emptyAssign);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const allModules = useMemo(() => getAllModules(modules), [modules]);

  const filteredPackages = useMemo(() => {
    return packages.filter((plan) => {
      if (!search) return true;

      const query = search.toLowerCase();

      return (
        plan.name.toLowerCase().includes(query) ||
        String(plan.description || "").toLowerCase().includes(query)
      );
    });
  }, [packages, search]);

  const selectedPackageForAssign = packages.find((plan) => plan.id === assignForm.packageId);

  async function loadAll() {
    try {
      const [packagesRes, modulesRes, tenantsRes] = await Promise.all([
        api(token).get("/api/packages"),
        api(token).get("/api/modules"),
        api(token).get("/api/super/tenants")
      ]);

      setPackages(packagesRes.data.packages || []);
      setModules(modulesRes.data || []);
      setTenants(tenantsRes.data || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load packages.");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setAssignValue(key, value) {
    setAssignForm((prev) => ({ ...prev, [key]: value }));
  }

  function editPackage(plan) {
    setForm({
      id: plan.id,
      name: plan.name || "",
      description: plan.description || "",
      monthlyPrice: String(plan.monthlyPrice || ""),
      yearlyPrice: String(plan.yearlyPrice || ""),
      maxUsers: String(plan.maxUsers || "1"),
      maxBranches: String(plan.maxBranches || "1"),
      enabledModules: Array.isArray(plan.enabledModules) ? plan.enabledModules : [],
      isActive: plan.isActive !== false
    });
  }

  function resetForm() {
    setForm(emptyPackage);
  }

  async function savePackage(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Package name is required.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name,
      description: form.description,
      monthlyPrice: Number(form.monthlyPrice || 0),
      yearlyPrice: Number(form.yearlyPrice || 0),
      maxUsers: Number(form.maxUsers || 1),
      maxBranches: Number(form.maxBranches || 1),
      enabledModules: form.enabledModules,
      isActive: form.isActive
    };

    try {
      if (form.id) {
        await api(token).put(`/api/packages/${form.id}`, payload);
      } else {
        await api(token).post("/api/packages", payload);
      }

      resetForm();
      await loadAll();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save package.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePackage(plan) {
    try {
      await api(token).patch(`/api/packages/${plan.id}/toggle`);
      await loadAll();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update package.");
    }
  }

  async function deletePackage(plan) {
    if (!confirm(`Delete package "${plan.name}"?`)) return;

    try {
      await api(token).delete(`/api/packages/${plan.id}`);
      await loadAll();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete package.");
    }
  }

  async function assignPackage(e) {
    e.preventDefault();

    if (!assignForm.tenantId || !assignForm.packageId) {
      alert("Select client and package.");
      return;
    }

    setAssigning(true);

    try {
      const payload = {
        tenantId: assignForm.tenantId,
        packageId: assignForm.packageId,
        billingCycle: assignForm.billingCycle,
        expiryDate: assignForm.expiryDate,
        overrideModules: assignForm.overrideModules
      };

      const res = await api(token).post("/api/packages/assign", payload);

      alert(res.data.message || "Package assigned successfully.");

      setAssignForm(emptyAssign);
      await loadAll();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to assign package.");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 18 }}>
      <div className="nexa-row-between">
        <div>
          <button className="nexa-logout" onClick={onBack}>
            <ChevronLeft size={18} /> Back
          </button>
          <h1 className="nexa-section-title" style={{ marginTop: 16 }}>
            Super Admin Package Builder
          </h1>
          <p className="nexa-section-sub">
            Build SaaS packages, pricing plans, module bundles and assign them to restaurant clients.
          </p>
        </div>

        <button className="nexa-create-btn" onClick={loadAll}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="nexa-stats">
        {[
          ["Packages", packages.length, PackagePlus],
          ["Active Plans", packages.filter((plan) => plan.isActive !== false).length, ShieldCheck],
          ["Clients", tenants.length, Building2],
          ["Modules", allModules.length, Box]
        ].map(([label, value, Icon]) => (
          <div className="nexa-stat-card" key={label}>
            <Icon color="#d8b4fe" size={30} />
            <p className="nexa-stat-label">{label}</p>
            <p className="nexa-stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 430px", gap: 14 }}>
        <main style={{ display: "grid", gap: 14 }}>
          <section className="nexa-panel">
            <div className="nexa-row-between">
              <div>
                <h2 style={{ margin: 0 }}>Packages</h2>
                <p className="nexa-section-sub">{filteredPackages.length} packages showing</p>
              </div>

              <div className="nexa-input-wrap" style={{ minWidth: 280 }}>
                <Search size={16} color="#a5f3fc" />
                <input
                  className="nexa-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search package..."
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, marginTop: 14 }}>
              {filteredPackages.map((plan) => (
                <PackageCard
                  key={plan.id}
                  plan={plan}
                  modules={allModules}
                  active={form.id === plan.id}
                  onEdit={editPackage}
                  onToggle={togglePackage}
                  onDelete={deletePackage}
                />
              ))}
            </div>
          </section>

          <section className="nexa-panel">
            <div className="nexa-row-between">
              <div>
                <h2 style={{ margin: 0 }}>Assign Package to Client</h2>
                <p className="nexa-section-sub">Select client, package, billing cycle and expiry date.</p>
              </div>
              <BadgeDollarSign color="#a5f3fc" size={28} />
            </div>

            <form onSubmit={assignPackage}>
              <div className="nexa-form-grid">
                <label className="nexa-field">
                  <span className="nexa-label">Client / Restaurant</span>
                  <div className="nexa-input-wrap">
                    <select
                      className="nexa-input"
                      value={assignForm.tenantId}
                      onChange={(e) => setAssignValue("tenantId", e.target.value)}
                    >
                      <option value="">Select client</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.restaurantName}  -  {tenant.ownerName}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="nexa-field">
                  <span className="nexa-label">Package</span>
                  <div className="nexa-input-wrap">
                    <select
                      className="nexa-input"
                      value={assignForm.packageId}
                      onChange={(e) => {
                        const packageId = e.target.value;
                        const plan = packages.find((item) => item.id === packageId);

                        setAssignForm((prev) => ({
                          ...prev,
                          packageId,
                          overrideModules: plan?.enabledModules || []
                        }));
                      }}
                    >
                      <option value="">Select package</option>
                      {packages.filter((plan) => plan.isActive !== false).map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}  -  Rs {plan.monthlyPrice}/month
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>

              <div className="nexa-form-grid">
                <label className="nexa-field">
                  <span className="nexa-label">Billing Cycle</span>
                  <div className="nexa-input-wrap">
                    <select
                      className="nexa-input"
                      value={assignForm.billingCycle}
                      onChange={(e) => setAssignValue("billingCycle", e.target.value)}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="lifetime">Lifetime</option>
                      <option value="trial">Trial</option>
                    </select>
                  </div>
                </label>

                <Field
                  label="Expiry Date"
                  type="date"
                  value={assignForm.expiryDate}
                  onChange={(v) => setAssignValue("expiryDate", v)}
                />
              </div>

              {selectedPackageForAssign ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 18,
                    border: "1px solid rgba(34,211,238,.22)",
                    background: "rgba(34,211,238,.08)"
                  }}
                >
                  <strong>{selectedPackageForAssign.name}</strong>
                  <p className="nexa-small">
                    Monthly Rs {selectedPackageForAssign.monthlyPrice}  -  Yearly Rs {selectedPackageForAssign.yearlyPrice}  - 
                    Users {selectedPackageForAssign.maxUsers}  -  Branches {selectedPackageForAssign.maxBranches}
                  </p>

                  <ModuleSelector
                    modules={allModules}
                    selected={assignForm.overrideModules}
                    onChange={(value) => setAssignValue("overrideModules", value)}
                  />
                </div>
              ) : null}

              <button className="nexa-create-btn" disabled={assigning} style={{ width: "100%", marginTop: 14 }}>
                <CalendarClock size={16} />
                {assigning ? "Assigning..." : "Assign Package to Client"}
              </button>
            </form>
          </section>
        </main>

        <aside className="nexa-panel" style={{ alignSelf: "start", position: "sticky", top: 14 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>{form.id ? "Edit Package" : "Create Package"}</h2>
              <p className="nexa-section-sub">Package visible only in super admin.</p>
            </div>

            {form.id ? (
              <button className="nexa-logout" type="button" onClick={resetForm}>
                <X size={16} />
              </button>
            ) : null}
          </div>

          <form onSubmit={savePackage}>
            <Field label="Package Name" value={form.name} onChange={(v) => setValue("name", v)} />
            <Field label="Description" value={form.description} onChange={(v) => setValue("description", v)} />

            <div className="nexa-form-grid">
              <Field label="Monthly Price" type="number" value={form.monthlyPrice} onChange={(v) => setValue("monthlyPrice", v)} />
              <Field label="Yearly Price" type="number" value={form.yearlyPrice} onChange={(v) => setValue("yearlyPrice", v)} />
            </div>

            <div className="nexa-form-grid">
              <Field label="Max Users" type="number" value={form.maxUsers} onChange={(v) => setValue("maxUsers", v)} />
              <Field label="Max Branches" type="number" value={form.maxBranches} onChange={(v) => setValue("maxBranches", v)} />
            </div>

            <ModuleSelector
              modules={allModules}
              selected={form.enabledModules}
              onChange={(value) => setValue("enabledModules", value)}
            />

            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(255,255,255,.055)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <strong>Package Status</strong>
              <button type="button" className="nexa-pill" onClick={() => setValue("isActive", !form.isActive)}>
                {form.isActive ? "Active" : "Inactive"}
              </button>
            </div>

            <button className="nexa-create-btn" disabled={saving} style={{ width: "100%", marginTop: 14 }}>
              <Save size={16} />
              {saving ? "Saving..." : form.id ? "Update Package" : "Create Package"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}




