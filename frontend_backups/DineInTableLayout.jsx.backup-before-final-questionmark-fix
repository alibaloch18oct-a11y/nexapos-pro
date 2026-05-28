import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const defaultAreas = ["Main Hall", "VIP Room", "Family Zone", "Outdoor", "Rooftop"];

const fallbackTables = [
  { id: "t-1", name: "T1", area: "Main Hall", seats: 4, status: "available", shape: "round" },
  { id: "t-2", name: "T2", area: "Main Hall", seats: 4, status: "occupied", shape: "round", waiterName: "Ali Waiter", currentOrderNo: "C-004" },
  { id: "t-3", name: "T3", area: "Main Hall", seats: 6, status: "available", shape: "rect" },
  { id: "t-4", name: "T4", area: "Main Hall", seats: 2, status: "cleaning", shape: "round" },
  { id: "t-5", name: "VIP 1", area: "VIP Room", seats: 6, status: "reserved", shape: "rect", reservationName: "VIP Guest", reservationPhone: "03000000000", reservationTime: "9:00 PM" },
  { id: "t-6", name: "VIP 2", area: "VIP Room", seats: 8, status: "available", shape: "rect" },
  { id: "t-7", name: "F1", area: "Family Zone", seats: 6, status: "occupied", shape: "rect", waiterName: "Hassan", currentOrderNo: "C-007" },
  { id: "t-8", name: "F2", area: "Family Zone", seats: 4, status: "available", shape: "round" },
  { id: "t-9", name: "O1", area: "Outdoor", seats: 4, status: "available", shape: "round" },
  { id: "t-10", name: "O2", area: "Outdoor", seats: 2, status: "available", shape: "round" },
  { id: "t-11", name: "R1", area: "Rooftop", seats: 6, status: "reserved", shape: "rect", reservationName: "Family Dinner", reservationPhone: "03210000000", reservationTime: "8:30 PM" },
  { id: "t-12", name: "R2", area: "Rooftop", seats: 8, status: "available", shape: "rect" }
];

function statusTone(status) {
  const map = {
    available: {
      label: "Available",
      icon: "✅",
      color: "#86efac",
      bg: "rgba(34,197,94,.14)",
      border: "rgba(34,197,94,.35)",
      glow: "rgba(34,197,94,.24)"
    },
    occupied: {
      label: "Occupied",
      icon: "🍽️",
      color: "#fca5a5",
      bg: "rgba(239,68,68,.14)",
      border: "rgba(239,68,68,.35)",
      glow: "rgba(239,68,68,.24)"
    },
    reserved: {
      label: "Reserved",
      icon: "📌",
      color: "#fde68a",
      bg: "rgba(250,204,21,.14)",
      border: "rgba(250,204,21,.35)",
      glow: "rgba(250,204,21,.24)"
    },
    cleaning: {
      label: "Cleaning",
      icon: "🧹",
      color: "#93c5fd",
      bg: "rgba(59,130,246,.14)",
      border: "rgba(59,130,246,.35)",
      glow: "rgba(59,130,246,.24)"
    },
    merged: {
      label: "Merged",
      icon: "🔗",
      color: "#c4b5fd",
      bg: "rgba(168,85,247,.14)",
      border: "rgba(168,85,247,.35)",
      glow: "rgba(168,85,247,.24)"
    }
  };

  return map[status] || map.available;
}

function normalizeTable(table, index) {
  const seats = Number(table.seats || table.chairs || table.capacity || 4);

  return {
    id: table.id || table.tableId || `table-${index + 1}`,
    name: table.name || table.tableNo || `T${index + 1}`,
    area: table.area || table.section || "Main Hall",
    seats,
    status: table.status || table.tableStatus || "available",
    shape: table.shape || (seats > 4 ? "rect" : "round"),
    waiterName: table.waiterName || "",
    currentOrderNo: table.currentOrderNo || "",
    total: Number(table.total || 0),
    reservationName: table.reservationName || "",
    reservationPhone: table.reservationPhone || "",
    reservationTime: table.reservationTime || "",
    reservationNote: table.reservationNote || "",
    mergedWith: Array.isArray(table.mergedWith) ? table.mergedWith : [],
    mergedMasterId: table.mergedMasterId || ""
  };
}

