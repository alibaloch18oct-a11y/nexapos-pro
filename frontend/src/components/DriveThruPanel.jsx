import React, { useEffect, useMemo, useState } from "react";
import {
  Car,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Edit3,
  Flag,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Timer,
  Trash2,
  Truck,
  User,
  X,
  ShoppingBag,
  ReceiptText
} from "lucide-react";
import { api } from "../lib/api";

const emptyForm = {
  id: "",
  customerName: "",
  phone: "",
  vehicleNo: "",
  vehicleColor: "",
  vehicleType: "Car",
  notes: "",
  status: "waiting"
};

function statusLabel(status) {
  const map = {
    waiting: "Waiting",
    ordering: "Ordering",
    preparing: "Preparing",
    ready: "Ready",
    served: "Served",
    cancelled: "Cancelled"
  };

  return map[status] || status || "Waiting";
}

function statusTone(status) {
  if (status === "waiting") return { color: "#a5f3fc", bg: "rgba(34,211,238,.13)", border: "rgba(34,211,238,.28)" };
  if (status === "ordering") return { color: "#c4b5fd", bg: "rgba(168,85,247,.13)", border: "rgba(168,85,247,.28)" };
  if (status === "preparing") return { color: "#fde68a", bg: "rgba(250,204,21,.13)", border: "rgba(250,204,21,.28)" };
  if (status === "ready") return { color: "#86efac", bg: "rgba(34,197,94,.13)", border: "rgba(34,197,94,.28)" };
  if (status === "served") return { color: "#93c5fd", bg: "rgba(59,130,246,.13)", border: "rgba(59,130,246,.28)" };
  return { color: "#fca5a5", bg: "rgba(239,68,68,.13)", border: "rgba(239,68,68,.28)" };
}

function minutesAgo(value) {
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return 0;
  return Math.max(0, Math.floor((Date.now() - date) / 60000));
}

