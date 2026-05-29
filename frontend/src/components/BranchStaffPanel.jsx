
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const ROLES = [
  { value: "branch_manager", label: "Branch Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "waiter", label: "Waiter" },
  { value: "kitchen", label: "Kitchen Staff" },
  { value: "rider", label: "Delivery Rider" }
];

const EMPTY_FORM = {
  id: "",
  name: "",
  username: "",
  password: "",
  role: "cashier",
  branchId: "",
  phone: "",
  email: "",
  designation: "",
  salary: "",
  salaryType: "monthly",
  cnic: "",
  shift: "",
  joiningDate: "",
  emergencyContact: "",
  address: "",
  notes: "",
  canEditOrders: true
};

function roleName(role) {
  return ROLES.find((item) => item.value === role)?.label || role || "Staff";
}

function money(value) {
  return "Rs " + Math.round(Number(value || 0)).toLocaleString();
}

export default function BranchStaffPanel({ token, session, roleContext, onBack }) {
  const access = roleContext || session?.roleContext || {};
  const permissions = access?.permissions || {};
  const branches = access?.branches || [];
  const canViewAllBranches = permissions.canViewAllBranches === true;
  const canManageUsers = permissions.canManageUsers !== false;
  const saved = localStorage.getItem("nexapos_selected_branch_id");

  const [selectedBranchId, setSelectedBranchId] = useState(
    canViewAllBranches ? saved || "all" : access?.activeBranch?.id || session?.user?.branchId || ""
  );
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const branchById = useMemo(() => {
    const map = {};
    branches.forEach((branch) => {
      map[branch.id] = branch;
    });
    return map;
  }, [branches]);

  const visibleUsers = useMemo(() => {
    if (canViewAllBranches && selectedBranchId === "all") return users;

    const target = canViewAllBranches
      ? selectedBranchId
      : access?.activeBranch?.id || session?.user?.branchId || selectedBranchId;

    return users.filter((user) => String(user.branchId || "") === String(target));
  }, [users, selectedBranchId, canViewAllBranches, access?.activeBranch?.id, session?.user?.branchId]);

  async function loadUsers() {
    setLoading(true);

    try {
      const res = await api(token).get("/api/role-access/users");
      setUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load staff.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedBranchId !== "all" && !editing) {
      setForm((prev) => ({ ...prev, branchId: selectedBranchId }));
    }
  }, [selectedBranchId, editing]);

  function startEdit(user) {
    setEditing(user);
    setForm({
      id: user.id || "",
      name: user.name || "",
      username: user.username || "",
      password: "",
      role: user.role || "cashier",
      branchId: user.branchId || "",
      phone: user.phone || "",
      email: user.email || "",
      designation: user.designation || "",
      salary: user.salary || "",
      salaryType: user.salaryType || "monthly",
      cnic: user.cnic || "",
      shift: user.shift || "",
      joiningDate: user.joiningDate || "",
      emergencyContact: user.emergencyContact || "",
      address: user.address || "",
      notes: user.notes || "",
      canEditOrders: user.permissions?.canEditOrders === true
    });
  }

  function resetForm() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      branchId: selectedBranchId !== "all" ? selectedBranchId : branches[0]?.id || ""
    });
  }

  async function saveStaff(event) {
    event.preventDefault();

    const branchId = form.branchId || (selectedBranchId !== "all" ? selectedBranchId : "");

    if (!form.name || !form.username || !form.role) {
      alert("Name, username and role are required.");
      return;
    }

    if (!editing && !form.password) {
      alert("Password is required for new staff.");
      return;
    }

    if (form.role !== "owner" && !branchId) {
      alert("Select branch before saving staff.");
      return;
    }

    const payload = {
      name: form.name,
      username: form.username,
      password: form.password,
      role: form.role,
      branchId,
      phone: form.phone,
      email: form.email,
      designation: form.designation,
      salary: form.salary,
      salaryType: form.salaryType,
      cnic: form.cnic,
      shift: form.shift,
      joiningDate: form.joiningDate,
      emergencyContact: form.emergencyContact,
      address: form.address,
      notes: form.notes,
      permissions: {
        canEditOrders: Boolean(form.canEditOrders)
      }
    };

    if (!payload.password) delete payload.password;

    try {
      if (editing?.id) {
        await api(token).patch("/api/role-access/users/" + editing.id, payload);
        alert("Staff updated.");
      } else {
        await api(token).post("/api/role-access/users", payload);
        alert("Staff created.");
      }

      resetForm();
      await loadUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save staff.");
    }
  }

  async function toggleStatus(user) {
    try {
      await api(token).patch("/api/role-access/users/" + user.id, {
        status: user.status === "inactive" ? "active" : "inactive",
        permissions: {
          canEditOrders: user.permissions?.canEditOrders === true
        }
      });

      await loadUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update status.");
    }
  }

  return (
    <div className="sf-page">
      <style>{`
        .sf-page{min-height:100vh;padding:18px;color:white;background:linear-gradient(135deg,#020617,#0f172a)}
        .sf-head,.sf-panel,.sf-card{border-radius:28px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.12);box-shadow:0 22px 60px rgba(0,0,0,.24)}
        .sf-head{padding:18px;display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}
        .sf-title{margin:10px 0 0;font-size:34px;font-weight:1000;letter-spacing:-.04em}
        .sf-sub{margin:8px 0 0;color:#94a3b8;font-weight:750}
        .sf-btn{height:44px;border:0;border-radius:16px;padding:0 14px;font-weight:1000;color:white;cursor:pointer;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
        .sf-primary{background:linear-gradient(135deg,#06b6d4,#2563eb)}
        .sf-danger{background:rgba(239,68,68,.16);border-color:rgba(239,68,68,.28)}
        .sf-layout{display:grid;grid-template-columns:minmax(330px,430px) minmax(0,1fr);gap:14px}
        .sf-panel{padding:16px;min-width:0}
        .sf-form{display:grid;gap:10px}
        .sf-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .sf-input,.sf-select,.sf-textarea{width:100%;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:#020617;color:white;padding:0 13px;outline:none;font-weight:850}
        .sf-input,.sf-select{height:46px}
        .sf-textarea{min-height:82px;padding-top:12px;resize:vertical}
        .sf-select option{background:#020617;color:white}
        .sf-check{display:flex;align-items:center;gap:9px;padding:11px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font-weight:850}
        .sf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(265px,1fr));gap:12px}
        .sf-card{padding:15px;min-width:0;overflow:hidden;margin-bottom:10px}
        .sf-card h3{margin:0;font-size:19px;font-weight:1000;word-break:break-word}
        .sf-card p{margin:6px 0;color:#94a3b8;font-weight:800;word-break:break-word}
        .sf-badge{display:inline-flex;margin:8px 6px 0 0;padding:7px 10px;border-radius:999px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.22);color:#a5f3fc;font-size:12px;font-weight:1000}
        .sf-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
        @media(max-width:1050px){.sf-layout,.sf-two{grid-template-columns:1fr}.sf-head{flex-direction:column}}
      `}</style>

      <header className="sf-head">
        <div>
          <button className="sf-btn" onClick={onBack}>Back</button>
          <h1 className="sf-title">Branch Staff Management</h1>
          <p className="sf-sub">Create, edit and control staff details branch-wise.</p>
        </div>
        <button className="sf-btn sf-primary" onClick={loadUsers}>Refresh</button>
      </header>

      <div className="sf-layout">
        <section className="sf-panel">
          <h2 style={{ marginTop: 0 }}>{editing ? "Edit Staff" : "Create Staff"}</h2>

          {!canManageUsers ? (
            <div className="sf-card">You do not have authority to manage staff.</div>
          ) : (
            <form className="sf-form" onSubmit={saveStaff}>
              <input className="sf-input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="sf-input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <input className="sf-input" placeholder={editing ? "New password optional" : "Password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

              <div className="sf-two">
                <select className="sf-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>

                <select className="sf-select" value={form.branchId || selectedBranchId} disabled={!canViewAllBranches} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                  <option value="">Select Branch</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </div>

              <div className="sf-two">
                <input className="sf-input" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                <input className="sf-input" placeholder="CNIC / ID" value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} />
              </div>

              <div className="sf-two">
                <input className="sf-input" type="number" placeholder="Salary" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
                <select className="sf-select" value={form.salaryType} onChange={(e) => setForm({ ...form, salaryType: e.target.value })}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>

              <div className="sf-two">
                <input className="sf-input" placeholder="Shift e.g. 9AM-6PM" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} />
                <input className="sf-input" type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
              </div>

              <input className="sf-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="sf-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="sf-input" placeholder="Emergency contact" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
              <textarea className="sf-textarea" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <textarea className="sf-textarea" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

              <label className="sf-check">
                <input type="checkbox" checked={form.canEditOrders} onChange={(e) => setForm({ ...form, canEditOrders: e.target.checked })} />
                Allow order edit
              </label>

              <div className="sf-actions">
                <button className="sf-btn sf-primary" type="submit">{editing ? "Save Staff" : "Create Staff"}</button>
                {editing ? <button className="sf-btn" type="button" onClick={resetForm}>Cancel Edit</button> : null}
              </div>
            </form>
          )}
        </section>

        <section className="sf-panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Staff Directory</h2>
            {canViewAllBranches ? (
              <select className="sf-select" style={{ maxWidth: 260 }} value={selectedBranchId} onChange={(e) => {
                setSelectedBranchId(e.target.value);
                localStorage.setItem("nexapos_selected_branch_id", e.target.value);
              }}>
                <option value="all">All Branches</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            ) : null}
          </div>

          {loading ? <div className="sf-card">Loading staff...</div> : visibleUsers.length === 0 ? <div className="sf-card">No staff found for this branch.</div> : (
            <div className="sf-grid">
              {visibleUsers.map((user) => (
                <div className="sf-card" key={user.id || user.username}>
                  <h3>{user.name || user.username}</h3>
                  <p>@{user.username}</p>
                  <p>{roleName(user.role)} {user.designation ? "- " + user.designation : ""}</p>
                  <p>Phone: {user.phone || "N/A"}</p>
                  <p>Salary: {money(user.salary)} / {user.salaryType || "monthly"}</p>
                  <p>Shift: {user.shift || "N/A"}</p>
                  <span className="sf-badge">{branchById[user.branchId]?.name || "No Branch"}</span>
                  <span className="sf-badge">{user.status || "active"}</span>
                  <span className="sf-badge">{user.permissions?.canEditOrders ? "Can edit orders" : "No edit"}</span>
                  <div className="sf-actions">
                    <button className="sf-btn sf-primary" onClick={() => startEdit(user)}>Edit</button>
                    <button className="sf-btn sf-danger" onClick={() => toggleStatus(user)}>{user.status === "inactive" ? "Activate" : "Disable"}</button>
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
