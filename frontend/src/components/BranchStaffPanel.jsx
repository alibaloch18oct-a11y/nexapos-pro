import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const ROLE_OPTIONS = [
  { value: "branch_manager", label: "Branch Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "waiter", label: "Waiter" },
  { value: "kitchen", label: "Kitchen Staff" },
  { value: "rider", label: "Delivery Rider" }
];

function roleLabel(role) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || role || "Staff";
}

function statusLabel(status) {
  return status === "inactive" ? "Inactive" : "Active";
}

export default function BranchStaffPanel({ token, session, roleContext, onBack }) {
  const access = roleContext || session?.roleContext || {};
  const permissions = access?.permissions || {};
  const branches = access?.branches || [];
  const canViewAllBranches = permissions.canViewAllBranches === true;
  const savedBranch = localStorage.getItem("nexapos_selected_branch_id");

  const [selectedBranchId, setSelectedBranchId] = useState(
    canViewAllBranches ? savedBranch || "all" : access?.activeBranch?.id || session?.user?.branchId || ""
  );
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const defaultBranchId =
    selectedBranchId && selectedBranchId !== "all"
      ? selectedBranchId
      : branches[0]?.id || access?.activeBranch?.id || session?.user?.branchId || "";

  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "cashier",
    branchId: defaultBranchId,
    phone: "",
    email: "",
    canEditOrders: true
  });

  const selectedBranch =
    selectedBranchId === "all"
      ? null
      : branches.find((branch) => String(branch.id) === String(selectedBranchId)) ||
        access?.activeBranch ||
        null;

  function readBranchId(user) {
    return user?.branchId || user?.branch_id || user?.raw?.branchId || "";
  }

  function branchName(branchId) {
    const found = branches.find((branch) => String(branch.id) === String(branchId));
    return found?.name || branchId || "No Branch";
  }

  const visibleUsers = useMemo(() => {
    if (canViewAllBranches && selectedBranchId === "all") return users;

    const target = canViewAllBranches
      ? selectedBranchId
      : access?.activeBranch?.id || session?.user?.branchId || selectedBranchId;

    return users.filter((user) => String(readBranchId(user)) === String(target));
  }, [users, selectedBranchId, canViewAllBranches, access?.activeBranch?.id, session?.user?.branchId]);

  async function loadUsers() {
    setLoading(true);

    try {
      const res = await api(token).get("/api/role-access/users");
      const list = Array.isArray(res.data) ? res.data : res.data.users || [];
      setUsers(list);
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
    if (selectedBranchId && selectedBranchId !== "all") {
      setForm((prev) => ({ ...prev, branchId: selectedBranchId }));
    }
  }, [selectedBranchId]);

  async function createStaff(event) {
    event.preventDefault();

    const targetBranchId = form.branchId || defaultBranchId;

    if (!targetBranchId || targetBranchId === "all") {
      alert("Please select a specific branch before creating staff.");
      return;
    }

    if (!form.name || !form.username || !form.password || !form.role) {
      alert("Name, username, password and role are required.");
      return;
    }

    setSaving(true);

    try {
      await api(token).post("/api/role-access/users", {
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        branchId: targetBranchId,
        phone: form.phone,
        email: form.email,
        permissions: {
          canEditOrders: Boolean(form.canEditOrders),
          canUsePOS: ["cashier", "waiter", "branch_manager"].includes(form.role),
          canUseKDS: form.role === "kitchen" || form.role === "branch_manager",
          canUseDelivery: form.role === "rider" || form.role === "branch_manager",
          canViewCosts: false,
          canViewProfitLoss: false,
          canViewPurchases: false
        }
      });

      setForm({
        name: "",
        username: "",
        password: "",
        role: "cashier",
        branchId: targetBranchId,
        phone: "",
        email: "",
        canEditOrders: true
      });

      await loadUsers();
      alert("Staff created for selected branch.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create staff.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user) {
    try {
      await api(token).patch(`/api/role-access/users/${user.id}`, {
        status: user.status === "inactive" ? "active" : "inactive"
      });

      await loadUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update staff.");
    }
  }

  return (
    <div className="branch-staff-page">
      <style>
        {`
          .branch-staff-page {
            min-height: 100vh;
            width: 100%;
            box-sizing: border-box;
            padding: 14px;
            overflow-x: hidden;
            color: white;
            background:
              radial-gradient(circle at 12% 18%, rgba(34,211,238,.14), transparent 28%),
              radial-gradient(circle at 86% 12%, rgba(168,85,247,.16), transparent 28%),
              linear-gradient(135deg,#020617,#0f172a);
          }

          .bs-head,
          .bs-panel,
          .bs-card {
            border-radius: 28px;
            background: rgba(15,23,42,.78);
            border: 1px solid rgba(255,255,255,.12);
            box-shadow: 0 22px 60px rgba(0,0,0,.24);
            backdrop-filter: blur(18px);
          }

          .bs-head {
            padding: 18px;
            display: flex;
            justify-content: space-between;
            gap: 14px;
            align-items: flex-start;
            margin-bottom: 14px;
          }

          .bs-back,
          .bs-primary,
          .bs-soft {
            height: 44px;
            border: 0;
            border-radius: 16px;
            padding: 0 14px;
            font-weight: 1000;
            color: white;
            cursor: pointer;
          }

          .bs-back,
          .bs-soft {
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.12);
          }

          .bs-primary {
            background: linear-gradient(135deg,#06b6d4,#2563eb);
          }

          .bs-title {
            margin: 10px 0 0;
            font-size: 34px;
            font-weight: 1000;
            letter-spacing: -.04em;
          }

          .bs-sub {
            margin: 8px 0 0;
            color: #94a3b8;
            font-weight: 750;
          }

          .bs-kicker {
            display: inline-flex;
            padding: 7px 12px;
            border-radius: 999px;
            background: rgba(34,211,238,.13);
            color: #a5f3fc;
            border: 1px solid rgba(34,211,238,.24);
            font-size: 12px;
            font-weight: 1000;
          }

          .bs-layout {
            display: grid;
            grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
            gap: 14px;
            width: 100%;
            box-sizing: border-box;
          }

          .bs-panel {
            padding: 16px;
            min-width: 0;
            box-sizing: border-box;
          }

          .bs-form {
            display: grid;
            gap: 10px;
          }

          .bs-input,
          .bs-select {
            width: 100%;
            box-sizing: border-box;
            height: 46px;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,.12);
            background: #020617;
            color: white;
            padding: 0 13px;
            outline: none;
            font-weight: 850;
          }

          .bs-select option {
            background: #020617;
            color: white;
          }

          .bs-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .bs-check {
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 11px;
            border-radius: 16px;
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.1);
            font-weight: 850;
          }

          .bs-toolbar {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            align-items: center;
            margin-bottom: 12px;
          }

          .bs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
            gap: 12px;
            min-width: 0;
          }

          .bs-card {
            padding: 15px;
            min-width: 0;
            overflow: hidden;
          }

          .bs-avatar {
            width: 46px;
            height: 46px;
            border-radius: 17px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg,#22d3ee,#2563eb);
            font-size: 22px;
            margin-bottom: 10px;
          }

          .bs-card h3 {
            margin: 0;
            font-size: 18px;
            line-height: 1.15;
            word-break: break-word;
            font-weight: 1000;
          }

          .bs-card p {
            margin: 5px 0;
            word-break: break-word;
            color: #94a3b8;
            font-weight: 800;
            font-size: 13px;
          }

          .bs-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 10px;
          }

          .bs-badge {
            max-width: 100%;
            padding: 6px 9px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            border-radius: 999px;
            background: rgba(34,211,238,.12);
            color: #a5f3fc;
            border: 1px solid rgba(34,211,238,.22);
            font-size: 11px;
            font-weight: 1000;
          }

          .bs-badge.warn {
            background: rgba(250,204,21,.12);
            color: #fde68a;
            border-color: rgba(250,204,21,.22);
          }

          .bs-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
          }

          @media (max-width: 1050px) {
            .bs-layout,
            .bs-row {
              grid-template-columns: 1fr;
            }

            .branch-staff-page {
              padding: 10px;
            }

            .bs-head {
              flex-direction: column;
            }
          }
        `}
      </style>

      <header className="bs-head">
        <div>
          <button className="bs-back" onClick={onBack}>← Back</button>
          <div style={{ height: 12 }} />
          <div className="bs-kicker">
            {canViewAllBranches ? "Owner Staff Control" : "Branch Staff Control"}
          </div>
          <h1 className="bs-title">Branch Staff Management</h1>
          <p className="bs-sub">
            Create branch managers, cashiers, waiters, kitchen staff and riders with branch-level access.
          </p>
        </div>

        <button className="bs-primary" onClick={loadUsers}>Refresh Staff</button>
      </header>

      <div className="bs-layout">
        <section className="bs-panel">
          <h2 style={{ marginTop: 0 }}>Add Staff</h2>

          <form className="bs-form" onSubmit={createStaff}>
            <input className="bs-input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="bs-input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <input className="bs-input" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

            <div className="bs-row">
              <select className="bs-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>

              <select
                className="bs-select"
                value={form.branchId || defaultBranchId}
                disabled={!canViewAllBranches}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>

            <input className="bs-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="bs-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

            <label className="bs-check">
              <input type="checkbox" checked={form.canEditOrders} onChange={(e) => setForm({ ...form, canEditOrders: e.target.checked })} />
              Allow order edit
            </label>

            <button className="bs-primary" disabled={saving} type="submit">
              {saving ? "Creating..." : "Create Staff"}
            </button>
          </form>
        </section>

        <section className="bs-panel">
          <div className="bs-toolbar">
            <div>
              <h2 style={{ margin: 0 }}>Staff Directory</h2>
              <p style={{ margin: "5px 0 0", color: "#94a3b8", fontWeight: 800 }}>
                {selectedBranchId === "all" ? "All branches" : selectedBranch?.name || branchName(selectedBranchId)}
              </p>
            </div>

            {canViewAllBranches ? (
              <select
                className="bs-select"
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  localStorage.setItem("nexapos_selected_branch_id", e.target.value);
                }}
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            ) : null}
          </div>

          {loading ? (
            <div className="bs-card">Loading staff...</div>
          ) : visibleUsers.length === 0 ? (
            <div className="bs-card">No staff found for this branch.</div>
          ) : (
            <div className="bs-grid">
              {visibleUsers.map((user) => (
                <div className="bs-card" key={user.id || user.username}>
                  <div className="bs-avatar">{user.role === "cashier" ? "\u{1F9FE}" : "\u{1F465}"}</div>
                  <h3>{user.name || user.username}</h3>
                  <p>@{user.username}</p>
                  <p>{roleLabel(user.role)}</p>

                  <div className="bs-badges">
                    <span className="bs-badge">{branchName(readBranchId(user))}</span>
                    <span className={`bs-badge ${user.status === "inactive" ? "warn" : ""}`}>{statusLabel(user.status)}</span>
                    <span className="bs-badge">{user.permissions?.canEditOrders ? "Can edit orders" : "No edit"}</span>
                  </div>

                  <div className="bs-actions">
                    <button className="bs-soft" type="button" onClick={() => toggleStatus(user)}>
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


