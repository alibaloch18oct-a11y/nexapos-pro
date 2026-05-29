
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const EMPTY_FORM = {
  id: "",
  title: "",
  category: "General",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: "Cash",
  vendor: "",
  note: "",
  branchId: ""
};

function money(value) {
  return "Rs " + Math.round(Number(value || 0)).toLocaleString();
}

export default function ExpensePanel({ token, session, roleContext, onBack }) {
  const access = roleContext || session?.roleContext || {};
  const permissions = access?.permissions || {};
  const branches = access?.branches || [];
  const canViewAllBranches = permissions.canViewAllBranches === true;
  const canManageExpenses = permissions.canViewProfitLoss === true || permissions.canViewReports === true || access?.user?.role === "owner" || access?.user?.role === "branch_manager";

  const saved = localStorage.getItem("nexapos_selected_branch_id");
  const [selectedBranchId, setSelectedBranchId] = useState(
    canViewAllBranches ? saved || "all" : access?.activeBranch?.id || session?.user?.branchId || ""
  );
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM, branchId: selectedBranchId !== "all" ? selectedBranchId : "" });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const branchById = useMemo(() => {
    const map = {};
    branches.forEach((branch) => {
      map[branch.id] = branch;
    });
    return map;
  }, [branches]);

  const total = useMemo(() => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), [expenses]);

  async function loadExpenses(branchOverride = selectedBranchId) {
    setLoading(true);
    try {
      const query = branchOverride && branchOverride !== "all" ? "?branchId=" + encodeURIComponent(branchOverride) : "?branchId=all";
      const res = await api(token).get("/api/role-access/branch-expenses" + query);
      setExpenses(res.data.expenses || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load expenses.");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses(selectedBranchId);
  }, [selectedBranchId]);

  useEffect(() => {
    if (!editing && selectedBranchId !== "all") {
      setForm((prev) => ({ ...prev, branchId: selectedBranchId }));
    }
  }, [selectedBranchId, editing]);

  function startEdit(expense) {
    setEditing(expense);
    setForm({
      id: expense.id || "",
      title: expense.title || "",
      category: expense.category || "General",
      amount: expense.amount || "",
      date: String(expense.date || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
      paymentMethod: expense.paymentMethod || "Cash",
      vendor: expense.vendor || "",
      note: expense.note || "",
      branchId: expense.branchId || ""
    });
  }

  function resetForm() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10), branchId: selectedBranchId !== "all" ? selectedBranchId : "" });
  }

  async function saveExpense(event) {
    event.preventDefault();

    if (!canManageExpenses) {
      alert("You are not allowed to manage expenses.");
      return;
    }

    const branchId = form.branchId || (selectedBranchId !== "all" ? selectedBranchId : "");

    if (!branchId) {
      alert("Select branch before saving expense.");
      return;
    }

    if (!form.title || !form.amount) {
      alert("Expense title and amount are required.");
      return;
    }

    const branch = branchById[branchId];

    const payload = {
      ...form,
      branchId,
      branchName: branch?.name || "",
      amount: Number(form.amount || 0)
    };

    try {
      if (editing?.id) {
        await api(token).patch("/api/role-access/branch-expenses/" + editing.id, payload);
        alert("Expense updated.");
      } else {
        await api(token).post("/api/role-access/branch-expenses", payload);
        alert("Expense created.");
      }

      resetForm();
      await loadExpenses(selectedBranchId);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save expense.");
    }
  }

  async function disableExpense(expense) {
    try {
      await api(token).patch("/api/role-access/branch-expenses/" + expense.id, { status: "inactive" });
      await loadExpenses(selectedBranchId);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update expense.");
    }
  }

  return (
    <div className="ex-page">
      <style>{`
        .ex-page{min-height:100vh;padding:18px;color:white;background:linear-gradient(135deg,#020617,#0f172a)}
        .ex-head,.ex-panel,.ex-card{border-radius:28px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.12);box-shadow:0 22px 60px rgba(0,0,0,.24)}
        .ex-head{padding:18px;display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}
        .ex-title{margin:10px 0 0;font-size:34px;font-weight:1000;letter-spacing:-.04em}
        .ex-sub{margin:8px 0 0;color:#94a3b8;font-weight:750}
        .ex-btn{height:44px;border:0;border-radius:16px;padding:0 14px;font-weight:1000;color:white;cursor:pointer;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
        .ex-primary{background:linear-gradient(135deg,#06b6d4,#2563eb)}
        .ex-danger{background:rgba(239,68,68,.16);border-color:rgba(239,68,68,.28)}
        .ex-layout{display:grid;grid-template-columns:minmax(320px,410px) minmax(0,1fr);gap:14px}
        .ex-panel{padding:16px;min-width:0}
        .ex-form{display:grid;gap:10px}
        .ex-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .ex-input,.ex-select,.ex-textarea{width:100%;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:#020617;color:white;padding:0 13px;outline:none;font-weight:850}
        .ex-input,.ex-select{height:46px}
        .ex-textarea{min-height:82px;padding-top:12px;resize:vertical}
        .ex-select option{background:#020617;color:white}
        .ex-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
        .ex-card{padding:15px;min-width:0;overflow:hidden}
        .ex-card h3{margin:0;font-size:19px;font-weight:1000;word-break:break-word}
        .ex-card p{margin:6px 0;color:#94a3b8;font-weight:800;word-break:break-word}
        .ex-badge{display:inline-flex;margin:8px 6px 0 0;padding:7px 10px;border-radius:999px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.22);color:#a5f3fc;font-size:12px;font-weight:1000}
        .ex-stat{font-size:24px;font-weight:1000;color:#86efac}
        .ex-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
        @media(max-width:1050px){.ex-layout,.ex-two{grid-template-columns:1fr}.ex-head{flex-direction:column}}
      `}</style>

      <header className="ex-head">
        <div>
          <button className="ex-btn" onClick={onBack}>Back</button>
          <h1 className="ex-title">Branch Expenses</h1>
          <p className="ex-sub">Manage expenses branch-wise with owner/manager authority.</p>
        </div>
        <div style={{ display: "grid", gap: 8, textAlign: "right" }}>
          <div className="ex-stat">{money(total)}</div>
          <button className="ex-btn ex-primary" onClick={() => loadExpenses(selectedBranchId)}>Refresh</button>
        </div>
      </header>

      <div className="ex-layout">
        <section className="ex-panel">
          <h2 style={{ marginTop: 0 }}>{editing ? "Edit Expense" : "Add Expense"}</h2>

          {!canManageExpenses ? (
            <div className="ex-card">You do not have authority to manage expenses.</div>
          ) : (
            <form className="ex-form" onSubmit={saveExpense}>
              <input className="ex-input" placeholder="Expense title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

              <div className="ex-two">
                <input className="ex-input" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <input className="ex-input" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>

              <div className="ex-two">
                <input className="ex-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                <select className="ex-select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="JazzCash">JazzCash</option>
                </select>
              </div>

              <select className="ex-select" value={form.branchId || selectedBranchId} disabled={!canViewAllBranches} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                <option value="">Select Branch</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>

              <input className="ex-input" placeholder="Vendor / supplier / paid to" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
              <textarea className="ex-textarea" placeholder="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />

              <div className="ex-actions">
                <button className="ex-btn ex-primary" type="submit">{editing ? "Save Expense" : "Add Expense"}</button>
                {editing ? <button className="ex-btn" type="button" onClick={resetForm}>Cancel Edit</button> : null}
              </div>
            </form>
          )}
        </section>

        <section className="ex-panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Expense List</h2>
            {canViewAllBranches ? (
              <select className="ex-select" style={{ maxWidth: 260 }} value={selectedBranchId} onChange={(e) => {
                setSelectedBranchId(e.target.value);
                localStorage.setItem("nexapos_selected_branch_id", e.target.value);
              }}>
                <option value="all">All Branches</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            ) : null}
          </div>

          {loading ? <div className="ex-card">Loading expenses...</div> : expenses.length === 0 ? <div className="ex-card">No expenses found.</div> : (
            <div className="ex-grid">
              {expenses.map((expense) => (
                <div className="ex-card" key={expense.id}>
                  <h3>{expense.title}</h3>
                  <p>{expense.category} - {expense.date}</p>
                  <p>{expense.vendor || "No vendor"}</p>
                  <p>{expense.note || "No note"}</p>
                  <div className="ex-stat">{money(expense.amount)}</div>
                  <span className="ex-badge">{expense.branchName || branchById[expense.branchId]?.name || "Branch"}</span>
                  <span className="ex-badge">{expense.paymentMethod || "Cash"}</span>
                  <div className="ex-actions">
                    <button className="ex-btn ex-primary" onClick={() => startEdit(expense)}>Edit</button>
                    <button className="ex-btn ex-danger" onClick={() => disableExpense(expense)}>Disable</button>
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