function Chair({ position }) {
  return <div className={`floor-chair ${position}`} />;
}

function TableFormModal({ table, onClose, onSave }) {
  const isEdit = Boolean(table?.id);

  const [form, setForm] = useState({
    name: table?.name || "",
    area: table?.area || "Main Hall",
    seats: table?.seats || 4,
    shape: table?.shape || "round",
    status: table?.status || "available",
    reservationName: table?.reservationName || "",
    reservationPhone: table?.reservationPhone || "",
    reservationTime: table?.reservationTime || "",
    reservationNote: table?.reservationNote || ""
  });

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="floor-modal-backdrop">
      <div className="floor-modal">
        <div className="floor-modal-head">
          <div>
            <h2>{isEdit ? `Edit ${table.name}` : "Add New Table"}</h2>
            <p>Change table name, area, chairs, shape and status.</p>
          </div>

          <button className="floor-icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="floor-form-grid">
          <label>
            <span>Table Name</span>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="T1 / VIP 1" />
          </label>

          <label>
            <span>Area</span>
            <input value={form.area} onChange={(e) => update("area", e.target.value)} placeholder="Main Hall" />
          </label>

          <label>
            <span>Chairs / Seats</span>
            <input type="number" min="1" max="20" value={form.seats} onChange={(e) => update("seats", Number(e.target.value || 1))} />
          </label>

          <label>
            <span>Shape</span>
            <select value={form.shape} onChange={(e) => update("shape", e.target.value)}>
              <option value="round">Round</option>
              <option value="rect">Rectangle</option>
              <option value="booth">Booth</option>
            </select>
          </label>

          <label>
            <span>Status</span>
            <select value={form.status} onChange={(e) => update("status", e.target.value)}>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
              <option value="cleaning">Cleaning</option>
            </select>
          </label>

          <label>
            <span>Reservation Name</span>
            <input value={form.reservationName} onChange={(e) => update("reservationName", e.target.value)} />
          </label>

          <label>
            <span>Reservation Phone</span>
            <input value={form.reservationPhone} onChange={(e) => update("reservationPhone", e.target.value)} />
          </label>

          <label>
            <span>Reservation Time</span>
            <input value={form.reservationTime} onChange={(e) => update("reservationTime", e.target.value)} placeholder="8:30 PM" />
          </label>
        </div>

        <label className="floor-field">
          <span>Reservation Note</span>
          <input value={form.reservationNote} onChange={(e) => update("reservationNote", e.target.value)} placeholder="Birthday, VIP guest, family dinner..." />
        </label>

        <div className="floor-modal-actions">
          <button className="floor-soft-btn" onClick={onClose}>Cancel</button>
          <button className="floor-primary-btn" onClick={() => onSave(table, form)}>
            {isEdit ? "Save Table" : "Create Table"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableCard({ table, allTables, onOpenOrder, onEdit, onStatusChange }) {
  const tone = statusTone(table.status);
  const chairs = Math.min(10, Math.max(1, Number(table.seats || 4)));
  const isMergedChild = Boolean(table.mergedMasterId);

  const chairPositions = [
    "top-left",
    "top",
    "top-right",
    "right-top",
    "right-bottom",
    "bottom-right",
    "bottom",
    "bottom-left",
    "left-bottom",
    "left-top"
  ].slice(0, chairs);

  const mergedNames = table.mergedWith
    .map((id) => allTables.find((item) => item.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  const canOpenOrder = table.status !== "cleaning" && !isMergedChild;

  return (
    <div className={`floor-table-card ${table.shape} ${isMergedChild ? "locked" : ""}`} style={{ borderColor: tone.border, boxShadow: `0 20px 55px ${tone.glow}` }}>
      <div className="floor-status-pill" style={{ color: tone.color, background: tone.bg, borderColor: tone.border }}>
        {tone.icon} {isMergedChild ? "Merged Child" : tone.label}
      </div>

      <div className="floor-table-stage">
        {chairPositions.map((position) => (
          <Chair key={position} position={position} />
        ))}

        <button
          className={`floor-table-core ${table.shape}`}
          onClick={() => canOpenOrder && onOpenOrder(table)}
          style={{
            borderColor: tone.border,
            background: `radial-gradient(circle at top left, ${tone.bg}, rgba(15,23,42,.96))`,
            cursor: canOpenOrder ? "pointer" : "not-allowed"
          }}
        >
          <strong>{table.name}</strong>
          <span>{table.seats} chairs</span>
        </button>
      </div>

      <div className="floor-card-info">
        <div>
          <h3>{table.name}</h3>
          <p>{table.area}</p>
        </div>
        <div className="floor-capacity">{table.seats} seats</div>
      </div>

      {table.waiterName || table.currentOrderNo ? (
        <div className="floor-info-box blue">
          {table.currentOrderNo ? <strong>Order: {table.currentOrderNo}</strong> : null}
          {table.waiterName ? <span>Waiter: {table.waiterName}</span> : null}
        </div>
      ) : null}

      {table.reservationName || table.reservationPhone || table.reservationTime ? (
        <div className="floor-info-box yellow">
          <strong>📌 {table.reservationName || "Reserved Guest"}</strong>
          {table.reservationPhone ? <span>{table.reservationPhone}</span> : null}
          {table.reservationTime ? <span>{table.reservationTime}</span> : null}
          {table.reservationNote ? <span>{table.reservationNote}</span> : null}
        </div>
      ) : null}

      {table.mergedWith.length > 0 || table.mergedMasterId ? (
        <div className="floor-info-box purple">
          {table.mergedMasterId ? (
            <strong>Merged into {allTables.find((item) => item.id === table.mergedMasterId)?.name || "another table"}</strong>
          ) : (
            <strong>Merged with {mergedNames || "selected tables"}</strong>
          )}
        </div>
      ) : null}

      <div className="floor-quick-row">
        <button onClick={() => onStatusChange(table, "available")}>Available</button>
        <button onClick={() => onStatusChange(table, "occupied")}>Occupied</button>
        <button onClick={() => onStatusChange(table, "cleaning")}>Cleaning</button>
      </div>

      <div className="floor-actions">
        <button className="floor-open-btn" disabled={!canOpenOrder} onClick={() => onOpenOrder(table)}>Open Order</button>
        <button className="floor-edit-btn" onClick={() => onEdit(table)}>Edit Table</button>
      </div>
    </div>
  );
}

export default function DineInTableLayout({ token, session, onBack, onOpenOrder }) {
  const [tables, setTables] = useState([]);
  const [activeArea, setActiveArea] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingTable, setEditingTable] = useState(null);
  const [addingTable, setAddingTable] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadTables() {
    setLoading(true);

    try {
      const res = await api(token).get("/api/tables");
      const list = Array.isArray(res.data) ? res.data : res.data.tables || [];
      setTables((list.length ? list : fallbackTables).map(normalizeTable));
    } catch {
      setTables(fallbackTables.map(normalizeTable));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTables();
  }, []);

  const areas = useMemo(() => {
    return ["All", ...new Set([...defaultAreas, ...tables.map((table) => table.area)])];
  }, [tables]);

  const filteredTables = useMemo(() => {
    const q = search.toLowerCase();

    return tables.filter((table) => {
      const byArea = activeArea === "All" || table.area === activeArea;
      const byStatus = statusFilter === "all" || table.status === statusFilter;
      const bySearch =
        !q ||
        String(table.name || "").toLowerCase().includes(q) ||
        String(table.area || "").toLowerCase().includes(q) ||
        String(table.waiterName || "").toLowerCase().includes(q) ||
        String(table.currentOrderNo || "").toLowerCase().includes(q) ||
        String(table.reservationName || "").toLowerCase().includes(q) ||
        String(table.reservationPhone || "").toLowerCase().includes(q);

      return byArea && byStatus && bySearch;
    });
  }, [tables, activeArea, statusFilter, search]);

  async function persistTable(tableId, data) {
    try {
      await api(token).patch(`/api/tables/${tableId}`, data);
    } catch {
      // UI stays working even if backend table route is unavailable.
    }
  }

  async function saveTable(table, form) {
    const payload = {
      ...form,
      seats: Number(form.seats || 4),
      reservationName: form.status === "reserved" ? form.reservationName || "Reserved Guest" : form.reservationName,
      updatedAt: new Date().toISOString()
    };

    if (table?.id) {
      setTables((prev) => prev.map((item) => (item.id === table.id ? { ...item, ...payload } : item)));
      await persistTable(table.id, payload);
      setEditingTable(null);
      return;
    }

    const newTable = {
      id: `table-${Date.now()}`,
      ...payload,
      waiterName: "",
      currentOrderNo: "",
      total: 0,
      mergedWith: [],
      mergedMasterId: ""
    };

    setTables((prev) => [...prev, newTable]);

    try {
      await api(token).post("/api/tables", newTable);
      await loadTables();
    } catch {
      // local preview fallback
    }

    setAddingTable(false);
  }

  async function updateTableStatus(table, status) {
    const payload =
      status === "available"
        ? {
            status,
            reservationName: "",
            reservationPhone: "",
            reservationTime: "",
            reservationNote: ""
          }
        : { status };

    setTables((prev) => prev.map((item) => (item.id === table.id ? { ...item, ...payload } : item)));
    await persistTable(table.id, payload);
  }

  async function seedDemoData() {
    try {
      const res = await api(token).post("/api/demo-polish/seed");
      alert(res.data.message || "Demo data added successfully.");
      await loadTables();
    } catch (error) {
      alert(error.response?.data?.message || "Demo seed route not ready. Add backend route from next step.");
    }
  }

  const stats = {
    available: tables.filter((table) => table.status === "available").length,
    occupied: tables.filter((table) => table.status === "occupied").length,
    reserved: tables.filter((table) => table.status === "reserved").length,
    cleaning: tables.filter((table) => table.status === "cleaning").length
  };

  return (
    <div className="floor-page">
      <style>{`
        .floor-page {
          min-height: 100vh;
          padding: 18px;
          color: white;
          background:
            radial-gradient(circle at 12% 16%, rgba(34,211,238,.13), transparent 28%),
            radial-gradient(circle at 84% 12%, rgba(168,85,247,.13), transparent 30%),
            linear-gradient(180deg,#020617,#071028);
        }

        .floor-head {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: start;
          margin-bottom: 16px;
        }

        .floor-title {
          margin: 12px 0 4px;
          font-size: 36px;
          font-weight: 1000;
          letter-spacing: -.045em;
        }

        .floor-sub {
          margin: 0;
          color: #94a3b8;
        }

        .floor-back,
        .floor-soft-btn,
        .floor-primary-btn,
        .floor-icon-btn {
          border: 0;
          color: white;
          font-weight: 900;
          cursor: pointer;
          transition: .18s ease;
        }

        .floor-back,
        .floor-soft-btn,
        .floor-icon-btn {
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.10);
        }

        .floor-back,
        .floor-soft-btn,
        .floor-primary-btn {
          height: 44px;
          padding: 0 15px;
          border-radius: 15px;
        }

        .floor-primary-btn {
          background: linear-gradient(135deg,#06b6d4,#2563eb);
        }

        .floor-head-actions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .floor-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }

        .floor-stat {
          padding: 14px;
          border-radius: 22px;
          background: rgba(15,23,42,.78);
          border: 1px solid rgba(255,255,255,.10);
        }

        .floor-stat span {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 800;
        }

        .floor-stat strong {
          display: block;
          margin-top: 6px;
          font-size: 28px;
          font-weight: 1000;
        }

        .floor-toolbar {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          padding: 14px;
          border-radius: 25px;
          background: rgba(15,23,42,.78);
          border: 1px solid rgba(255,255,255,.10);
          margin-bottom: 14px;
        }

        .floor-search {
          height: 45px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.07);
          color: white;
          padding: 0 14px;
          outline: none;
          font-weight: 800;
        }

        .floor-filter-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .floor-filter-row button {
          height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.07);
          color: white;
          padding: 0 12px;
          font-weight: 850;
          cursor: pointer;
        }

        .floor-filter-row button.active {
          background: rgba(34,211,238,.20);
          border-color: rgba(34,211,238,.35);
        }

        .floor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(335px, 1fr));
          gap: 16px;
        }

        .floor-table-card {
          position: relative;
          min-height: 435px;
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(circle at 18% 10%, rgba(34,211,238,.09), transparent 34%),
            radial-gradient(circle at 92% 0%, rgba(168,85,247,.10), transparent 38%),
            rgba(15,23,42,.88);
          padding: 15px;
          overflow: hidden;
          transition: .22s ease;
        }

        .floor-table-card:hover {
          transform: translateY(-6px);
        }

        .floor-table-card.locked {
          opacity: .68;
        }

        .floor-status-pill {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 4;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid;
          font-size: 12px;
          font-weight: 950;
        }

        .floor-table-stage {
          height: 205px;
          position: relative;
          display: grid;
          place-items: center;
          margin-top: 22px;
        }

        .floor-table-core {
          position: relative;
          z-index: 3;
          width: 124px;
          height: 124px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,.18);
          color: white;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 5px;
          box-shadow: 0 22px 52px rgba(0,0,0,.34);
        }

        .floor-table-core.rect {
          width: 166px;
          height: 110px;
          border-radius: 30px;
        }

        .floor-table-core.booth {
          width: 178px;
          height: 106px;
          border-radius: 32px 32px 18px 18px;
        }

        .floor-table-core strong {
          font-size: 28px;
          font-weight: 1000;
        }

        .floor-table-core span {
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 850;
        }

        .floor-chair {
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,255,255,.96), rgba(203,213,225,.82));
          box-shadow: 0 9px 18px rgba(0,0,0,.26);
        }

        .floor-chair.top { top: 7px; left: 50%; transform: translateX(-50%); }
        .floor-chair.bottom { bottom: 7px; left: 50%; transform: translateX(-50%); }
        .floor-chair.top-left { top: 20px; left: 68px; }
        .floor-chair.top-right { top: 20px; right: 68px; }
        .floor-chair.bottom-left { bottom: 20px; left: 68px; }
        .floor-chair.bottom-right { bottom: 20px; right: 68px; }
        .floor-chair.left-top { left: 18px; top: 66px; }
        .floor-chair.left-bottom { left: 18px; bottom: 66px; }
        .floor-chair.right-top { right: 18px; top: 66px; }
        .floor-chair.right-bottom { right: 18px; bottom: 66px; }

        .floor-card-info {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .floor-card-info h3 {
          margin: 0;
          font-size: 23px;
        }

        .floor-card-info p {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 13px;
        }

        .floor-capacity {
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.10);
          font-size: 12px;
          font-weight: 900;
        }

        .floor-info-box {
          margin-top: 10px;
          padding: 10px;
          border-radius: 17px;
          display: grid;
          gap: 4px;
          font-size: 12px;
          font-weight: 850;
        }

        .floor-info-box.blue {
          background: rgba(34,211,238,.08);
          border: 1px solid rgba(34,211,238,.18);
          color: #a5f3fc;
        }

        .floor-info-box.yellow {
          background: rgba(250,204,21,.08);
          border: 1px solid rgba(250,204,21,.18);
          color: #fde68a;
        }

        .floor-info-box.purple {
          background: rgba(168,85,247,.08);
          border: 1px solid rgba(168,85,247,.18);
          color: #ddd6fe;
        }

        .floor-quick-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
          margin-top: 12px;
        }

        .floor-quick-row button {
          min-height: 35px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.07);
          color: white;
          cursor: pointer;
          font-size: 11px;
          font-weight: 850;
        }

        .floor-actions {
          display: grid;
          grid-template-columns: 1fr 115px;
          gap: 9px;
          margin-top: 10px;
        }

        .floor-open-btn,
        .floor-edit-btn {
          height: 43px;
          border: 0;
          border-radius: 15px;
          color: white;
          cursor: pointer;
          font-weight: 900;
        }

        .floor-open-btn {
          background: linear-gradient(135deg,#06b6d4,#2563eb);
        }

        .floor-edit-btn {
          background: rgba(255,255,255,.09);
          border: 1px solid rgba(255,255,255,.10);
        }

        .floor-open-btn:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .floor-empty {
          padding: 28px;
          border-radius: 24px;
          background: rgba(15,23,42,.78);
          border: 1px solid rgba(255,255,255,.10);
          color: #94a3b8;
          text-align: center;
        }

        .floor-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(2,6,23,.72);
          backdrop-filter: blur(10px);
          display: grid;
          place-items: center;
          padding: 18px;
        }

        .floor-modal {
          width: min(760px, calc(100vw - 36px));
          max-height: calc(100vh - 36px);
          overflow-y: auto;
          border-radius: 28px;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: 0 30px 90px rgba(0,0,0,.45);
          padding: 18px;
        }

        .floor-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .floor-modal-head h2 {
          margin: 0;
        }

        .floor-modal-head p {
          margin: 6px 0 0;
          color: #94a3b8;
        }

        .floor-icon-btn {
          width: 46px;
          height: 46px;
          border-radius: 16px;
        }

        .floor-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .floor-field,
        .floor-form-grid label {
          display: grid;
          gap: 8px;
          margin-bottom: 12px;
        }

        .floor-field span,
        .floor-form-grid span {
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 850;
        }

        .floor-field input,
        .floor-form-grid input,
        .floor-form-grid select {
          height: 45px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.07);
          color: white;
          padding: 0 13px;
          outline: none;
          font-weight: 800;
        }

        .floor-form-grid option {
          color: #111827;
        }

        .floor-modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 4px;
        }

        @media (max-width: 900px) {
          .floor-stats,
          .floor-toolbar,
          .floor-form-grid,
          .floor-modal-actions {
            grid-template-columns: 1fr;
          }

          .floor-filter-row {
            justify-content: flex-start;
          }

          .floor-head {
            display: grid;
          }

          .floor-head-actions {
            justify-content: flex-start;
          }
        }
      `}</style>

      <div className="floor-head">
        <div>
          <button className="floor-back" onClick={onBack}>← Back</button>
          <h1 className="floor-title">Dine-In Floor Plan</h1>
          <p className="floor-sub">
            Premium editable table layout for {session?.tenant?.restaurantName || "restaurant"}.
          </p>
        </div>

        <div className="floor-head-actions">
          <button className="floor-soft-btn" onClick={loadTables}>Refresh</button>
          <button className="floor-soft-btn" onClick={seedDemoData}>Seed Demo Data</button>
          <button className="floor-primary-btn" onClick={() => setAddingTable(true)}>+ Add Table</button>
        </div>
      </div>

      <div className="floor-stats">
        <div className="floor-stat"><span>Available</span><strong>{stats.available}</strong></div>
        <div className="floor-stat"><span>Occupied</span><strong>{stats.occupied}</strong></div>
        <div className="floor-stat"><span>Reserved</span><strong>{stats.reserved}</strong></div>
        <div className="floor-stat"><span>Cleaning</span><strong>{stats.cleaning}</strong></div>
      </div>

      <div className="floor-toolbar">
        <input
          className="floor-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search table, area, reservation, phone, waiter..."
        />

        <div className="floor-filter-row">
          {areas.map((area) => (
            <button key={area} className={activeArea === area ? "active" : ""} onClick={() => setActiveArea(area)}>
              {area}
            </button>
          ))}

          {["all", "available", "occupied", "reserved", "cleaning"].map((status) => (
            <button key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>
              {status === "all" ? "All Status" : statusTone(status).label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="floor-empty">Loading tables...</div>
      ) : filteredTables.length === 0 ? (
        <div className="floor-empty">No tables found.</div>
      ) : (
        <div className="floor-grid">
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              allTables={tables}
              onOpenOrder={onOpenOrder}
              onEdit={setEditingTable}
              onStatusChange={updateTableStatus}
            />
          ))}
        </div>
      )}

      {editingTable ? (
        <TableFormModal
          table={editingTable}
          onClose={() => setEditingTable(null)}
          onSave={saveTable}
        />
      ) : null}

      {addingTable ? (
        <TableFormModal
          table={null}
          onClose={() => setAddingTable(false)}
          onSave={saveTable}
        />
      ) : null}
    </div>
  );
}