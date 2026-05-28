import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AREAS = ["Main Hall", "VIP Room", "Family Zone", "Outdoor", "Rooftop"];
const SHAPES = ["round", "square", "rect", "booth"];
const STATUS = ["all", "available", "occupied", "reserved", "cleaning", "merged"];

function money(v) {
  return `Rs ${Math.round(Number(v || 0)).toLocaleString()}`;
}

function tone(status) {
  const map = {
    available: ["Available", "#86efac", "rgba(34,197,94,.16)"],
    occupied: ["Occupied", "#fca5a5", "rgba(239,68,68,.16)"],
    reserved: ["Reserved", "#fde68a", "rgba(250,204,21,.16)"],
    cleaning: ["Cleaning", "#93c5fd", "rgba(59,130,246,.16)"],
    merged: ["Merged", "#c4b5fd", "rgba(168,85,247,.16)"]
  };
  const t = map[status] || map.available;
  return { label: t[0], color: t[1], bg: t[2] };
}

function normalizeTable(t, i = 0) {
  const seats = Math.max(1, Math.min(24, Number(t.seats || t.chairs || t.capacity || 4)));
  const area = t.area || t.floor || t.section || "Main Hall";
  return {
    ...t,
    id: t.id || t.tableId || `table-${i + 1}`,
    name: t.name || t.tableNo || `T${i + 1}`,
    area,
    floor: area,
    seats,
    chairs: seats,
    status: t.status || "available",
    shape: SHAPES.includes(t.shape) ? t.shape : seats > 4 ? "rect" : "round",
    guests: Number(t.guests || 0),
    waiterName: t.waiterName || t.staff || "",
    staff: t.staff || t.waiterName || "",
    currentOrderNo: t.currentOrderNo || t.orderNo || "",
    orderNo: t.orderNo || t.currentOrderNo || "",
    currentOrderIds: Array.isArray(t.currentOrderIds) ? t.currentOrderIds : [],
    total: Number(t.total || 0),
    reservationName: t.reservationName || "",
    reservationPhone: t.reservationPhone || "",
    reservationTime: t.reservationTime || "",
    reservationNote: t.reservationNote || "",
    mergedWith: Array.isArray(t.mergedWith) ? t.mergedWith : [],
    mergedMasterId: t.mergedMasterId || ""
  };
}

function chairStyle(index, total, shape) {
  const count = Math.max(1, Number(total || 1));
  if (shape === "rect" || shape === "square" || shape === "booth") {
    const side = index % 4;
    const pos = Math.floor(index / 4) + 1;
    const max = Math.ceil(count / 4) + 1;
    const p = (pos / max) * 100;
    if (side === 0) return { left: `${p}%`, top: 6 };
    if (side === 1) return { right: 6, top: `${p}%` };
    if (side === 2) return { left: `${100 - p}%`, bottom: 6 };
    return { left: 6, top: `${100 - p}%` };
  }
  const angle = -90 + (360 / count) * index;
  const r = 44;
  return {
    left: `${50 + Math.cos((angle * Math.PI) / 180) * r}%`,
    top: `${50 + Math.sin((angle * Math.PI) / 180) * r}%`
  };
}

function ChairMap({ seats, shape, preview = false }) {
  const n = Math.max(1, Math.min(24, Number(seats || 1)));
  return (
    <div className={`chair-map ${preview ? "preview" : ""}`}>
      {Array.from({ length: n }).map((_, i) => <span key={i} className="chair" style={chairStyle(i, n, shape)} />)}
      <div className={`table-core ${shape}`}><b>{n}</b><small>chairs</small></div>
    </div>
  );
}

