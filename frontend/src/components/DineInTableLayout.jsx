import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const defaultAreas = ["Main Hall", "VIP Room", "Family Zone", "Outdoor"];

const fallbackTables = [
  { id: "t-1", name: "T1", area: "Main Hall", seats: 4, status: "available", shape: "round" },
  { id: "t-2", name: "T2", area: "Main Hall", seats: 4, status: "available", shape: "round" },
  { id: "t-3", name: "T3", area: "Main Hall", seats: 6, status: "available", shape: "rect" },
  { id: "t-4", name: "T4", area: "Main Hall", seats: 2, status: "available", shape: "round" },
  { id: "t-5", name: "T5", area: "VIP Room", seats: 6, status: "reserved", shape: "rect", reservationName: "VIP Guest", reservationPhone: "03000000000", reservationTime: "21:00" },
  { id: "t-6", name: "T6", area: "VIP Room", seats: 8, status: "available", shape: "rect" },
  { id: "t-7", name: "T7", area: "Family Zone", seats: 6, status: "available", shape: "rect" },
  { id: "t-8", name: "T8", area: "Family Zone", seats: 4, status: "cleaning", shape: "round" },
  { id: "t-9", name: "T9", area: "Outdoor", seats: 4, status: "available", shape: "round" },
  { id: "t-10", name: "T10", area: "Outdoor", seats: 2, status: "available", shape: "round" },
  { id: "t-11", name: "T11", area: "Outdoor", seats: 6, status: "occupied", shape: "rect" },
  { id: "t-12", name: "T12", area: "Main Hall", seats: 8, status: "available", shape: "rect" }
];

function statusTone(status) {
  if (status === "available") {
    return {
      label: "Available",
      color: "#86efac",
      bg: "rgba(34,197,94,.14)",
      border: "rgba(34,197,94,.35)",
      glow: "rgba(34,197,94,.18)",
      icon: "✅"
    };
  }

  if (status === "occupied") {
    return {
      label: "Occupied",
      color: "#fca5a5",
      bg: "rgba(239,68,68,.14)",
      border: "rgba(239,68,68,.35)",
      glow: "rgba(239,68,68,.18)",
      icon: "🍽️"
    };
  }

  if (status === "reserved") {
    return {
      label: "Reserved",
      color: "#fde68a",
      bg: "rgba(250,204,21,.14)",
      border: "rgba(250,204,21,.35)",
      glow: "rgba(250,204,21,.18)",
      icon: "📌"
    };
  }

  if (status === "merged") {
    return {
      label: "Merged",
      color: "#c4b5fd",
      bg: "rgba(168,85,247,.14)",
      border: "rgba(168,85,247,.35)",
      glow: "rgba(168,85,247,.18)",
      icon: "🔗"
    };
  }

  return {
    label: "Cleaning",
    color: "#93c5fd",
    bg: "rgba(59,130,246,.14)",
    border: "rgba(59,130,246,.35)",
    glow: "rgba(59,130,246,.18)",
    icon: "🧹"
  };
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
    total: table.total || 0,
    reservationName: table.reservationName || "",
    reservationPhone: table.reservationPhone || "",
    reservationTime: table.reservationTime || "",
    reservationNote: table.reservationNote || "",
    mergedWith: Array.isArray(table.mergedWith) ? table.mergedWith : [],
    mergedMasterId: table.mergedMasterId || ""
  };
}

function Chair({ position }) {
  return <div className={`table-chair ${position}`} />;
}

