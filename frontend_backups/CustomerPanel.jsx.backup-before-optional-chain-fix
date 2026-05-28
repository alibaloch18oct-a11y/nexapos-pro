import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  ChevronLeft,
  CreditCard,
  Gift,
  History,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
  User,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { api } from "../lib/api";

const emptyCustomer = {
  id: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  customerType: "regular",
  loyaltyPoints: "",
  isActive: true
};

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

function CustomerCard({ customer, active, onSelect, onEdit, onDelete }) {
  const stats = customer.stats || {};

  return (
    <div
      style={{
        borderRadius: 22,
        border: active ? "1px solid rgba(34,211,238,.55)" : "1px solid rgba(255,255,255,.11)",
        background: active ? "rgba(34,211,238,.12)" : "rgba(255,255,255,.055)",
        padding: 14
      }}
    >
      <button
        onClick={() => onSelect(customer)}
        style={{
          width: "100%",
          background: "transparent",
          border: 0,
          color: "white",
          padding: 0,
          textAlign: "left",
          cursor: "pointer"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>{customer.name}</h3>
            <p className="nexa-small">{customer.phone}</p>
            <p className="nexa-small">{customer.email || "No email"}</p>
          </div>

          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 18,
              background: "rgba(34,211,238,.14)",
              color: "#a5f3fc",
              display: "grid",
              placeItems: "center"
            }}
          >
            <User size={24} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          <div className="nexa-pill">
            <Star size={14} /> {customer.loyaltyPoints || 0} pts
          </div>
          <div className="nexa-pill">{customer.customerType || "regular"}</div>
          <div className="nexa-pill">Orders {stats.totalOrders || 0}</div>
          <div className="nexa-pill">{money(stats.totalSpent || 0)}</div>
        </div>
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <button className="nexa-pill" onClick={() => onEdit(customer)}>
          Edit
        </button>
        <button className="nexa-logout" onClick={() => onDelete(customer)}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}

function OrderHistory({ orders }) {
  if (!orders.length) {
    return (
      <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>
        <History size={48} />
        <h3>No orders yet</h3>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 9 }}>
      {orders.slice(0, 20).map((order) => (
        <div
          key={order.id}
          style={{
            borderRadius: 16,
            padding: 11,
            border: "1px solid rgba(255,255,255,.10)",
            background: "rgba(255,255,255,.055)",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 10
          }}
        >
          <div>
            <strong>{order.orderNo}</strong>
            <p className="nexa-small">
              {order.mode} · {order.paymentStatus} · {order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
            </p>
          </div>
          <strong style={{ color: "#86efac" }}>{money(order.total)}</strong>
        </div>
      ))}
    </div>
  );
}

function PointLogs({ logs }) {
  if (!logs.length) {
    return <p className="nexa-section-sub">No loyalty point logs yet.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto" }}>
      {logs.map((log) => (
        <div
          key={log.id}
          style={{
            borderRadius: 14,
            padding: 10,
            border: "1px solid rgba(255,255,255,.10)",
            background: "rgba(255,255,255,.055)"
          }}
        >
          <strong style={{ color: log.type === "redeem" ? "#fca5a5" : "#86efac" }}>
            {log.type} {log.points} pts
          </strong>
          <p className="nexa-small">{log.note}</p>
          <p className="nexa-small">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</p>
        </div>
      ))}
    </div>
  );
}

export default function CustomerPanel({ token, session, onBack }) {
  const [customers, setCustomers] = useState([]);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [pointsForm, setPointsForm] = useState({
    type: "add",
    points: "",
    note: ""
  });

  async function loadCustomers() {
    try {
      const res = await api(token).get("/api/customers");
      setCustomers(res.data.customers || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load customers.");
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const query = search.toLowerCase();

      return (
        !search ||
        String(customer.name || "").toLowerCase().includes(query) ||
        String(customer.phone || "").toLowerCase().includes(query) ||
        String(customer.email || "").toLowerCase().includes(query) ||
        String(customer.customerType || "").toLowerCase().includes(query)
      );
    });
  }, [customers, search]);

  const totalCustomers = customers.length;
  const totalPoints = customers.reduce((sum, customer) => sum + Number(customer.loyaltyPoints || 0), 0);
  const totalSpent = customers.reduce((sum, customer) => sum + Number(customer.stats?.totalSpent || 0), 0);
  const totalOrders = customers.reduce((sum, customer) => sum + Number(customer.stats?.totalOrders || 0), 0);

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyCustomer);
  }

  function editCustomer(customer) {
    setForm({
      id: customer.id,
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
      customerType: customer.customerType || "regular",
      loyaltyPoints: String(customer.loyaltyPoints || ""),
      isActive: customer.isActive !== false
    });
  }

  async function selectCustomer(customer) {
    try {
      const res = await api(token).get(`/api/customers/${customer.id}`);
      setSelectedDetails(res.data);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load customer details.");
    }
  }

  async function syncCustomers() {
    try {
      const res = await api(token).post("/api/customers/sync-from-orders");
      alert(res.data.message || "Customers synced.");
      await loadCustomers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to sync customers.");
    }
  }

  async function saveCustomer(e) {
    e.preventDefault();

    if (!form.phone.trim()) {
      alert("Phone number is required.");
      return;
    }

    setSaving(true);

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      email: form.email,
      address: form.address,
      notes: form.notes,
      customerType: form.customerType,
      loyaltyPoints: Number(form.loyaltyPoints || 0),
      isActive: form.isActive
    };

    try {
      if (form.id) {
        await api(token).put(`/api/customers/${form.id}`, payload);
      } else {
        await api(token).post("/api/customers", payload);
      }

      resetForm();
      await loadCustomers();
      alert("Customer saved successfully.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer) {
    if (!confirm(`Delete customer "${customer.name}"?`)) return;

    try {
      await api(token).delete(`/api/customers/${customer.id}`);
      setSelectedDetails(null);
      await loadCustomers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete customer.");
    }
  }

  async function updatePoints(e) {
    e.preventDefault();

    const customer = selectedDetails?.customer;

    if (!customer) {
      alert("Select customer first.");
      return;
    }

    if (!pointsForm.points && pointsForm.type !== "set") {
      alert("Enter points.");
      return;
    }

    try {
      await api(token).patch(`/api/customers/${customer.id}/points`, {
        type: pointsForm.type,
        points: Number(pointsForm.points || 0),
        note: pointsForm.note
      });

      setPointsForm({ type: "add", points: "", note: "" });
      await loadCustomers();

      const res = await api(token).get(`/api/customers/${customer.id}`);
      setSelectedDetails(res.data);

      alert("Points updated.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update points.");
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
            Customer Management & Loyalty
          </h1>
          <p className="nexa-section-sub">
            Customer profiles, order history and loyalty points for {session?.tenant?.restaurantName}.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="nexa-logout" onClick={syncCustomers}>
            <RefreshCw size={16} /> Sync From Orders
          </button>
          <button className="nexa-create-btn" onClick={loadCustomers}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="nexa-stats">
        {[
          ["Customers", totalCustomers, Users],
          ["Total Spend", money(totalSpent), BadgeDollarSign],
          ["Orders", totalOrders, CreditCard],
          ["Loyalty Points", totalPoints, Gift]
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
                <h2 style={{ margin: 0 }}>Customers</h2>
                <p className="nexa-section-sub">{filteredCustomers.length} customers showing</p>
              </div>

              <div className="nexa-input-wrap" style={{ minWidth: 300 }}>
                <Search size={16} color="#a5f3fc" />
                <input
                  className="nexa-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer..."
                />
              </div>
            </div>

            {filteredCustomers.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                <Users size={56} />
                <h3>No customers yet</h3>
                <p>Sync from orders or create customer manually.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 14 }}>
                {filteredCustomers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    active={selectedDetails?.customer?.id === customer.id || form.id === customer.id}
                    onSelect={selectCustomer}
                    onEdit={editCustomer}
                    onDelete={deleteCustomer}
                  />
                ))}
              </div>
            )}
          </section>

          {selectedDetails ? (
            <section className="nexa-panel">
              <div className="nexa-row-between" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{selectedDetails.customer.name}</h2>
                  <p className="nexa-section-sub">
                    {selectedDetails.customer.phone} · {selectedDetails.customer.loyaltyPoints || 0} points
                  </p>
                </div>
                <button className="nexa-logout" onClick={() => setSelectedDetails(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="nexa-stats" style={{ marginTop: 0 }}>
                {[
                  ["Total Orders", selectedDetails.customer.stats?.totalOrders || 0, CreditCard],
                  ["Paid Orders", selectedDetails.customer.stats?.paidOrders || 0, BadgeDollarSign],
                  ["Total Spent", money(selectedDetails.customer.stats?.totalSpent || 0), Star],
                  ["Average Spend", money(selectedDetails.customer.stats?.averageSpend || 0), Gift]
                ].map(([label, value, Icon]) => (
                  <div className="nexa-stat-card" key={label}>
                    <Icon color="#d8b4fe" size={28} />
                    <p className="nexa-stat-label">{label}</p>
                    <p className="nexa-stat-value">{value}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: 14 }}>
                <div>
                  <h3>Order History</h3>
                  <OrderHistory orders={selectedDetails.orders || []} />
                </div>

                <aside>
                  <h3>Loyalty Points</h3>

                  <form onSubmit={updatePoints} style={{ display: "grid", gap: 9, marginBottom: 14 }}>
                    <label className="nexa-field" style={{ margin: 0 }}>
                      <span className="nexa-label">Action</span>
                      <div className="nexa-input-wrap">
                        <select
                          className="nexa-input"
                          value={pointsForm.type}
                          onChange={(e) => setPointsForm((prev) => ({ ...prev, type: e.target.value }))}
                        >
                          <option value="add">Add Points</option>
                          <option value="redeem">Redeem Points</option>
                          <option value="set">Set Points</option>
                        </select>
                      </div>
                    </label>

                    <Field
                      label="Points"
                      type="number"
                      value={pointsForm.points}
                      onChange={(v) => setPointsForm((prev) => ({ ...prev, points: v }))}
                    />

                    <Field
                      label="Note"
                      value={pointsForm.note}
                      onChange={(v) => setPointsForm((prev) => ({ ...prev, note: v }))}
                    />

                    <button className="nexa-create-btn">
                      <Save size={16} /> Update Points
                    </button>
                  </form>

                  <PointLogs logs={selectedDetails.pointLogs || []} />
                </aside>
              </div>
            </section>
          ) : null}
        </main>

        <aside className="nexa-panel" style={{ alignSelf: "start", position: "sticky", top: 14 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>{form.id ? "Edit Customer" : "Create Customer"}</h2>
              <p className="nexa-section-sub">Customer profile and loyalty setup.</p>
            </div>

            {form.id ? (
              <button className="nexa-logout" onClick={resetForm}>
                <X size={16} />
              </button>
            ) : (
              <UserPlus color="#a5f3fc" size={28} />
            )}
          </div>

          <form onSubmit={saveCustomer}>
            <div className="nexa-form-grid">
              <Field label="First Name" value={form.firstName} onChange={(v) => setValue("firstName", v)} />
              <Field label="Last Name" value={form.lastName} onChange={(v) => setValue("lastName", v)} />
            </div>

            <Field label="Phone" value={form.phone} onChange={(v) => setValue("phone", v)} />
            <Field label="Email" value={form.email} onChange={(v) => setValue("email", v)} />
            <Field label="Address" value={form.address} onChange={(v) => setValue("address", v)} />

            <label className="nexa-field">
              <span className="nexa-label">Customer Type</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={form.customerType}
                  onChange={(e) => setValue("customerType", e.target.value)}
                >
                  <option value="regular">Regular</option>
                  <option value="vip">VIP</option>
                  <option value="corporate">Corporate</option>
                  <option value="delivery">Delivery Customer</option>
                </select>
              </div>
            </label>

            <Field label="Opening Loyalty Points" type="number" value={form.loyaltyPoints} onChange={(v) => setValue("loyaltyPoints", v)} />
            <Field label="Notes" value={form.notes} onChange={(v) => setValue("notes", v)} />

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
              <strong>Status</strong>
              <button type="button" className="nexa-pill" onClick={() => setValue("isActive", !form.isActive)}>
                {form.isActive ? "Active" : "Inactive"}
              </button>
            </div>

            <button className="nexa-create-btn" disabled={saving} style={{ width: "100%", marginTop: 14 }}>
              <Plus size={16} /> {saving ? "Saving..." : form.id ? "Update Customer" : "Create Customer"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}