function TableEditor({ table, saving, onClose, onSave }) {
  const [form, setForm] = useState({
    name: table?.name || "",
    area: table?.area || "Main Hall",
    seats: Number(table?.seats || 4),
    shape: table?.shape || "round",
    status: table?.status || "available",
    guests: Number(table?.guests || 0),
    waiterName: table?.waiterName || table?.staff || "",
    reservationName: table?.reservationName || "",
    reservationPhone: table?.reservationPhone || "",
    reservationTime: table?.reservationTime || "",
    reservationNote: table?.reservationNote || ""
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const step = (d) => set("seats", Math.max(1, Math.min(24, Number(form.seats || 1) + d)));

  return (
    <div className="modal-bg"><div className="modal big">
      <div className="modal-head"><div><h2>{table ? `Edit ${table.name}` : "Add Table"}</h2><p>Control chair count, shape, status, waiter and reservation.</p></div><button onClick={onClose}>x</button></div>
      <div className="edit-grid">
        <section className="box">
          <h3>Table Details</h3>
          <div className="form-grid">
            <label><span>Table Name</span><input value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label><span>Area / Floor</span><input value={form.area} onChange={(e) => set("area", e.target.value)} /></label>
            <label><span>Status</span><select value={form.status} onChange={(e) => set("status", e.target.value)}>{STATUS.filter(s=>s!=="all").map(s=><option key={s}>{s}</option>)}</select></label>
            <label><span>Waiter</span><input value={form.waiterName} onChange={(e) => set("waiterName", e.target.value)} /></label>
          </div>
          <div className="seat-box"><div><span>Chairs / Seats</span><strong>{form.seats}</strong></div><div className="stepper"><button onClick={() => step(-1)}>-</button><input type="number" value={form.seats} onChange={(e)=>set("seats", Math.max(1, Math.min(24, Number(e.target.value || 1))))}/><button onClick={() => step(1)}>+</button></div></div>
          <div className="shape-grid">{SHAPES.map(s=><button key={s} className={form.shape===s?"active":""} onClick={()=>set("shape",s)}><i className={`shape ${s}`}/><b>{s}</b></button>)}</div>
        </section>
        <section className="box"><h3>Live Chair Preview</h3><ChairMap seats={form.seats} shape={form.shape} preview /><p className="muted">Chairs auto-arrange around the selected shape.</p></section>
        <section className="box full"><h3>Reservation</h3><div className="form-grid"><label><span>Name</span><input value={form.reservationName} onChange={(e)=>set("reservationName",e.target.value)}/></label><label><span>Phone</span><input value={form.reservationPhone} onChange={(e)=>set("reservationPhone",e.target.value)}/></label><label><span>Time</span><input value={form.reservationTime} onChange={(e)=>set("reservationTime",e.target.value)}/></label><label><span>Guests</span><input type="number" value={form.guests} onChange={(e)=>set("guests",Number(e.target.value||0))}/></label></div><label className="field"><span>Note</span><input value={form.reservationNote} onChange={(e)=>set("reservationNote",e.target.value)}/></label></section>
      </div>
      <div className="modal-actions"><button className="soft" onClick={onClose}>Cancel</button><button className="primary" disabled={saving} onClick={()=>onSave(table, form)}>{saving?"Saving...":"Save Table Layout"}</button></div>
    </div></div>
  );
}

function TableSystem({ table, tables, orders, loadingOrders, token, onClose, onRefresh, onOpenOrder }) {
  const [target, setTarget] = useState("");
  const [merge, setMerge] = useState("");
  const [method, setMethod] = useState("Cash");
  const total = orders.reduce((s,o)=>s+Number(o.total||0),0) || Number(table.total||0);
  const [paid, setPaid] = useState(total);
  const [split, setSplit] = useState(Math.max(1, Number(table.guests || 2)));
  const other = tables.filter(t=>t.id!==table.id && !t.mergedMasterId);

  async function run(fn) {
    try { await fn(); await onRefresh(); } catch (e) { alert(e.response?.data?.message || "Action failed."); }
  }
  const start = () => run(()=>api(token).patch(`/api/tables/${table.id}/start`, { guests: table.guests || 2, staff: table.waiterName || table.staff || "" }));
  const clear = () => window.confirm("Clear this table?") && run(()=>api(token).patch(`/api/tables/${table.id}/clear`)).then(onClose);
  const settle = () => window.confirm(`Settle ${table.name} for ${money(paid || total)}?`) && run(()=>api(token).patch(`/api/tables/${table.id}/settle`, { paidAmount: Number(paid || total), paymentMethod: method })).then(onClose);
  const move = () => target ? run(()=>api(token).post("/api/tables/move", { sourceTableId: table.id, targetTableId: target })).then(onClose) : alert("Select target table.");
  const mergeTable = () => merge ? run(()=>api(token).post("/api/tables/merge", { masterTableId: table.id, targetTableId: merge })) : alert("Select table to merge.");
  const unmerge = () => run(()=>api(token).post("/api/tables/unmerge", { tableId: table.id }));

  return <div className="modal-bg"><div className="modal big"><div className="modal-head"><div><h2>{table.name} Table System</h2><p>{table.area} - {table.seats} seats - {tone(table.status).label}</p></div><button onClick={onClose}>x</button></div>
    <div className="system-grid">
      <section className="box"><h3>Order System</h3><div className="summary"><div><span>Status</span><b>{tone(table.status).label}</b></div><div><span>Waiter</span><b>{table.waiterName || table.staff || "None"}</b></div><div><span>Order</span><b>{table.orderNo || table.currentOrderNo || "No order"}</b></div><div><span>Total</span><b>{money(total)}</b></div></div><button className="primary wide" onClick={()=>onOpenOrder(table)}>Open / Edit Table Order</button><button className="soft wide" onClick={start}>Start Seating</button><button className="soft wide" onClick={clear}>Clear Table</button></section>
      <section className="box"><h3>Billing</h3><div className="form-grid one"><label><span>Payment Method</span><select value={method} onChange={(e)=>setMethod(e.target.value)}>{["Cash","Card","Easypaisa","JazzCash","Bank Transfer"].map(x=><option key={x}>{x}</option>)}</select></label><label><span>Paid Amount</span><input type="number" value={paid} onChange={(e)=>setPaid(Number(e.target.value||0))}/></label></div><button className="primary wide" onClick={settle}>Settle Bill & Free Table</button></section>
      <section className="box"><h3>Split Bill</h3><div className="split"><span>Total Bill</span><strong>{money(total)}</strong><div className="stepper"><button onClick={()=>setSplit(Math.max(1,split-1))}>-</button><input type="number" value={split} onChange={(e)=>setSplit(Math.max(1,Number(e.target.value||1)))}/><button onClick={()=>setSplit(split+1)}>+</button></div><p>Each guest pays <b>{money(total / split)}</b></p></div></section>
      <section className="box"><h3>Move / Merge</h3><div className="form-grid one"><label><span>Move to table</span><select value={target} onChange={(e)=>setTarget(e.target.value)}><option value="">Select target</option>{other.map(t=><option key={t.id} value={t.id}>{t.name} - {tone(t.status).label}</option>)}</select></label><button className="soft wide" onClick={move}>Move Table</button><label><span>Merge into this table</span><select value={merge} onChange={(e)=>setMerge(e.target.value)}><option value="">Select table</option>{other.map(t=><option key={t.id} value={t.id}>{t.name} - {tone(t.status).label}</option>)}</select></label><button className="soft wide" onClick={mergeTable}>Merge Table</button><button className="soft wide" onClick={unmerge}>Unmerge</button></div></section>
      <section className="box full"><h3>Current Orders</h3>{loadingOrders?<p className="empty small">Loading orders...</p>:orders.length===0?<p className="empty small">No active orders linked.</p>:<div className="orders-list">{orders.map(o=><div className="order-row" key={o.id}><div><b>{o.orderNo || o.id}</b><span>{o.items?.length||0} items - {o.paymentStatus||"unpaid"} - {o.kitchenStatus||"new"}</span></div><div><b>{money(o.total)}</b><button onClick={()=>onOpenOrder(table)}>Edit</button></div></div>)}</div>}</section>
    </div></div></div>;
}

function TableCard({ table, tables, onCommand, onEdit, onStatus }) {
  const t = tone(table.status);
  const isChild = Boolean(table.mergedMasterId);
  const mergedNames = table.mergedWith.map(id => tables.find(x => x.id === id)?.name).filter(Boolean).join(", ");
  return <div className={`table-card ${isChild?"locked":""}`} style={{ boxShadow: `0 20px 55px ${t.bg}` }}>
    <span className="pill" style={{ color: t.color, background: t.bg }}>{isChild ? "Merged Child" : t.label}</span>
    <ChairMap seats={table.seats} shape={table.shape}/>
    <div className="card-info"><div><h3>{table.name}</h3><p>{table.area}</p></div><b>{table.seats} seats</b></div>
    {(table.orderNo || table.currentOrderNo || table.waiterName || table.staff || table.total > 0) && <div className="info blue"><b>Order: {table.orderNo || table.currentOrderNo || "Started"}</b><span>Waiter: {table.waiterName || table.staff || "None"}</span><span>Bill: {money(table.total)}</span></div>}
    {(table.reservationName || table.reservationPhone || table.reservationTime) && <div className="info yellow"><b>{table.reservationName || "Reserved Guest"}</b><span>{table.reservationPhone}</span><span>{table.reservationTime}</span></div>}
    {(table.mergedWith.length > 0 || table.mergedMasterId) && <div className="info purple"><b>{table.mergedMasterId ? "Merged into another table" : `Merged with ${mergedNames}`}</b></div>}
    <div className="quick"><button onClick={()=>onStatus(table,"available")}>Available</button><button onClick={()=>onStatus(table,"occupied")}>Occupied</button><button onClick={()=>onStatus(table,"cleaning")}>Cleaning</button></div>
    <div className="actions"><button className="primary" disabled={isChild} onClick={()=>onCommand(table)}>Table System</button><button className="soft" onClick={()=>onEdit(table)}>Edit Layout</button></div>
  </div>;
}

export default function DineInTableLayout({ token, session, onBack, onOpenOrder }) {
  const [tables, setTables] = useState([]);
  const [activeArea, setActiveArea] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [command, setCommand] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadTables() {
    setLoading(true);
    try {
      const res = await api(token).get("/api/tables/floor-plan");
      setTables((res.data.tables || []).map(normalizeTable));
    } catch {
      const res = await api(token).get("/api/tables");
      const list = Array.isArray(res.data) ? res.data : res.data.tables || [];
      setTables(list.map(normalizeTable));
    } finally { setLoading(false); }
  }

  async function loadOrders(table) {
    setLoadingOrders(true);
    try { const res = await api(token).get(`/api/tables/${table.id}/orders`); setOrders(res.data.orders || []); }
    catch { setOrders([]); }
    finally { setLoadingOrders(false); }
  }

  useEffect(() => { loadTables(); }, []);

  const areas = useMemo(() => ["All", ...new Set([...AREAS, ...tables.map(t => t.area)])], [tables]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tables.filter(t => (activeArea === "All" || t.area === activeArea) && (statusFilter === "all" || t.status === statusFilter) && (!q || [t.name,t.area,t.waiterName,t.staff,t.orderNo,t.currentOrderNo,t.reservationName,t.reservationPhone].some(v => String(v||"").toLowerCase().includes(q))));
  }, [tables, activeArea, statusFilter, search]);

  async function saveTable(table, form) {
    const seats = Math.max(1, Math.min(24, Number(form.seats || 4)));
    const payload = { ...form, area: form.area || "Main Hall", floor: form.area || "Main Hall", seats, chairs: seats, staff: form.waiterName || "", waiterName: form.waiterName || "" };
    setSaving(true);
    try {
      if (table?.id) await api(token).patch(`/api/tables/${table.id}`, payload);
      else await api(token).post("/api/tables", payload);
      setEditing(null); setAdding(false); await loadTables();
    } catch (e) { alert(e.response?.data?.message || "Failed to save table."); }
    finally { setSaving(false); }
  }

  async function updateStatus(table, status) {
    try { await api(token).patch(`/api/tables/${table.id}`, { status }); await loadTables(); }
    catch (e) { alert(e.response?.data?.message || "Failed to update table."); }
  }

  async function openCommand(table) { setCommand(table); await loadOrders(table); }
  function openOrder(table) { onOpenOrder?.({ ...table, floor: table.area, guests: table.guests || table.seats || 2, staff: table.waiterName || table.staff || "" }); }
  async function seedDemo() { try { await api(token).post("/api/demo-polish/seed"); await loadTables(); } catch(e){ alert(e.response?.data?.message || "Demo seed failed."); } }

  const stats = { available: tables.filter(t=>t.status==="available").length, occupied: tables.filter(t=>t.status==="occupied").length, reserved: tables.filter(t=>t.status==="reserved").length, cleaning: tables.filter(t=>t.status==="cleaning").length };

  return <div className="floor-page"><style>{CSS}</style>
    <div className="head"><div><button className="soft" onClick={onBack}>Back</button><h1>Dine-In Floor Plan</h1><p>Professional table layout, orders, split bill, move, merge and billing for {session?.tenant?.restaurantName || "restaurant"}.</p></div><div className="head-actions"><button className="soft" onClick={loadTables}>Refresh</button><button className="soft" onClick={seedDemo}>Seed Demo Data</button><button className="primary" onClick={()=>setAdding(true)}>+ Add Table</button></div></div>
    <div className="stats"><div><span>Available</span><b>{stats.available}</b></div><div><span>Occupied</span><b>{stats.occupied}</b></div><div><span>Reserved</span><b>{stats.reserved}</b></div><div><span>Cleaning</span><b>{stats.cleaning}</b></div></div>
    <div className="toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search table, waiter, order, reservation..."/><div className="filters">{areas.map(a=><button key={a} className={activeArea===a?"active":""} onClick={()=>setActiveArea(a)}>{a}</button>)}{STATUS.map(s=><button key={s} className={statusFilter===s?"active":""} onClick={()=>setStatusFilter(s)}>{s==="all"?"All Status":tone(s).label}</button>)}</div></div>
    {loading ? <div className="empty">Loading tables...</div> : filtered.length === 0 ? <div className="empty">No tables found.</div> : <div className="grid">{filtered.map(t=><TableCard key={t.id} table={t} tables={tables} onCommand={openCommand} onEdit={setEditing} onStatus={updateStatus}/>)}</div>}
    {editing && <TableEditor table={editing} saving={saving} onClose={()=>setEditing(null)} onSave={saveTable}/>} {adding && <TableEditor table={null} saving={saving} onClose={()=>setAdding(false)} onSave={saveTable}/>} {command && <TableSystem table={command} tables={tables} orders={orders} loadingOrders={loadingOrders} token={token} onClose={()=>setCommand(null)} onRefresh={async()=>{await loadTables(); await loadOrders(command);}} onOpenOrder={openOrder}/>} 
  </div>;
}

const CSS = `
.floor-page{min-height:100vh;padding:18px;color:white;background:radial-gradient(circle at 12% 16%,rgba(34,211,238,.13),transparent 28%),radial-gradient(circle at 84% 12%,rgba(168,85,247,.13),transparent 30%),linear-gradient(180deg,#020617,#071028)}
.head{display:flex;justify-content:space-between;gap:14px;align-items:start;margin-bottom:16px}.head h1{margin:12px 0 4px;font-size:36px;font-weight:1000;letter-spacing:-.045em}.head p,.muted{margin:0;color:#94a3b8}.head-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}
.primary,.soft,.modal-head button{border:0;color:white;font-weight:900;cursor:pointer;transition:.18s ease;min-height:44px;padding:0 15px;border-radius:15px}.primary{background:linear-gradient(135deg,#06b6d4,#2563eb)}.soft,.modal-head button{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10)}.wide{width:100%;margin-top:9px}.primary:disabled{opacity:.45;cursor:not-allowed}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}.stats div,.box,.table-card,.empty{background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.10);border-radius:22px}.stats div{padding:14px}.stats span{color:#94a3b8;font-size:12px;font-weight:800}.stats b{display:block;margin-top:6px;font-size:28px;font-weight:1000}
.toolbar{display:grid;grid-template-columns:1fr auto;gap:12px;padding:14px;border-radius:25px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.10);margin-bottom:14px}.toolbar input,input,select{height:45px;border-radius:15px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:white;padding:0 13px;outline:none;font-weight:800}option{color:#111827}.filters{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.filters button{height:38px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:white;padding:0 12px;font-weight:850;cursor:pointer}.filters button.active{background:rgba(34,211,238,.20);border-color:rgba(34,211,238,.35)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(335px,1fr));gap:16px}.table-card{position:relative;min-height:455px;padding:15px;overflow:hidden;transition:.22s ease}.table-card:hover{transform:translateY(-6px)}.table-card.locked{opacity:.68}.pill{position:absolute;top:14px;right:14px;z-index:4;padding:8px 10px;border-radius:999px;font-size:12px;font-weight:950}.chair-map{height:225px;position:relative;display:grid;place-items:center;margin-top:26px}.chair-map.preview{height:295px;margin:0;border-radius:26px;background:rgba(2,6,23,.32);border:1px solid rgba(255,255,255,.08)}.chair{position:absolute;width:34px;height:34px;border-radius:13px;background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(203,213,225,.82));box-shadow:0 9px 18px rgba(0,0,0,.26);z-index:2;transform:translate(-50%,-50%)}.table-core{position:relative;z-index:3;width:124px;height:124px;border-radius:50%;border:2px solid rgba(255,255,255,.18);display:grid;place-items:center;align-content:center;gap:5px;background:radial-gradient(circle at top left,rgba(34,211,238,.18),rgba(15,23,42,.96));box-shadow:0 22px 52px rgba(0,0,0,.34)}.table-core.rect{width:170px;height:112px;border-radius:30px}.table-core.square{width:132px;height:132px;border-radius:28px}.table-core.booth{width:178px;height:106px;border-radius:34px 34px 18px 18px}.table-core b{font-size:28px}.table-core small{color:#cbd5e1;font-size:12px;font-weight:850}
.card-info{display:flex;justify-content:space-between;gap:10px;align-items:center}.card-info h3{margin:0;font-size:23px}.card-info p{margin:4px 0 0;color:#94a3b8;font-size:13px}.card-info>b{padding:8px 10px;border-radius:999px;background:rgba(255,255,255,.08);font-size:12px}.info{margin-top:10px;padding:10px;border-radius:17px;display:grid;gap:4px;font-size:12px;font-weight:850}.info.blue{background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.18);color:#a5f3fc}.info.yellow{background:rgba(250,204,21,.08);border:1px solid rgba(250,204,21,.18);color:#fde68a}.info.purple{background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.18);color:#ddd6fe}.quick{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}.quick button{min-height:35px;border-radius:13px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:white;cursor:pointer;font-size:11px;font-weight:850}.actions{display:grid;grid-template-columns:1fr 125px;gap:9px;margin-top:10px}.empty{padding:28px;color:#94a3b8;text-align:center}.empty.small{padding:14px}
.modal-bg{position:fixed;inset:0;z-index:9999;background:rgba(2,6,23,.72);backdrop-filter:blur(10px);display:grid;place-items:center;padding:18px}.modal{width:min(1180px,calc(100vw - 36px));max-height:calc(100vh - 36px);overflow-y:auto;border-radius:28px;background:#0f172a;border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 90px rgba(0,0,0,.45);padding:18px}.modal-head{display:flex;justify-content:space-between;align-items:start;gap:12px;margin-bottom:14px}.modal-head h2{margin:0}.modal-head p{margin:6px 0 0;color:#94a3b8}.modal-head button{width:46px;height:46px;padding:0}.edit-grid,.system-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.box{padding:14px}.box.full{grid-column:1/-1}.box h3{margin:0 0 12px}.form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.form-grid.one{grid-template-columns:1fr}label,.field{display:grid;gap:8px;margin-bottom:12px}label span,.field span{color:#cbd5e1;font-size:12px;font-weight:850}.seat-box{margin-top:13px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;border-radius:20px;background:rgba(2,6,23,.25);border:1px solid rgba(255,255,255,.08);padding:13px}.seat-box strong{display:block;font-size:30px}.stepper{display:grid;grid-template-columns:45px 80px 45px;gap:7px;align-items:center}.stepper button{height:45px;border-radius:15px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.10);color:white;font-size:22px;font-weight:1000;cursor:pointer}.stepper input{text-align:center;padding:0}.shape-grid{margin-top:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.shape-grid button{min-height:88px;border-radius:18px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.06);color:white;display:grid;place-items:center;gap:7px;cursor:pointer;font-weight:900}.shape-grid button.active{background:rgba(34,211,238,.16);border-color:rgba(34,211,238,.35)}.shape{width:42px;height:42px;border:2px solid rgba(255,255,255,.6);background:rgba(34,211,238,.16)}.shape.round{border-radius:50%}.shape.square{border-radius:12px}.shape.rect{width:58px;border-radius:12px}.shape.booth{width:58px;height:36px;border-radius:18px 18px 8px 8px}.modal-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.summary{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.summary div,.split{border-radius:17px;background:rgba(2,6,23,.25);border:1px solid rgba(255,255,255,.08);padding:11px}.summary span,.split span{color:#94a3b8;font-size:12px;font-weight:850}.summary b,.split strong{display:block;margin-top:5px;font-size:16px}.orders-list{display:grid;gap:10px}.order-row{display:flex;justify-content:space-between;gap:12px;align-items:center;border-radius:17px;background:rgba(2,6,23,.25);border:1px solid rgba(255,255,255,.08);padding:11px}.order-row span{display:block;margin-top:4px;color:#94a3b8;font-size:12px}.order-row button{margin-top:7px;border:0;border-radius:12px;background:rgba(34,211,238,.18);color:#a5f3fc;font-weight:900;padding:7px 11px;cursor:pointer}
@media(max-width:980px){.stats,.toolbar,.form-grid,.modal-actions,.edit-grid,.system-grid{grid-template-columns:1fr}.filters{justify-content:flex-start}.head{display:grid}.head-actions{justify-content:flex-start}.shape-grid{grid-template-columns:repeat(2,1fr)}.box.full{grid-column:auto}}
`;