function ReservationModal({ table, onClose, onSave }) {
  const [form, setForm] = useState({
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
            <h2>Reserve {table.name}</h2>
            <p>{table.area} · {table.seats} chairs</p>
          </div>

          <button className="floor-icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="floor-form-grid">
          <label>
            <span>Customer Name</span>
            <input value={form.reservationName} onChange={(e) => update("reservationName", e.target.value)} placeholder="Customer name" />
          </label>

          <label>
            <span>Phone Number</span>
            <input value={form.reservationPhone} onChange={(e) => update("reservationPhone", e.target.value)} placeholder="Phone number" />
          </label>
        </div>

        <label className="floor-field">
          <span>Reservation Time</span>
          <input value={form.reservationTime} onChange={(e) => update("reservationTime", e.target.value)} placeholder="Example: 8:30 PM" />
        </label>

        <label className="floor-field">
          <span>Reservation Note</span>
          <input value={form.reservationNote} onChange={(e) => update("reservationNote", e.target.value)} placeholder="Birthday, family dinner, VIP guest..." />
        </label>

        <div className="floor-modal-actions">
          <button className="floor-soft-btn" onClick={onClose}>Cancel</button>
          <button className="floor-primary-btn" onClick={() => onSave(table, form)}>Save Reservation</button>
        </div>
      </div>
    </div>
  );
}

function MoveMergeModal({ mode, table, tables, onClose, onMove, onMerge }) {
  const [targetId, setTargetId] = useState("");

  const availableTargets = tables.filter((item) => {
    if (item.id === table.id) return false;
    if (mode === "move") return item.status === "available" || item.status === "reserved";
    if (mode === "merge") return item.status !== "cleaning" && !item.mergedMasterId;
    return true;
  });

  const target = availableTargets.find((item) => item.id === targetId);

  return (
    <div className="floor-modal-backdrop">
      <div className="floor-modal">
        <div className="floor-modal-head">
          <div>
            <h2>{mode === "move" ? "Move Table / Order" : "Merge Tables"}</h2>
            <p>
              {mode === "move"
                ? `Move ${table.name} status/order details to another table.`
                : `Merge ${table.name} with another table for a larger seating group.`}
            </p>
          </div>

          <button className="floor-icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="floor-transfer-source">
          <strong>Source Table</strong>
          <span>{table.name} · {table.area} · {statusTone(table.status).label} · {table.seats} chairs</span>
          {table.currentOrderNo ? <span>Order: {table.currentOrderNo}</span> : null}
        </div>

        <label className="floor-field">
          <span>{mode === "move" ? "Move To Table" : "Merge With Table"}</span>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">Select target table</option>
            {availableTargets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.area} · {statusTone(item.status).label} · {item.seats} chairs
              </option>
            ))}
          </select>
        </label>

        {target ? (
          <div className="floor-transfer-preview">
            <strong>Target Preview</strong>
            <span>{target.name} · {target.area}</span>
            <span>Total seating after action: {mode === "merge" ? Number(table.seats) + Number(target.seats) : target.seats} chairs</span>
          </div>
        ) : null}

        <div className="floor-modal-actions">
          <button className="floor-soft-btn" onClick={onClose}>Cancel</button>
          <button
            className="floor-primary-btn"
            disabled={!targetId}
            onClick={() => {
              if (mode === "move") onMove(table, target);
              if (mode === "merge") onMerge(table, target);
            }}
          >
            {mode === "move" ? "Confirm Move" : "Confirm Merge"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableCard({
  table,
  allTables,
  onOpenOrder,
  onStatusChange,
  onReserve,
  onCancelReservation,
  onMove,
  onMerge,
  onUnmerge
}) {
  const tone = statusTone(table.status);
  const chairs = Math.min(8, Math.max(2, Number(table.seats || 4)));
  const isMergedChild = Boolean(table.mergedMasterId);
  const mergedNames = table.mergedWith
    .map((id) => allTables.find((item) => item.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  const chairPositions =
    chairs <= 2
      ? ["left", "right"]
      : chairs <= 4
      ? ["top", "right", "bottom", "left"]
      : chairs <= 6
      ? ["top-left", "top-right", "right", "bottom-right", "bottom-left", "left"]
      : ["top-left", "top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left"];

  const canOpenOrder = table.status !== "cleaning" && !isMergedChild;
  const hasReservation = table.status === "reserved" || table.reservationName || table.reservationPhone;
  const hasMerge = table.mergedWith.length > 0 || table.mergedMasterId;

  return (
    <div
      className={`floor-table-card ${isMergedChild ? "merged-child" : ""}`}
      style={{
        borderColor: tone.border,
        boxShadow: `0 20px 55px ${tone.glow}`
      }}
    >
      <div className="table-status-pill" style={{ color: tone.color, background: tone.bg, borderColor: tone.border }}>
        {tone.icon} {isMergedChild ? "Merged Child" : tone.label}
      </div>

      <div className="table-visual-wrap">
        {chairPositions.map((position) => (
          <Chair key={position} position={position} />
        ))}

        <button
          className={`table-core ${table.shape === "rect" ? "rect" : "round"}`}
          onClick={() => canOpenOrder && onOpenOrder(table)}
          style={{
            borderColor: tone.border,
            background: `radial-gradient(circle at top left, ${tone.bg}, rgba(15,23,42,.92))`,
            cursor: canOpenOrder ? "pointer" : "not-allowed"
          }}
        >
          <strong>{table.name}</strong>
          <span>{table.seats} seats</span>
        </button>
      </div>

      <div className="table-card-info">
        <div>
          <h3>{table.name}</h3>
          <p>{table.area}</p>
        </div>

        <div className="table-mini-badge">{table.seats} chairs</div>
      </div>

      {hasMerge ? (
        <div className="table-merge-info">
          {table.mergedMasterId ? (
            <strong>🔗 Merged into {allTables.find((item) => item.id === table.mergedMasterId)?.name || "another table"}</strong>
          ) : (
            <>
              <strong>🔗 Merged with {mergedNames || "selected tables"}</strong>
              <span>Total capacity: {table.seats + table.mergedWith.reduce((sum, id) => {
                const target = allTables.find((item) => item.id === id);
                return sum + Number(target?.seats || 0);
              }, 0)} chairs</span>
            </>
          )}
        </div>
      ) : null}

      {hasReservation ? (
        <div className="table-reservation-info">
          <strong>📌 {table.reservationName || "Reserved Guest"}</strong>
          {table.reservationPhone ? <span>Phone: {table.reservationPhone}</span> : null}
          {table.reservationTime ? <span>Time: {table.reservationTime}</span> : null}
          {table.reservationNote ? <span>Note: {table.reservationNote}</span> : null}
        </div>
      ) : null}

      {table.waiterName || table.currentOrderNo ? (
        <div className="table-current-info">
          {table.waiterName ? <span>Waiter: {table.waiterName}</span> : null}
          {table.currentOrderNo ? <span>Order: {table.currentOrderNo}</span> : null}
        </div>
      ) : null}

      <div className="table-quick-actions">
        <button onClick={() => onStatusChange(table, "available")} disabled={isMergedChild}>Available</button>
        <button onClick={() => onStatusChange(table, "occupied")} disabled={isMergedChild}>Occupied</button>
        <button onClick={() => onStatusChange(table, "cleaning")} disabled={isMergedChild}>Cleaning</button>
      </div>

      <div className="table-card-actions">
        <button className="open-order-btn" disabled={!canOpenOrder} onClick={() => onOpenOrder(table)}>
          Open Order
        </button>

        <button className="reserve-btn" disabled={isMergedChild} onClick={() => onReserve(table)}>
          Reserve
        </button>
      </div>

      <div className="table-advanced-actions">
        <button disabled={isMergedChild} onClick={() => onMove(table)}>Move</button>
        <button disabled={isMergedChild} onClick={() => onMerge(table)}>Merge</button>
        {hasMerge ? <button className="danger" onClick={() => onUnmerge(table)}>Unmerge</button> : null}
      </div>

      {hasReservation ? (
        <button className="cancel-reserve-btn" disabled={isMergedChild} onClick={() => onCancelReservation(table)}>
          Cancel Reservation
        </button>
      ) : null}
    </div>
  );
}

export default function DineInTableLayout({ token, session, onBack, onOpenOrder }) {
  const [tables, setTables] = useState([]);
  const [activeArea, setActiveArea] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reservationTable, setReservationTable] = useState(null);
  const [transferMode, setTransferMode] = useState(null);
  const [transferTable, setTransferTable] = useState(null);

  async function loadTables() {
    setLoading(true);

    try {
      const res = await api(token).get("/api/tables");
      const list = Array.isArray(res.data) ? res.data : res.data.tables || [];
      const normalized = list.length ? list.map(normalizeTable) : fallbackTables.map(normalizeTable);
      setTables(normalized);
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
      const byStatus = statusFilter === "all" || table.status === statusFilter || (statusFilter === "merged" && (table.mergedWith.length || table.mergedMasterId));
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
      // Local fallback keeps UI working if backend table patch is unavailable.
    }
  }

  async function updateTableStatus(table, status) {
    const nextData =
      status === "available"
        ? {
            status,
            reservationName: "",
            reservationPhone: "",
            reservationTime: "",
            reservationNote: ""
          }
        : { status };

    setTables((prev) =>
      prev.map((item) => (item.id === table.id ? { ...item, ...nextData } : item))
    );

    await persistTable(table.id, nextData);
  }

  async function saveReservation(table, form) {
    const nextData = {
      status: "reserved",
      reservationName: form.reservationName || "Reserved Guest",
      reservationPhone: form.reservationPhone || "",
      reservationTime: form.reservationTime || "",
      reservationNote: form.reservationNote || ""
    };

    setTables((prev) =>
      prev.map((item) => (item.id === table.id ? { ...item, ...nextData } : item))
    );

    await persistTable(table.id, nextData);
    setReservationTable(null);
  }

  async function cancelReservation(table) {
    const confirmCancel = confirm(`Cancel reservation for ${table.name}?`);
    if (!confirmCancel) return;

    const nextData = {
      status: "available",
      reservationName: "",
      reservationPhone: "",
      reservationTime: "",
      reservationNote: ""
    };

    setTables((prev) =>
      prev.map((item) => (item.id === table.id ? { ...item, ...nextData } : item))
    );

    await persistTable(table.id, nextData);
  }

  function openMoveModal(table) {
    setTransferMode("move");
    setTransferTable(table);
  }

  function openMergeModal(table) {
    setTransferMode("merge");
    setTransferTable(table);
  }

  async function moveTable(source, target) {
    if (!source || !target) return;

    const ok = confirm(`Move ${source.name} details/order to ${target.name}?`);
    if (!ok) return;

    const targetData = {
      status: source.status,
      waiterName: source.waiterName,
      currentOrderNo: source.currentOrderNo,
      total: source.total,
      reservationName: source.reservationName,
      reservationPhone: source.reservationPhone,
      reservationTime: source.reservationTime,
      reservationNote: source.reservationNote
    };

    const sourceData = {
      status: "available",
      waiterName: "",
      currentOrderNo: "",
      total: 0,
      reservationName: "",
      reservationPhone: "",
      reservationTime: "",
      reservationNote: ""
    };

    setTables((prev) =>
      prev.map((item) => {
        if (item.id === source.id) return { ...item, ...sourceData };
        if (item.id === target.id) return { ...item, ...targetData };
        return item;
      })
    );

    await persistTable(source.id, sourceData);
    await persistTable(target.id, targetData);

    setTransferMode(null);
    setTransferTable(null);
  }

  async function mergeTables(master, target) {
    if (!master || !target) return;

    const ok = confirm(`Merge ${master.name} with ${target.name}? Orders should be opened from ${master.name}.`);
    if (!ok) return;

    const masterData = {
      status: master.status === "available" ? "occupied" : master.status,
      mergedWith: [...new Set([...(master.mergedWith || []), target.id])]
    };

    const targetData = {
      status: "merged",
      mergedMasterId: master.id
    };

    setTables((prev) =>
      prev.map((item) => {
        if (item.id === master.id) return { ...item, ...masterData };
        if (item.id === target.id) return { ...item, ...targetData };
        return item;
      })
    );

    await persistTable(master.id, masterData);
    await persistTable(target.id, targetData);

    setTransferMode(null);
    setTransferTable(null);
  }

  async function unmergeTable(table) {
    const ok = confirm(`Unmerge ${table.name}?`);
    if (!ok) return;

    const children = table.mergedMasterId ? [table] : tables.filter((item) => table.mergedWith.includes(item.id));
    const master = table.mergedMasterId ? tables.find((item) => item.id === table.mergedMasterId) : table;

    setTables((prev) =>
      prev.map((item) => {
        if (master && item.id === master.id) {
          return { ...item, mergedWith: [], status: item.status === "merged" ? "available" : item.status };
        }

        if (children.some((child) => child.id === item.id)) {
          return { ...item, mergedMasterId: "", status: "available" };
        }

        return item;
      })
    );

    if (master) await persistTable(master.id, { mergedWith: [] });

    for (const child of children) {
      await persistTable(child.id, { mergedMasterId: "", status: "available" });
    }
  }

  const stats = {
    available: tables.filter((table) => table.status === "available").length,
    occupied: tables.filter((table) => table.status === "occupied").length,
    reserved: tables.filter((table) => table.status === "reserved").length,
    cleaning: tables.filter((table) => table.status === "cleaning").length,
    merged: tables.filter((table) => table.mergedWith.length || table.mergedMasterId).length
  };

  return (
    <div className="floor-page">
      <style>
        {`
          .floor-page {
            min-height: 100vh;
            padding: 18px;
            color: white;
            background:
              radial-gradient(circle at 12% 16%, rgba(34,211,238,.12), transparent 28%),
              radial-gradient(circle at 84% 12%, rgba(168,85,247,.12), transparent 30%),
              linear-gradient(180deg,#020617,#071028);
          }

          .floor-head {
            display: flex;
            justify-content: space-between;
            align-items: start;
            gap: 16px;
            margin-bottom: 16px;
          }

          .floor-back,
          .floor-refresh,
          .open-order-btn,
          .reserve-btn,
          .cancel-reserve-btn,
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
          .floor-refresh,
          .floor-soft-btn,
          .floor-icon-btn {
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.10);
          }

          .floor-back,
          .floor-refresh {
            height: 44px;
            padding: 0 15px;
            border-radius: 15px;
          }

          .floor-back:hover,
          .floor-refresh:hover,
          .open-order-btn:hover,
          .reserve-btn:hover,
          .cancel-reserve-btn:hover,
          .floor-soft-btn:hover,
          .floor-primary-btn:hover {
            transform: translateY(-2px);
          }

          .floor-title {
            margin: 13px 0 4px;
            font-size: 36px;
            font-weight: 1000;
            letter-spacing: -.04em;
          }

          .floor-sub {
            margin: 0;
            color: #94a3b8;
          }

          .floor-stats {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
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
            padding: 14px;
            border-radius: 25px;
            background: rgba(15,23,42,.78);
            border: 1px solid rgba(255,255,255,.10);
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 12px;
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
            grid-template-columns: repeat(auto-fill, minmax(315px, 1fr));
            gap: 16px;
          }

          .floor-table-card {
            position: relative;
            min-height: 440px;
            border-radius: 30px;
            border: 1px solid rgba(255,255,255,.10);
            background:
              radial-gradient(circle at top right, rgba(34,211,238,.08), transparent 36%),
              rgba(15,23,42,.86);
            padding: 14px;
            overflow: hidden;
            transition: .22s ease;
          }

          .floor-table-card.merged-child {
            opacity: .72;
          }

          .floor-table-card:hover {
            transform: translateY(-6px);
          }

          .table-status-pill {
            position: absolute;
            top: 14px;
            right: 14px;
            z-index: 4;
            padding: 8px 10px;
            border-radius: 999px;
            border: 1px solid;
            font-size: 12px;
            font-weight: 900;
          }

          .table-visual-wrap {
            height: 190px;
            position: relative;
            display: grid;
            place-items: center;
            margin-top: 22px;
          }

          .table-core {
            position: relative;
            z-index: 3;
            width: 118px;
            height: 118px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,.18);
            color: white;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 5px;
            box-shadow: 0 18px 45px rgba(0,0,0,.30);
          }

          .table-core.rect {
            width: 150px;
            height: 104px;
            border-radius: 28px;
          }

          .table-core strong {
            font-size: 26px;
            font-weight: 1000;
          }

          .table-core span {
            color: #cbd5e1;
            font-size: 12px;
            font-weight: 800;
          }

          .table-chair {
            position: absolute;
            width: 34px;
            height: 34px;
            border-radius: 13px;
            background: linear-gradient(135deg, rgba(255,255,255,.92), rgba(203,213,225,.76));
            box-shadow: 0 8px 18px rgba(0,0,0,.24);
          }

          .table-chair.top { top: 7px; left: 50%; transform: translateX(-50%); }
          .table-chair.bottom { bottom: 7px; left: 50%; transform: translateX(-50%); }
          .table-chair.left { left: 18px; top: 50%; transform: translateY(-50%); }
          .table-chair.right { right: 18px; top: 50%; transform: translateY(-50%); }
          .table-chair.top-left { top: 22px; left: 56px; }
          .table-chair.top-right { top: 22px; right: 56px; }
          .table-chair.bottom-left { bottom: 22px; left: 56px; }
          .table-chair.bottom-right { bottom: 22px; right: 56px; }

          .table-card-info {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            align-items: center;
            margin-top: 4px;
          }

          .table-card-info h3 {
            margin: 0;
            font-size: 22px;
          }

          .table-card-info p {
            margin: 4px 0 0;
            color: #94a3b8;
            font-size: 13px;
          }

          .table-mini-badge {
            padding: 8px 10px;
            border-radius: 999px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.10);
            font-size: 12px;
            font-weight: 850;
          }

          .table-reservation-info,
          .table-current-info,
          .table-merge-info {
            margin-top: 10px;
            padding: 10px;
            border-radius: 17px;
            display: grid;
            gap: 4px;
            font-size: 12px;
            font-weight: 850;
          }

          .table-reservation-info {
            background: rgba(250,204,21,.08);
            border: 1px solid rgba(250,204,21,.18);
            color: #fde68a;
          }

          .table-current-info {
            background: rgba(34,211,238,.08);
            border: 1px solid rgba(34,211,238,.18);
            color: #a5f3fc;
          }

          .table-merge-info {
            background: rgba(168,85,247,.10);
            border: 1px solid rgba(168,85,247,.20);
            color: #ddd6fe;
          }

          .table-quick-actions {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 7px;
            margin-top: 12px;
          }

          .table-quick-actions button,
          .table-advanced-actions button {
            min-height: 35px;
            border-radius: 13px;
            border: 1px solid rgba(255,255,255,.10);
            background: rgba(255,255,255,.07);
            color: white;
            cursor: pointer;
            font-size: 11px;
            font-weight: 850;
          }

          .table-quick-actions button:disabled,
          .table-advanced-actions button:disabled,
          .open-order-btn:disabled,
          .reserve-btn:disabled,
          .floor-primary-btn:disabled {
            opacity: .45;
            cursor: not-allowed;
          }

          .table-card-actions {
            display: grid;
            grid-template-columns: 1fr 110px;
            gap: 9px;
            margin-top: 10px;
          }

          .open-order-btn,
          .reserve-btn,
          .cancel-reserve-btn {
            height: 43px;
            border-radius: 15px;
          }

          .open-order-btn {
            background: linear-gradient(135deg,#06b6d4,#2563eb);
          }

          .reserve-btn {
            background: linear-gradient(135deg,#facc15,#f97316);
            color: #111827;
          }

          .table-advanced-actions {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 7px;
            margin-top: 9px;
          }

          .table-advanced-actions button.danger {
            background: rgba(239,68,68,.16);
            color: #fecaca;
          }

          .cancel-reserve-btn {
            width: 100%;
            margin-top: 9px;
            background: rgba(239,68,68,.16);
            border: 1px solid rgba(239,68,68,.22);
            color: #fecaca;
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
            width: min(650px, calc(100vw - 36px));
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
            grid-template-columns: 1fr 1fr;
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
          .floor-field select,
          .floor-form-grid input {
            height: 45px;
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,.10);
            background: rgba(255,255,255,.07);
            color: white;
            padding: 0 13px;
            outline: none;
          }

          .floor-field option {
            color: #111827;
          }

          .floor-transfer-source,
          .floor-transfer-preview {
            padding: 13px;
            border-radius: 18px;
            display: grid;
            gap: 5px;
            background: rgba(34,211,238,.08);
            border: 1px solid rgba(34,211,238,.18);
            margin-bottom: 12px;
            color: #a5f3fc;
          }

          .floor-transfer-preview {
            background: rgba(168,85,247,.08);
            border-color: rgba(168,85,247,.18);
            color: #ddd6fe;
          }

          .floor-modal-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 4px;
          }

          .floor-soft-btn,
          .floor-primary-btn {
            height: 46px;
            border-radius: 16px;
          }

          .floor-primary-btn {
            background: linear-gradient(135deg,#06b6d4,#2563eb);
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
          }
        `}
      </style>

      <div className="floor-head">
        <div>
          <button className="floor-back" onClick={onBack}>← Back</button>
          <h1 className="floor-title">Dine-In Floor Plan</h1>
          <p className="floor-sub">
            Visual restaurant floor with reservations, move table, merge table, chairs, and direct order opening.
          </p>
        </div>

        <button className="floor-refresh" onClick={loadTables}>Refresh Tables</button>
      </div>

      <div className="floor-stats">
        <div className="floor-stat"><span>Available</span><strong>{stats.available}</strong></div>
        <div className="floor-stat"><span>Occupied</span><strong>{stats.occupied}</strong></div>
        <div className="floor-stat"><span>Reserved</span><strong>{stats.reserved}</strong></div>
        <div className="floor-stat"><span>Cleaning</span><strong>{stats.cleaning}</strong></div>
        <div className="floor-stat"><span>Merged</span><strong>{stats.merged}</strong></div>
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

          {["all", "available", "occupied", "reserved", "cleaning", "merged"].map((status) => (
            <button key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>
              {status === "all" ? "All Status" : status === "merged" ? "Merged" : statusTone(status).label}
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
              onStatusChange={updateTableStatus}
              onReserve={setReservationTable}
              onCancelReservation={cancelReservation}
              onMove={openMoveModal}
              onMerge={openMergeModal}
              onUnmerge={unmergeTable}
            />
          ))}
        </div>
      )}

      {reservationTable ? (
        <ReservationModal
          table={reservationTable}
          onClose={() => setReservationTable(null)}
          onSave={saveReservation}
        />
      ) : null}

      {transferMode && transferTable ? (
        <MoveMergeModal
          mode={transferMode}
          table={transferTable}
          tables={tables}
          onClose={() => {
            setTransferMode(null);
            setTransferTable(null);
          }}
          onMove={moveTable}
          onMerge={mergeTables}
        />
      ) : null}
    </div>
  );
}