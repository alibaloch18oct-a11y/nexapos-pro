import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

function money(value) {
  return `Rs ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
}

function normalizeMode(mode) {
  const map = {
    dine_in: "Dine In",
    take_away: "Take Away",
    delivery: "Delivery",
    drive_thru: "Drive Thru",
    walk_in: "Walk In",
    kiosk: "Kiosk"
  };

  return map[mode] || mode || "POS";
}

function paymentStatus(order) {
  const status = String(order.paymentStatus || "").toLowerCase();
  const method = String(order.paymentMethod || "").toLowerCase();

  if (status === "paid") return "paid";
  if (status === "complimentary") return "complimentary";
  if (status === "cancelled") return "cancelled";
  if (status === "unpaid" || method.includes("cash on delivery") || method.includes("pay later")) return "unpaid";

  return status || "unknown";
}

function getBranchName(order, branches) {
  if (order.branchName) return order.branchName;
  if (order.branch?.name) return order.branch.name;

  const found = branches.find((branch) => branch.id === order.branchId);
  return found?.name || order.branchId || "Main Branch";
}

export default function BranchReportsPanel({ token, session, roleContext, activeBranchId, activeBranchName, branchMode, onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState(activeBranchId || (branchMode === "all" ? "all" : ""));
  const [range, setRange] = useState("today");

  const context = roleContext || session?.roleContext || {};
  const permissions = context?.permissions || {};
  const canViewAllBranches = permissions.canViewAllBranches === true;
  const branches = context?.branches || [];
  const lockedBranch = context?.activeBranch || null;

  const finalBranchId = canViewAllBranches
    ? selectedBranchId
    : lockedBranch?.id || activeBranchId || "";

  const branchOptions = canViewAllBranches
    ? [{ id: "all", name: "All Branches" }, ...branches]
    : [{ id: lockedBranch?.id || activeBranchId || "assigned", name: lockedBranch?.name || activeBranchName || "Assigned Branch" }];

  function inRange(order) {
    if (range === "all") return true;

    const date = new Date(order.createdAt || order.date || Date.now());
    const now = new Date();

    if (range === "today") {
      return date.toDateString() === now.toDateString();
    }

    if (range === "7days") {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      return date >= start;
    }

    if (range === "30days") {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      return date >= start;
    }

    return true;
  }

  async function loadOrders() {
    setLoading(true);

    try {
      const query =
        finalBranchId && finalBranchId !== "all"
          ? `?branchId=${encodeURIComponent(finalBranchId)}&limit=500`
          : "?limit=500";

      const res = await api(token).get(`/api/orders${query}`);
      const list = Array.isArray(res.data) ? res.data : res.data.orders || [];

      const filtered =
        finalBranchId && finalBranchId !== "all"
          ? list.filter((order) => !order.branchId || order.branchId === finalBranchId)
          : list;

      setOrders(filtered);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load branch reports.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [finalBranchId]);

  const visibleOrders = useMemo(() => orders.filter(inRange), [orders, range]);

  const branchRows = useMemo(() => {
    const map = new Map();

    visibleOrders.forEach((order) => {
      const branchId = order.branchId || "main";
      const branchName = getBranchName(order, branches);
      const status = paymentStatus(order);
      const total = Number(order.total || 0);

      if (!map.has(branchId)) {
        map.set(branchId, {
          branchId,
          branchName,
          orders: 0,
          paidOrders: 0,
          unpaidOrders: 0,
          cancelledOrders: 0,
          sales: 0,
          unpaidAmount: 0,
          modes: {}
        });
      }

      const row = map.get(branchId);
      row.orders += 1;
      row.modes[order.mode || "pos"] = (row.modes[order.mode || "pos"] || 0) + 1;

      if (status === "paid" || status === "complimentary") {
        row.paidOrders += 1;
        row.sales += total;
      } else if (status === "unpaid") {
        row.unpaidOrders += 1;
        row.unpaidAmount += total;
      } else if (status === "cancelled") {
        row.cancelledOrders += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.sales - a.sales);
  }, [visibleOrders, branches]);

  const totals = useMemo(() => {
    return branchRows.reduce(
      (acc, row) => ({
        sales: acc.sales + row.sales,
        orders: acc.orders + row.orders,
        paidOrders: acc.paidOrders + row.paidOrders,
        unpaidOrders: acc.unpaidOrders + row.unpaidOrders,
        unpaidAmount: acc.unpaidAmount + row.unpaidAmount,
        cancelledOrders: acc.cancelledOrders + row.cancelledOrders
      }),
      { sales: 0, orders: 0, paidOrders: 0, unpaidOrders: 0, unpaidAmount: 0, cancelledOrders: 0 }
    );
  }, [branchRows]);

  const topBranch = branchRows[0];

  return (
    <div className="branch-report-page">
      <style>
        {`
          .branch-report-page {
            min-height: 100vh;
            padding: 18px;
            color: white;
            background:
              radial-gradient(circle at 12% 18%, rgba(34,211,238,.14), transparent 28%),
              radial-gradient(circle at 86% 12%, rgba(168,85,247,.16), transparent 28%),
              linear-gradient(135deg,#020617,#0f172a);
          }

          .br-head,
          .br-toolbar,
          .br-card,
          .br-table-wrap {
            border-radius: 28px;
            background: rgba(15,23,42,.76);
            border: 1px solid rgba(255,255,255,.12);
            box-shadow: 0 22px 60px rgba(0,0,0,.24);
            backdrop-filter: blur(18px);
          }

          .br-head {
            padding: 18px;
            display: flex;
            justify-content: space-between;
            gap: 14px;
            align-items: start;
            margin-bottom: 14px;
          }

          .br-back,
          .br-primary,
          .br-soft {
            border: 0;
            border-radius: 16px;
            height: 44px;
            padding: 0 14px;
            color: white;
            font-weight: 950;
            cursor: pointer;
          }

          .br-back,
          .br-soft {
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.10);
          }

          .br-primary {
            background: linear-gradient(135deg,#06b6d4,#2563eb);
          }

          .br-kicker {
            display: inline-flex;
            padding: 7px 12px;
            border-radius: 999px;
            background: rgba(34,211,238,.13);
            color: #a5f3fc;
            border: 1px solid rgba(34,211,238,.24);
            font-size: 12px;
            font-weight: 1000;
            margin-bottom: 10px;
          }

          .br-title {
            margin: 0;
            font-size: 34px;
            font-weight: 1000;
            letter-spacing: -.04em;
          }

          .br-sub {
            margin: 8px 0 0;
            color: #94a3b8;
            font-weight: 750;
          }

          .br-toolbar {
            padding: 14px;
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 10px;
            margin-bottom: 14px;
          }

          .br-select {
            height: 44px;
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,.12);
            background: rgba(255,255,255,.08);
            color: white;
            padding: 0 12px;
            outline: none;
            font-weight: 900;
          }

          .br-select option {
            color: #111827;
          }

          .br-stats {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin-bottom: 14px;
          }

          .br-card {
            padding: 16px;
          }

          .br-card span {
            display: block;
            color: #94a3b8;
            font-size: 12px;
            font-weight: 850;
          }

          .br-card strong {
            display: block;
            margin-top: 7px;
            font-size: 23px;
            font-weight: 1000;
          }

          .br-card.good strong { color: #86efac; }
          .br-card.warn strong { color: #fde68a; }
          .br-card.info strong { color: #a5f3fc; }

          .br-table-wrap {
            padding: 14px;
            overflow-x: auto;
          }

          .br-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 10px;
          }

          .br-table th {
            text-align: left;
            color: #94a3b8;
            font-size: 12px;
            padding: 0 12px 6px;
          }

          .br-table td {
            padding: 14px 12px;
            background: rgba(255,255,255,.06);
            border-top: 1px solid rgba(255,255,255,.08);
            border-bottom: 1px solid rgba(255,255,255,.08);
            font-weight: 850;
          }

          .br-table td:first-child {
            border-radius: 18px 0 0 18px;
            border-left: 1px solid rgba(255,255,255,.08);
          }

          .br-table td:last-child {
            border-radius: 0 18px 18px 0;
            border-right: 1px solid rgba(255,255,255,.08);
          }

          .br-branch-name {
            display: grid;
            gap: 4px;
          }

          .br-branch-name strong {
            font-size: 15px;
          }

          .br-branch-name span {
            color: #94a3b8;
            font-size: 12px;
          }

          .br-orders-list {
            margin-top: 14px;
            display: grid;
            gap: 10px;
          }

          .br-order-row {
            display: grid;
            grid-template-columns: 130px 1fr 150px 130px 160px;
            gap: 10px;
            align-items: center;
            padding: 13px;
            border-radius: 20px;
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.09);
          }

          .br-badge {
            display: inline-flex;
            width: fit-content;
            padding: 6px 9px;
            border-radius: 999px;
            background: rgba(34,211,238,.13);
            border: 1px solid rgba(34,211,238,.24);
            color: #a5f3fc;
            font-size: 11px;
            font-weight: 1000;
          }

          @media (max-width: 1100px) {
            .br-toolbar,
            .br-stats,
            .br-order-row {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <header className="br-head">
        <div>
          <button className="br-back" onClick={onBack}>← Back</button>
          <div style={{ height: 12 }} />
          <div className="br-kicker">
            {canViewAllBranches ? "Owner All-Branch Reports" : "Branch Reports"}
          </div>
          <h1 className="br-title">Branch Performance Reports</h1>
          <p className="br-sub">
            View sales, unpaid bills, orders and branch comparison from one owner platform.
          </p>
        </div>

        <button className="br-primary" onClick={loadOrders}>
          Refresh Reports
        </button>
      </header>

      <section className="br-toolbar">
        <select
          className="br-select"
          value={finalBranchId || "all"}
          disabled={!canViewAllBranches}
          onChange={(e) => setSelectedBranchId(e.target.value)}
        >
          {branchOptions.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        <select className="br-select" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>

        <button className="br-soft" onClick={() => setSelectedBranchId("all")} disabled={!canViewAllBranches}>
          All Branches
        </button>
      </section>

      <section className="br-stats">
        <div className="br-card good">
          <span>Total Paid Sales</span>
          <strong>{money(totals.sales)}</strong>
        </div>
        <div className="br-card info">
          <span>Total Orders</span>
          <strong>{totals.orders}</strong>
        </div>
        <div className="br-card good">
          <span>Paid Orders</span>
          <strong>{totals.paidOrders}</strong>
        </div>
        <div className="br-card warn">
          <span>Unpaid Bills</span>
          <strong>{totals.unpaidOrders}</strong>
        </div>
        <div className="br-card">
          <span>Top Branch</span>
          <strong>{topBranch?.branchName || "N/A"}</strong>
        </div>
      </section>

      <section className="br-table-wrap">
        <h2 style={{ marginTop: 0 }}>Branch Wise Summary</h2>

        {loading ? (
          <div className="br-card">Loading reports...</div>
        ) : branchRows.length === 0 ? (
          <div className="br-card">No orders found for selected branch/range.</div>
        ) : (
          <table className="br-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Sales</th>
                <th>Orders</th>
                <th>Paid</th>
                <th>Unpaid</th>
                <th>Unpaid Amount</th>
                <th>Average Order</th>
              </tr>
            </thead>
            <tbody>
              {branchRows.map((row) => (
                <tr key={row.branchId}>
                  <td>
                    <div className="br-branch-name">
                      <strong>{row.branchName}</strong>
                      <span>{Object.entries(row.modes).map(([mode, count]) => `${normalizeMode(mode)} ${count}`).join(" • ")}</span>
                    </div>
                  </td>
                  <td>{money(row.sales)}</td>
                  <td>{row.orders}</td>
                  <td>{row.paidOrders}</td>
                  <td>{row.unpaidOrders}</td>
                  <td>{money(row.unpaidAmount)}</td>
                  <td>{money(row.orders ? row.sales / row.orders : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="br-orders-list">
          <h2>Recent Orders With Branch Names</h2>

          {visibleOrders.slice(0, 25).map((order) => (
            <div className="br-order-row" key={order.id || order.orderNo}>
              <strong>{order.orderNo || "Order"}</strong>
              <div>
                <span className="br-badge">{getBranchName(order, branches)}</span>
              </div>
              <div>{normalizeMode(order.mode)}</div>
              <div>{paymentStatus(order)}</div>
              <div>{money(order.total)}</div>
              <small style={{ color: "#94a3b8" }}>{formatDate(order.createdAt || order.date)}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

