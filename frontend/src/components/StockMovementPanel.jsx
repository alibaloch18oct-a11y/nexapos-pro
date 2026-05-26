import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  History,
  PackageCheck,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import { api } from "../lib/api";

function movementLabel(type) {
  const map = {
    sale_deduction: "Sale Deduction",
    missing_stock_mapping: "Missing Mapping",
    stock_in: "Stock In",
    stock_out: "Stock Out",
    waste: "Waste",
    correction: "Correction"
  };

  return map[type] || type || "Movement";
}

function movementColor(type) {
  if (type === "sale_deduction" || type === "stock_out" || type === "waste") return "#fca5a5";
  if (type === "stock_in" || type === "correction") return "#86efac";
  if (type === "missing_stock_mapping") return "#fde68a";
  return "#a5f3fc";
}

export default function StockMovementPanel({ token, session, onBack }) {
  const [movements, setMovements] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadData() {
    try {
      const [movementRes, lowStockRes] = await Promise.all([
        api(token).get("/api/inventory-movements"),
        api(token).get("/api/inventory-movements/low-stock")
      ]);

      setMovements(movementRes.data.movements || []);
      setLowStockItems(lowStockRes.data.lowStockItems || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load stock movements.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const query = search.toLowerCase();

      const bySearch =
        !search ||
        String(movement.itemName || "").toLowerCase().includes(query) ||
        String(movement.menuItemName || "").toLowerCase().includes(query) ||
        String(movement.orderNo || "").toLowerCase().includes(query) ||
        String(movement.note || "").toLowerCase().includes(query);

      const byFilter = filter === "all" || movement.type === filter;

      return bySearch && byFilter;
    });
  }, [movements, search, filter]);

  const saleDeductions = movements.filter((movement) => movement.type === "sale_deduction");
  const missingMappings = movements.filter((movement) => movement.type === "missing_stock_mapping");
  const totalDeducted = saleDeductions.reduce((sum, movement) => sum + Number(movement.qty || 0), 0);

  return (
    <div style={{ minHeight: "100vh", padding: 18 }}>
      <div className="nexa-row-between">
        <div>
          <button className="nexa-logout" onClick={onBack}>
            <ChevronLeft size={18} /> Back
          </button>
          <h1 className="nexa-section-title" style={{ marginTop: 16 }}>
            Stock Movement History
          </h1>
          <p className="nexa-section-sub">
            Inventory deductions, stock changes and low stock alerts for {session?.tenant?.restaurantName}.
          </p>
        </div>

        <button className="nexa-create-btn" onClick={loadData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="nexa-stats">
        {[
          ["Movements", movements.length, History],
          ["Sale Deductions", saleDeductions.length, TrendingDown],
          ["Qty Deducted", totalDeducted, Boxes],
          ["Low Stock", lowStockItems.length, AlertTriangle],
          ["Missing Mapping", missingMappings.length, PackageCheck]
        ].map(([label, value, Icon]) => (
          <div className="nexa-stat-card" key={label}>
            <Icon color="#d8b4fe" size={30} />
            <p className="nexa-stat-label">{label}</p>
            <p className="nexa-stat-value">{value}</p>
          </div>
        ))}
      </div>

      {lowStockItems.length > 0 ? (
        <section className="nexa-panel" style={{ marginBottom: 14 }}>
          <div className="nexa-row-between" style={{ marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0 }}>Low Stock Alerts</h2>
              <p className="nexa-section-sub">Items that reached or passed alert level.</p>
            </div>
            <AlertTriangle color="#fde68a" size={28} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                style={{
                  borderRadius: 18,
                  padding: 12,
                  border: "1px solid rgba(250,204,21,.25)",
                  background: "rgba(250,204,21,.10)"
                }}
              >
                <strong>{item.name || item.itemName}</strong>
                <p className="nexa-small">
                  Current: {item.currentStock ?? item.stock ?? item.quantity ?? 0} {item.unit || "pcs"}
                </p>
                <p className="nexa-small">
                  Alert Level: {item.lowStockAlert ?? item.lowStock ?? item.minimumStock ?? 0}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="nexa-panel">
        <div className="nexa-row-between">
          <div>
            <h2 style={{ margin: 0 }}>Movement Log</h2>
            <p className="nexa-section-sub">{filteredMovements.length} records showing</p>
          </div>

          <div className="nexa-input-wrap" style={{ minWidth: 300 }}>
            <Search size={16} color="#a5f3fc" />
            <input
              className="nexa-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item/order..."
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
          {["all", "sale_deduction", "missing_stock_mapping", "stock_in", "stock_out", "waste", "correction"].map((item) => (
            <button
              key={item}
              className="nexa-pill"
              onClick={() => setFilter(item)}
              style={{
                background: filter === item ? "rgba(34,211,238,.20)" : "rgba(255,255,255,.08)"
              }}
            >
              {item === "all" ? "All" : movementLabel(item)}
            </button>
          ))}
        </div>

        {filteredMovements.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>
            <Boxes size={56} />
            <h3>No stock movements yet</h3>
            <p>Complete paid orders to generate automatic deductions.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Order</th>
                  <th>Qty</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Note</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      <span style={{ color: movementColor(movement.type), fontWeight: 900 }}>
                        {movementLabel(movement.type)}
                      </span>
                    </td>
                    <td>
                      <strong>{movement.itemName || movement.menuItemName}</strong>
                      <p className="nexa-small">{movement.unit || "pcs"}</p>
                    </td>
                    <td>{movement.orderNo || "N/A"}</td>
                    <td>{movement.qty}</td>
                    <td>{movement.beforeStock}</td>
                    <td>{movement.afterStock}</td>
                    <td>{movement.note || ""}</td>
                    <td>{movement.createdAt ? new Date(movement.createdAt).toLocaleString() : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}




