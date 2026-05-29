
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
      <style>{`
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
      `}</style>

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