function money(value) {
  return `Rs ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function TicketCard({ ticket, onEdit, onDelete, onStatus, onOpenPOS }) {
  const tone = statusTone(ticket.status);
  const age = minutesAgo(ticket.createdAt);
  const hasOrder = ticket.orderNo || ticket.orderId;

  return (
    <div
      style={{
        borderRadius: 26,
        border: `1px solid ${tone.border}`,
        background: `radial-gradient(circle at top left, ${tone.bg}, transparent 38%), rgba(15,23,42,.88)`,
        padding: 14,
        boxShadow: "0 18px 50px rgba(0,0,0,.26)"
      }}
    >
      <div className="nexa-row-between">
        <div>
          <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-.04em" }}>
            {ticket.tokenNo}
          </h2>
          <p className="nexa-small">
            {new Date(ticket.createdAt || Date.now()).toLocaleString()}
          </p>
        </div>

        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 22,
            display: "grid",
            placeItems: "center",
            color: tone.color,
            background: tone.bg,
            border: `1px solid ${tone.border}`
          }}
        >
          {ticket.vehicleType === "Truck" ? <Truck size={30} /> : <Car size={30} />}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <div className="nexa-pill" style={{ color: tone.color }}>
          {statusLabel(ticket.status)}
        </div>

        <div className="nexa-pill">
          <Timer size={14} /> {age} min
        </div>

        <div className="nexa-pill">
          {ticket.vehicleType || "Car"}
        </div>

        {hasOrder ? (
          <div className="nexa-pill" style={{ color: "#86efac" }}>
            <ReceiptText size={14} /> {ticket.orderNo}
          </div>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 18,
          background: "rgba(2,6,23,.42)",
          border: "1px solid rgba(255,255,255,.09)"
        }}
      >
        <div style={{ display: "grid", gap: 9 }}>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <User size={16} color="#a5f3fc" />
            <strong>{ticket.customerName || "Drive Thru Customer"}</strong>
          </div>

          <div style={{ display: "flex", gap: 9, alignItems: "center", color: "#cbd5e1" }}>
            <Phone size={16} color="#a5f3fc" />
            {ticket.phone || "No phone"}
          </div>

          <div style={{ display: "flex", gap: 9, alignItems: "center", color: "#cbd5e1" }}>
            <ShieldCheck size={16} color="#a5f3fc" />
            Vehicle: {ticket.vehicleNo || "N/A"} · {ticket.vehicleColor || "No color"}
          </div>
        </div>

        {ticket.total > 0 ? (
          <p style={{ marginBottom: 0, color: "#86efac", fontWeight: 900 }}>
            Order Total: {money(ticket.total)}
          </p>
        ) : null}

        {ticket.notes ? (
          <p style={{ marginBottom: 0, color: "#fde68a", fontWeight: 800 }}>
            Note: {ticket.notes}
          </p>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
        {["waiting", "ordering", "preparing", "ready"].map((status) => (
          <button
            key={status}
            className="nexa-pill"
            onClick={() => onStatus(ticket, status)}
            style={{
              background: ticket.status === status ? statusTone(status).bg : "rgba(255,255,255,.08)",
              color: ticket.status === status ? statusTone(status).color : "#cbd5e1"
            }}
          >
            {statusLabel(status)}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 44px", gap: 8, marginTop: 9 }}>
        <button
          className="nexa-create-btn"
          onClick={() => {
            onStatus(ticket, "ordering");
            onOpenPOS(ticket);
          }}
        >
          <ShoppingBag size={15} /> Open POS
        </button>

        <button className="nexa-pill" onClick={() => onStatus(ticket, "served")}>
          <CheckCircle2 size={15} /> Served
        </button>

        <button className="nexa-pill" onClick={() => onEdit(ticket)}>
          <Edit3 size={15} /> Edit
        </button>

        <button className="nexa-logout" onClick={() => onDelete(ticket)}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export default function DriveThruPanel({ token, session, onBack, onOpenPOS }) {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [saving, setSaving] = useState(false);

  async function loadTickets() {
    try {
      const res = await api(token).get("/api/drive-thru");
      setTickets(res.data.tickets || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load drive thru queue.");
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const query = search.toLowerCase();

      const bySearch =
        !search ||
        String(ticket.tokenNo || "").toLowerCase().includes(query) ||
        String(ticket.customerName || "").toLowerCase().includes(query) ||
        String(ticket.phone || "").toLowerCase().includes(query) ||
        String(ticket.vehicleNo || "").toLowerCase().includes(query) ||
        String(ticket.vehicleColor || "").toLowerCase().includes(query) ||
        String(ticket.orderNo || "").toLowerCase().includes(query);

      const byStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !["served", "cancelled"].includes(ticket.status)) ||
        ticket.status === statusFilter;

      return bySearch && byStatus;
    });
  }, [tickets, search, statusFilter]);

  const stats = {
    waiting: tickets.filter((ticket) => ticket.status === "waiting").length,
    ordering: tickets.filter((ticket) => ticket.status === "ordering").length,
    preparing: tickets.filter((ticket) => ticket.status === "preparing").length,
    ready: tickets.filter((ticket) => ticket.status === "ready").length,
    served: tickets.filter((ticket) => ticket.status === "served").length
  };

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
  }

  function editTicket(ticket) {
    setForm({
      id: ticket.id,
      customerName: ticket.customerName || "",
      phone: ticket.phone || "",
      vehicleNo: ticket.vehicleNo || "",
      vehicleColor: ticket.vehicleColor || "",
      vehicleType: ticket.vehicleType || "Car",
      notes: ticket.notes || "",
      status: ticket.status || "waiting"
    });
  }

  async function saveTicket(e) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      customerName: form.customerName || "Drive Thru Customer",
      phone: form.phone,
      vehicleNo: form.vehicleNo,
      vehicleColor: form.vehicleColor,
      vehicleType: form.vehicleType,
      notes: form.notes,
      status: form.status
    };

    try {
      if (form.id) {
        await api(token).patch(`/api/drive-thru/${form.id}`, payload);
      } else {
        await api(token).post("/api/drive-thru", payload);
      }

      resetForm();
      await loadTickets();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save drive thru ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(ticket, status) {
    try {
      await api(token).patch(`/api/drive-thru/${ticket.id}`, { status });
      setTickets((prev) =>
        prev.map((item) => item.id === ticket.id ? { ...item, status, updatedAt: new Date().toISOString() } : item)
      );
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update status.");
    }
  }

  async function deleteTicket(ticket) {
    if (!confirm(`Delete ${ticket.tokenNo}?`)) return;

    try {
      await api(token).delete(`/api/drive-thru/${ticket.id}`);
      await loadTickets();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete ticket.");
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
            Drive Thru Queue
          </h1>
          <p className="nexa-section-sub">
            Create token, open POS directly, and attach final order to vehicle queue for {session?.tenant?.restaurantName}.
          </p>
        </div>

        <button className="nexa-create-btn" onClick={loadTickets}>
          <RefreshCw size={16} /> Refresh Queue
        </button>
      </div>

      <div className="nexa-stats">
        {[
          ["Waiting", stats.waiting, Clock3, "#a5f3fc"],
          ["Ordering", stats.ordering, Car, "#c4b5fd"],
          ["Preparing", stats.preparing, Timer, "#fde68a"],
          ["Ready", stats.ready, Flag, "#86efac"],
          ["Served", stats.served, CheckCircle2, "#93c5fd"]
        ].map(([label, value, Icon, color]) => (
          <div className="nexa-stat-card" key={label}>
            <Icon color={color} size={30} />
            <p className="nexa-stat-label">{label}</p>
            <p className="nexa-stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 390px", gap: 14 }}>
        <main className="nexa-panel">
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>Queue Board</h2>
              <p className="nexa-section-sub">{filteredTickets.length} tickets showing</p>
            </div>

            <div className="nexa-input-wrap" style={{ minWidth: 300 }}>
              <Search size={16} color="#a5f3fc" />
              <input
                className="nexa-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search token, phone, vehicle, order..."
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
            {["active", "all", "waiting", "ordering", "preparing", "ready", "served", "cancelled"].map((item) => (
              <button
                key={item}
                className="nexa-pill"
                onClick={() => setStatusFilter(item)}
                style={{
                  background: statusFilter === item ? "rgba(34,211,238,.20)" : "rgba(255,255,255,.08)"
                }}
              >
                {item === "active" ? "Active" : statusLabel(item)}
              </button>
            ))}
          </div>

          {filteredTickets.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 44 }}>
              <Car size={58} />
              <h3>No drive thru tickets</h3>
              <p>Create a token from the right panel.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 14 }}>
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onEdit={editTicket}
                  onDelete={deleteTicket}
                  onStatus={updateStatus}
                  onOpenPOS={onOpenPOS}
                />
              ))}
            </div>
          )}
        </main>

        <aside className="nexa-panel" style={{ alignSelf: "start", position: "sticky", top: 14 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>{form.id ? "Edit Token" : "Create Token"}</h2>
              <p className="nexa-section-sub">Drive Thru vehicle/customer info</p>
            </div>

            {form.id ? (
              <button className="nexa-logout" onClick={resetForm}>
                <X size={16} />
              </button>
            ) : (
              <Car color="#a5f3fc" size={30} />
            )}
          </div>

          <form onSubmit={saveTicket}>
            <label className="nexa-field">
              <span className="nexa-label">Customer Name</span>
              <div className="nexa-input-wrap">
                <User size={16} color="#a5f3fc" />
                <input
                  className="nexa-input"
                  value={form.customerName}
                  onChange={(e) => setValue("customerName", e.target.value)}
                  placeholder="Customer name"
                />
              </div>
            </label>

            <label className="nexa-field">
              <span className="nexa-label">Phone</span>
              <div className="nexa-input-wrap">
                <Phone size={16} color="#a5f3fc" />
                <input
                  className="nexa-input"
                  value={form.phone}
                  onChange={(e) => setValue("phone", e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </label>

            <div className="nexa-form-grid">
              <label className="nexa-field">
                <span className="nexa-label">Vehicle No</span>
                <div className="nexa-input-wrap">
                  <input
                    className="nexa-input"
                    value={form.vehicleNo}
                    onChange={(e) => setValue("vehicleNo", e.target.value.toUpperCase())}
                    placeholder="ABC-123"
                  />
                </div>
              </label>

              <label className="nexa-field">
                <span className="nexa-label">Color</span>
                <div className="nexa-input-wrap">
                  <input
                    className="nexa-input"
                    value={form.vehicleColor}
                    onChange={(e) => setValue("vehicleColor", e.target.value)}
                    placeholder="Black"
                  />
                </div>
              </label>
            </div>

            <div className="nexa-form-grid">
              <label className="nexa-field">
                <span className="nexa-label">Vehicle Type</span>
                <div className="nexa-input-wrap">
                  <select
                    className="nexa-input"
                    value={form.vehicleType}
                    onChange={(e) => setValue("vehicleType", e.target.value)}
                  >
                    <option value="Car">Car</option>
                    <option value="Bike">Bike</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                  </select>
                </div>
              </label>

              <label className="nexa-field">
                <span className="nexa-label">Status</span>
                <div className="nexa-input-wrap">
                  <select
                    className="nexa-input"
                    value={form.status}
                    onChange={(e) => setValue("status", e.target.value)}
                  >
                    <option value="waiting">Waiting</option>
                    <option value="ordering">Ordering</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="served">Served</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </label>
            </div>

            <label className="nexa-field">
              <span className="nexa-label">Notes</span>
              <div className="nexa-input-wrap">
                <input
                  className="nexa-input"
                  value={form.notes}
                  onChange={(e) => setValue("notes", e.target.value)}
                  placeholder="Example: customer waiting near window"
                />
              </div>
            </label>

            <button className="nexa-create-btn" disabled={saving} style={{ width: "100%", marginTop: 14 }}>
              <Plus size={16} /> {saving ? "Saving..." : form.id ? "Update Token" : "Create Drive Thru Token"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}