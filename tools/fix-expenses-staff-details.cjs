const fs = require("fs");
const path = require("path");

const root = "D:\\ShazeeProjects\\nexapos-pro";

const roleRoutes = path.join(root, "backend", "src", "routes", "roleAccessRoutes.js");
const staffPanel = path.join(root, "frontend", "src", "components", "BranchStaffPanel.jsx");
const expensePanel = path.join(root, "frontend", "src", "components", "ExpensePanel.jsx");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function backup(file) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `${file}.backup-before-expenses-staff-${Date.now()}`);
  }
}

function patchBackend() {
  backup(roleRoutes);
  let code = read(roleRoutes);

  if (!code.includes("function staffExtraFieldsFromBody")) {
    code = code.replace(
      "module.exports = function roleAccessRoutes({ readDb, writeDb, hashPassword }) {",
      `function staffExtraFieldsFromBody(body = {}) {
  return {
    designation: body.designation || "",
    salary: Number(body.salary || 0),
    salaryType: body.salaryType || "monthly",
    cnic: body.cnic || "",
    shift: body.shift || "",
    joiningDate: body.joiningDate || "",
    emergencyContact: body.emergencyContact || "",
    address: body.address || "",
    notes: body.notes || ""
  };
}

function resolveRequestBranchId(req, branches = []) {
  const requested = req.query.branchId || req.body.branchId || "";
  if (requested && requested !== "all") return requested;

  if (req.user?.branchId) return req.user.branchId;

  return "";
}

function userCanViewAllBranches(user) {
  const permissions = finalPermissions(user || {});
  return permissions.canViewAllBranches === true;
}

function userCanManageExpenses(user) {
  const permissions = finalPermissions(user || {});
  return permissions.canViewProfitLoss === true || permissions.canViewReports === true || user?.role === "owner" || user?.role === "branch_manager";
}

module.exports = function roleAccessRoutes({ readDb, writeDb, hashPassword }) {`
    );
  }

  // Add staff extra fields on create user objects. This works for both normal and super routes if object has email/status/permissions.
  code = code.replaceAll(
    `email: email || "",
        status: "active",`,
    `email: email || "",
        ...staffExtraFieldsFromBody(req.body),
        status: "active",`
  );

  // Add staff extra fields on update routes after email update.
  code = code.replaceAll(
    `user.email = email ?? user.email;
    user.status = status || user.status;`,
    `user.email = email ?? user.email;
    Object.assign(user, staffExtraFieldsFromBody(req.body));
    user.status = status || user.status;`
  );

  if (!code.includes('router.get("/branch-expenses"')) {
    const expenseRoutes = `

  router.get("/branch-expenses", requireTenant, (req, res) => {
    const db = ensureCollections(readDb());
    db.expenses = Array.isArray(db.expenses) ? db.expenses : [];

    const currentUser = db.users.find((item) => item.id === req.user.id) || req.user;
    const canAll = userCanViewAllBranches(currentUser);
    const branchId = resolveRequestBranchId(req);

    let expenses = db.expenses.filter((item) => item.tenantId === req.user.tenantId);

    if (!canAll) {
      expenses = expenses.filter((item) => String(item.branchId || "") === String(req.user.branchId || ""));
    } else if (branchId && branchId !== "all") {
      expenses = expenses.filter((item) => String(item.branchId || "") === String(branchId));
    }

    expenses = expenses.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));

    res.json({ expenses });
  });

  router.post("/branch-expenses", requireTenant, (req, res) => {
    const db = ensureCollections(readDb());
    db.expenses = Array.isArray(db.expenses) ? db.expenses : [];

    const currentUser = db.users.find((item) => item.id === req.user.id) || req.user;

    if (!userCanManageExpenses(currentUser)) {
      return res.status(403).json({ message: "You are not allowed to manage expenses." });
    }

    const { title, category, amount, date, paymentMethod, note, vendor, branchId, branchName } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ message: "Expense title and amount are required." });
    }

    const targetBranchId = currentUser.role === "owner" ? branchId : req.user.branchId;

    if (!targetBranchId) {
      return res.status(400).json({ message: "Branch is required for expense." });
    }

    const branch = db.branches.find(
      (item) => item.tenantId === req.user.tenantId && item.id === targetBranchId
    );

    const expense = {
      id: uuid(),
      tenantId: req.user.tenantId,
      branchId: targetBranchId,
      branchName: branchName || branch?.name || "",
      title,
      category: category || "General",
      amount: Number(amount || 0),
      date: date || new Date().toISOString().slice(0, 10),
      paymentMethod: paymentMethod || "Cash",
      vendor: vendor || "",
      note: note || "",
      status: "active",
      createdBy: req.user.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.expenses.push(expense);

    makeAudit(db, "EXPENSE_CREATED", req.user.username, {
      expenseId: expense.id,
      branchId: expense.branchId,
      title: expense.title,
      amount: expense.amount
    });

    writeDb(db);

    res.status(201).json({ message: "Expense created successfully.", expense });
  });

  router.patch("/branch-expenses/:expenseId", requireTenant, (req, res) => {
    const db = ensureCollections(readDb());
    db.expenses = Array.isArray(db.expenses) ? db.expenses : [];

    const currentUser = db.users.find((item) => item.id === req.user.id) || req.user;

    if (!userCanManageExpenses(currentUser)) {
      return res.status(403).json({ message: "You are not allowed to edit expenses." });
    }

    const expense = db.expenses.find(
      (item) => item.tenantId === req.user.tenantId && item.id === req.params.expenseId
    );

    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    if (!userCanViewAllBranches(currentUser) && String(expense.branchId || "") !== String(req.user.branchId || "")) {
      return res.status(403).json({ message: "You can only edit your branch expenses." });
    }

    const allowed = ["title", "category", "amount", "date", "paymentMethod", "vendor", "note", "status", "branchId", "branchName"];

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        expense[key] = key === "amount" ? Number(req.body[key] || 0) : req.body[key];
      }
    });

    expense.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({ message: "Expense updated successfully.", expense });
  });

`;
    code = code.replace("  return router;", expenseRoutes + "\n  return router;");
  }

  write(roleRoutes, code);
}

function createStaffPanel() {
  backup(staffPanel);

  const content = `
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
      <style>{\`
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
      \`}</style>

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
`;
  write(staffPanel, content);
}

function createExpensePanel() {
  backup(expensePanel);

  const content = `
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
      <style>{\`
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
      \`}</style>

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
`;
  write(expensePanel, content);
}

patchBackend();
createStaffPanel();
createExpensePanel();

console.log("Expenses and staff details fixed.");