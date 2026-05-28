import React, { useEffect, useMemo, useState } from "react";
import {
  Bike,
  ChefHat,
  ChevronLeft,
  Eye,
  EyeOff,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { api } from "../lib/api";

function SimpleInput({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="nexa-field">
      <span className="nexa-label">{label}</span>
      <div className="nexa-input-wrap">
        <input
          type={type}
          className="nexa-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
        />
      </div>
    </label>
  );
}

const emptyStaff = {
  id: "",
  name: "",
  phone: "",
  email: "",
  role: "waiter",
  pin: "",
  salary: "",
  shift: "Morning",
  isActive: true
};

function roleIcon(role) {
  if (role === "rider") return Bike;
  if (role === "kitchen") return ChefHat;
  if (role === "cashier") return ShieldCheck;
  return UserCheck;
}

function roleLabel(role) {
  const map = {
    waiter: "Waiter",
    rider: "Rider",
    cashier: "Cashier",
    kitchen: "Kitchen Staff",
    manager: "Manager"
  };

  return map[role] || role;
}

export default function StaffPanel({ token, session, onBack }) {
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [form, setForm] = useState(emptyStaff);
  const [saving, setSaving] = useState(false);

  async function loadStaff() {
    try {
      const res = await api(token).get("/api/staff");
      setStaff(res.data.staff || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load staff.");
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  const stats = useMemo(() => {
    return {
      total: staff.length,
      active: staff.filter((item) => item.isActive !== false).length,
      waiters: staff.filter((item) => item.role === "waiter").length,
      riders: staff.filter((item) => item.role === "rider").length,
      kitchen: staff.filter((item) => item.role === "kitchen").length
    };
  }, [staff]);

  const filteredStaff = useMemo(() => {
    return staff.filter((item) => {
      const byRole = roleFilter === "all" || item.role === roleFilter;
      const query = search.toLowerCase();
      const bySearch =
        !search ||
        item.name.toLowerCase().includes(query) ||
        String(item.phone || "").toLowerCase().includes(query) ||
        String(item.email || "").toLowerCase().includes(query);

      return byRole && bySearch;
    });
  }, [staff, roleFilter, search]);

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function editStaff(item) {
    setForm({
      id: item.id,
      name: item.name || "",
      phone: item.phone || "",
      email: item.email || "",
      role: item.role || "waiter",
      pin: item.pin || "",
      salary: String(item.salary || ""),
      shift: item.shift || "Morning",
      isActive: item.isActive !== false
    });
  }

  function resetForm() {
    setForm(emptyStaff);
  }

  async function saveStaff(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Staff name is required.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      role: form.role,
      pin: form.pin,
      salary: Number(form.salary || 0),
      shift: form.shift,
      isActive: form.isActive
    };

    try {
      if (form.id) {
        await api(token).put(`/api/staff/${form.id}`, payload);
      } else {
        await api(token).post("/api/staff", payload);
      }

      resetForm();
      await loadStaff();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save staff.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStaff(item) {
    try {
      await api(token).patch(`/api/staff/${item.id}/toggle`);
      await loadStaff();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update staff.");
    }
  }

  async function deleteStaff(item) {
    if (!confirm(`Delete staff "${item.name}"?`)) return;

    try {
      await api(token).delete(`/api/staff/${item.id}`);
      await loadStaff();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete staff.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 22 }}>
      <div className="nexa-row-between">
        <div>
          <button className="nexa-logout" onClick={onBack}>
            <ChevronLeft size={18} /> Back
          </button>
          <h1 className="nexa-section-title" style={{ marginTop: 18 }}>
            Staff Control Center
          </h1>
          <p className="nexa-section-sub">
            Manage waiters, riders, kitchen staff and cashiers for {session?.tenant?.restaurantName}.
          </p>
        </div>

        <button className="nexa-create-btn" onClick={loadStaff}>
          <RefreshCw size={18} /> Refresh Staff
        </button>
      </div>

      <div className="nexa-stats">
        {[
          ["Total Staff", stats.total, Users],
          ["Active Staff", stats.active, UserCheck],
          ["Waiters", stats.waiters, UserCheck],
          ["Riders", stats.riders, Bike],
          ["Kitchen", stats.kitchen, ChefHat]
        ].map(([label, value, Icon]) => (
          <div className="nexa-stat-card" key={label}>
            <Icon color="#d8b4fe" size={34} />
            <p className="nexa-stat-label">{label}</p>
            <p className="nexa-stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 390px", gap: 18 }}>
        <main className="nexa-panel" style={{ padding: 18 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>Staff List</h2>
              <p className="nexa-section-sub">{filteredStaff.length} people showing</p>
            </div>

            <div className="nexa-input-wrap" style={{ minWidth: 320 }}>
              <Search size={18} color="#a5f3fc" />
              <input
                className="nexa-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff..."
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            {["all", "waiter", "rider", "cashier", "kitchen", "manager"].map((role) => (
              <button
                key={role}
                className="nexa-pill"
                onClick={() => setRoleFilter(role)}
                style={{
                  background: roleFilter === role ? "rgba(34,211,238,.20)" : "rgba(255,255,255,.08)"
                }}
              >
                {role === "all" ? "All" : roleLabel(role)}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 14 }}>
            {filteredStaff.length === 0 ? (
              <div className="nexa-panel" style={{ textAlign: "center", color: "#94a3b8" }}>
                <Users size={56} />
                <h3>No staff found</h3>
                <p>Create your first staff member.</p>
              </div>
            ) : (
              filteredStaff.map((item) => {
                const Icon = roleIcon(item.role);

                return (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: 24,
                      border: item.isActive ? "1px solid rgba(255,255,255,.12)" : "1px solid rgba(239,68,68,.45)",
                      background: item.isActive ? "rgba(255,255,255,.06)" : "rgba(239,68,68,.10)",
                      padding: 16
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <h3 style={{ margin: 0 }}>{item.name}</h3>
                        <p className="nexa-small">{roleLabel(item.role)}  -  {item.shift}</p>
                      </div>

                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 18,
                          background: "rgba(34,211,238,.15)",
                          color: "#a5f3fc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Icon size={24} />
                      </div>
                    </div>

                    <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                      <div className="nexa-pill">
                        <Phone size={14} /> {item.phone || "No phone"}
                      </div>
                      <div className="nexa-pill">
                        PIN: {item.pin || "N/A"}
                      </div>
                      <div className="nexa-pill">
                        Salary: Rs {item.salary || 0}
                      </div>
                      <div className="nexa-pill">
                        {item.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                      <button className="nexa-pill" onClick={() => editStaff(item)}>
                        Edit
                      </button>

                      <button className="nexa-pill" onClick={() => toggleStaff(item)}>
                        {item.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>

                      <button className="nexa-logout" onClick={() => deleteStaff(item)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>

        <aside className="nexa-panel" style={{ padding: 18 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>{form.id ? "Edit Staff" : "Add Staff"}</h2>
              <p className="nexa-section-sub">Used in POS waiter/rider selection.</p>
            </div>

            {form.id ? (
              <button className="nexa-logout" onClick={resetForm}>
                <X size={16} />
              </button>
            ) : null}
          </div>

          <form onSubmit={saveStaff}>
            <SimpleInput label="Full Name" value={form.name} onChange={(v) => setValue("name", v)} />
            <SimpleInput label="Phone" value={form.phone} onChange={(v) => setValue("phone", v)} />
            <SimpleInput label="Email" value={form.email} onChange={(v) => setValue("email", v)} />

            <label className="nexa-field">
              <span className="nexa-label">Role</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={form.role}
                  onChange={(e) => setValue("role", e.target.value)}
                >
                  <option value="waiter">Waiter</option>
                  <option value="rider">Rider</option>
                  <option value="cashier">Cashier</option>
                  <option value="kitchen">Kitchen Staff</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </label>

            <SimpleInput label="PIN Code" value={form.pin} onChange={(v) => setValue("pin", v)} placeholder="1234" />
            <SimpleInput label="Salary" type="number" value={form.salary} onChange={(v) => setValue("salary", v)} />

            <label className="nexa-field">
              <span className="nexa-label">Shift</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={form.shift}
                  onChange={(e) => setValue("shift", e.target.value)}
                >
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                  <option value="Full Day">Full Day</option>
                </select>
              </div>
            </label>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.06)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Staff Status</span>
                <button type="button" className="nexa-pill" onClick={() => setValue("isActive", !form.isActive)}>
                  {form.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            <button className="nexa-create-btn" disabled={saving} style={{ width: "100%", marginTop: 16, justifyContent: "center" }}>
              <Save size={18} /> {saving ? "Saving..." : form.id ? "Update Staff" : "Create Staff"}
            </button>
          </form>

          <div
            style={{
              marginTop: 16,
              borderRadius: 24,
              padding: 16,
              background: "rgba(34,211,238,.10)",
              border: "1px solid rgba(34,211,238,.22)",
              textAlign: "center"
            }}
          >
            <Plus size={42} color="#a5f3fc" />
            <h3 style={{ margin: "8px 0" }}>{form.name || "Staff Preview"}</h3>
            <p className="nexa-small">{roleLabel(form.role)}  -  {form.shift}</p>
            <strong>PIN: {form.pin || "N/A"}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}




