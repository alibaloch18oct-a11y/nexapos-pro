import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarClock,
  ChevronLeft,
  CreditCard,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Wallet,
  X
} from "lucide-react";
import { api } from "../lib/api";

const emptyExpense = {
  id: "",
  title: "",
  category: "Food Cost",
  amount: "",
  paymentMethod: "Cash",
  paymentStatus: "paid",
  expenseDate: new Date().toISOString().slice(0, 10),
  vendorName: "",
  notes: ""
};

const categories = [
  "Food Cost",
  "Rent",
  "Salary",
  "Utilities",
  "Fuel",
  "Delivery",
  "Packaging",
  "Marketing",
  "Repair",
  "Cleaning",
  "Internet",
  "Software",
  "Tax",
  "Other"
];

function money(value) {
  return `Rs ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="nexa-field">
      <span className="nexa-label">{label}</span>
      <div className="nexa-input-wrap">
        <input
          className="nexa-input"
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
        />
      </div>
    </label>
  );
}

function ExpenseCard({ expense, active, onEdit, onDelete }) {
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
          <h3 style={{ margin: 0 }}>{expense.title}</h3>
          <p className="nexa-small">{expense.category}</p>
          <p className="nexa-small">{expense.expenseDate}</p>
        </div>

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 16,
            background: "rgba(239,68,68,.14)",
            color: "#fca5a5",
            display: "grid",
            placeItems: "center"
          }}
        >
          <Wallet size={22} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <div className="nexa-pill">{money(expense.amount)}</div>
        <div className="nexa-pill">{expense.paymentStatus}</div>
        <div className="nexa-pill">{expense.paymentMethod}</div>
        <div className="nexa-pill">{expense.vendorName || "No vendor"}</div>
      </div>

      {expense.notes ? <p className="nexa-small" style={{ marginTop: 10 }}>{expense.notes}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <button className="nexa-pill" onClick={() => onEdit(expense)}>Edit</button>
        <button className="nexa-logout" onClick={() => onDelete(expense)}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, max }) {
  const percent = max > 0 ? Math.min(100, Math.round((Number(value || 0) / max) * 100)) : 0;

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(255,255,255,.055)",
        padding: 11
      }}
    >
      <div className="nexa-row-between">
        <strong>{label}</strong>
        <span style={{ color: "#fca5a5", fontWeight: 900 }}>{money(value)}</span>
      </div>

      <div
        style={{
          height: 7,
          borderRadius: 999,
          background: "rgba(255,255,255,.08)",
          overflow: "hidden",
          marginTop: 9
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg,#ef4444,#f97316)"
          }}
        />
      </div>
    </div>
  );
}

export default function ExpensePanel({ token, session, onBack }) {
  const [range, setRange] = useState("today");
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    paidExpenses: 0,
    unpaidExpenses: 0,
    totalRecords: 0
  });
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [form, setForm] = useState(emptyExpense);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadExpenses(selectedRange = range) {
    try {
      const res = await api(token).get(`/api/expenses?range=${selectedRange}`);
      setExpenses(res.data.expenses || []);
      setStats(res.data.stats || stats);
      setCategoryBreakdown(res.data.categoryBreakdown || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load expenses.");
    }
  }

  useEffect(() => {
    loadExpenses(range);
  }, [range]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const query = search.toLowerCase();

      return (
        !search ||
        String(expense.title || "").toLowerCase().includes(query) ||
        String(expense.category || "").toLowerCase().includes(query) ||
        String(expense.vendorName || "").toLowerCase().includes(query) ||
        String(expense.paymentStatus || "").toLowerCase().includes(query)
      );
    });
  }, [expenses, search]);

  const maxCategory = Math.max(...categoryBreakdown.map((item) => Number(item.value || 0)), 0);

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyExpense);
  }

  function editExpense(expense) {
    setForm({
      id: expense.id,
      title: expense.title || "",
      category: expense.category || "Other",
      amount: String(expense.amount || ""),
      paymentMethod: expense.paymentMethod || "Cash",
      paymentStatus: expense.paymentStatus || "paid",
      expenseDate: expense.expenseDate || new Date().toISOString().slice(0, 10),
      vendorName: expense.vendorName || "",
      notes: expense.notes || ""
    });
  }

  async function saveExpense(e) {
    e.preventDefault();

    if (!form.title.trim() || !form.amount) {
      alert("Expense title and amount are required.");
      return;
    }

    setSaving(true);

    const payload = {
      ...form,
      amount: Number(form.amount || 0)
    };

    try {
      if (form.id) {
        await api(token).put(`/api/expenses/${form.id}`, payload);
      } else {
        await api(token).post("/api/expenses", payload);
      }

      resetForm();
      await loadExpenses(range);
      alert("Expense saved successfully.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(expense) {
    if (!confirm(`Delete expense "${expense.title}"?`)) return;

    try {
      await api(token).delete(`/api/expenses/${expense.id}`);
      await loadExpenses(range);
      alert("Expense deleted.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete expense.");
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
            Expenses Management
          </h1>
          <p className="nexa-section-sub">
            Track restaurant expenses and connect them to net profit for {session?.tenant?.restaurantName}.
          </p>
        </div>

        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {[
            ["today", "Today"],
            ["7d", "7 Days"],
            ["30d", "30 Days"],
            ["90d", "90 Days"],
            ["all", "All"]
          ].map(([key, label]) => (
            <button
              key={key}
              className="nexa-pill"
              onClick={() => setRange(key)}
              style={{
                background: range === key ? "rgba(34,211,238,.20)" : "rgba(255,255,255,.08)"
              }}
            >
              {label}
            </button>
          ))}

          <button className="nexa-create-btn" onClick={() => loadExpenses(range)}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="nexa-stats">
        {[
          ["Total Expenses", money(stats.totalExpenses), Wallet],
          ["Paid Expenses", money(stats.paidExpenses), CreditCard],
          ["Unpaid Expenses", money(stats.unpaidExpenses), BadgeDollarSign],
          ["Records", stats.totalRecords, FileText]
        ].map(([label, value, Icon]) => (
          <div className="nexa-stat-card" key={label}>
            <Icon color="#d8b4fe" size={30} />
            <p className="nexa-stat-label">{label}</p>
            <p className="nexa-stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 410px", gap: 14 }}>
        <main style={{ display: "grid", gap: 14 }}>
          <section className="nexa-panel">
            <div className="nexa-row-between">
              <div>
                <h2 style={{ margin: 0 }}>Expense Records</h2>
                <p className="nexa-section-sub">{filteredExpenses.length} expenses showing</p>
              </div>

              <div className="nexa-input-wrap" style={{ minWidth: 300 }}>
                <Search size={16} color="#a5f3fc" />
                <input
                  className="nexa-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search expense..."
                />
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                <Wallet size={56} />
                <h3>No expenses found</h3>
                <p>Add rent, salary, food cost, fuel or other expenses.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 14 }}>
                {filteredExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    active={form.id === expense.id}
                    onEdit={editExpense}
                    onDelete={deleteExpense}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="nexa-panel">
            <div className="nexa-row-between" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>Expense Breakdown</h2>
                <p className="nexa-section-sub">Category-wise expense distribution.</p>
              </div>
              <CalendarClock color="#a5f3fc" size={28} />
            </div>

            {categoryBreakdown.length === 0 ? (
              <p className="nexa-section-sub">No category data yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {categoryBreakdown.map((item) => (
                  <ProgressRow key={item.name} label={item.name} value={item.value} max={maxCategory} />
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="nexa-panel" style={{ alignSelf: "start", position: "sticky", top: 14 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>{form.id ? "Edit Expense" : "Add Expense"}</h2>
              <p className="nexa-section-sub">Add expense to calculate real net profit.</p>
            </div>

            {form.id ? (
              <button className="nexa-logout" onClick={resetForm}>
                <X size={16} />
              </button>
            ) : null}
          </div>

          <form onSubmit={saveExpense}>
            <Field label="Expense Title" value={form.title} onChange={(v) => setValue("title", v)} />

            <label className="nexa-field">
              <span className="nexa-label">Category</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={form.category}
                  onChange={(e) => setValue("category", e.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </label>

            <Field label="Amount" type="number" value={form.amount} onChange={(v) => setValue("amount", v)} />
            <Field label="Expense Date" type="date" value={form.expenseDate} onChange={(v) => setValue("expenseDate", v)} />
            <Field label="Vendor / Person Name" value={form.vendorName} onChange={(v) => setValue("vendorName", v)} />

            <label className="nexa-field">
              <span className="nexa-label">Payment Method</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={form.paymentMethod}
                  onChange={(e) => setValue("paymentMethod", e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </label>

            <label className="nexa-field">
              <span className="nexa-label">Payment Status</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={form.paymentStatus}
                  onChange={(e) => setValue("paymentStatus", e.target.value)}
                >
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </label>

            <Field label="Notes" value={form.notes} onChange={(v) => setValue("notes", v)} />

            <button className="nexa-create-btn" disabled={saving} style={{ width: "100%", marginTop: 14 }}>
              <Plus size={16} /> {saving ? "Saving..." : form.id ? "Update Expense" : "Add Expense"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}



