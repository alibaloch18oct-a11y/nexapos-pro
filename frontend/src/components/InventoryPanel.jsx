import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  CircleDollarSign,
  History,
  Minus,
  PackagePlus,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";
import { api } from "../lib/api";

function SimpleInput({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="nexa-field">
      <span className="nexa-label">{label}</span>
      <div className="nexa-input-wrap">
        <input
          type={type}
          className="nexa-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
        />
      </div>
    </label>
  );
}

const emptyForm = {
  id: "",
  name: "",
  sku: "",
  unit: "pcs",
  category: "General",
  currentStock: "",
  lowStockAlert: "10",
  costPrice: "",
  salePrice: "",
  trackStock: true,
  isActive: true
};

export default function InventoryPanel({ token, session, onBack }) {
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("stock");
  const [form, setForm] = useState(emptyForm);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    type: "IN",
    qty: "",
    reason: "MANUAL_ADJUSTMENT",
    note: ""
  });
  const [saving, setSaving] = useState(false);

  async function loadInventory() {
    try {
      const res = await api(token).get("/api/inventory");
      setInventory(res.data.inventory || []);
      setMovements(res.data.movements || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load inventory.");
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const lowStock = inventory.filter((item) => Number(item.currentStock || 0) <= Number(item.lowStockAlert || 0)).length;
    const stockValue = inventory.reduce((sum, item) => sum + Number(item.currentStock || 0) * Number(item.costPrice || 0), 0);
    const activeItems = inventory.filter((item) => item.isActive !== false).length;

    return { totalItems, lowStock, stockValue, activeItems };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (!search) return true;

      const query = search.toLowerCase();

      return (
        item.name.toLowerCase().includes(query) ||
        String(item.sku || "").toLowerCase().includes(query) ||
        String(item.category || "").toLowerCase().includes(query)
      );
    });
  }, [inventory, search]);

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function editItem(item) {
    setForm({
      id: item.id,
      name: item.name || "",
      sku: item.sku || "",
      unit: item.unit || "pcs",
      category: item.category || "General",
      currentStock: String(item.currentStock || 0),
      lowStockAlert: String(item.lowStockAlert || 10),
      costPrice: String(item.costPrice || 0),
      salePrice: String(item.salePrice || 0),
      trackStock: item.trackStock !== false,
      isActive: item.isActive !== false
    });
  }

  function resetForm() {
    setForm(emptyForm);
  }

  async function saveItem(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Item name is required.");
      return;
    }

    setSaving(true);

    try {
      if (form.id) {
        await api(token).put(`/api/inventory/${form.id}`, {
          name: form.name,
          sku: form.sku,
          unit: form.unit,
          category: form.category,
          lowStockAlert: Number(form.lowStockAlert || 0),
          costPrice: Number(form.costPrice || 0),
          salePrice: Number(form.salePrice || 0),
          trackStock: form.trackStock,
          isActive: form.isActive
        });
      } else {
        await api(token).post("/api/inventory", {
          name: form.name,
          sku: form.sku,
          unit: form.unit,
          category: form.category,
          currentStock: Number(form.currentStock || 0),
          lowStockAlert: Number(form.lowStockAlert || 0),
          costPrice: Number(form.costPrice || 0),
          salePrice: Number(form.salePrice || 0),
          trackStock: form.trackStock
        });
      }

      resetForm();
      await loadInventory();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save inventory item.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item) {
    if (!confirm(`Delete "${item.name}" from inventory?`)) return;

    try {
      await api(token).delete(`/api/inventory/${item.id}`);
      await loadInventory();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete inventory item.");
    }
  }

  function openAdjust(item, type) {
    setAdjustItem(item);
    setAdjustForm({
      type,
      qty: "",
      reason: type === "IN" ? "STOCK_PURCHASE" : "MANUAL_REDUCTION",
      note: ""
    });
  }

  async function submitAdjust(e) {
    e.preventDefault();

    if (!adjustItem) return;

    if (adjustForm.qty === "" || Number(adjustForm.qty) < 0) {
      alert("Enter valid quantity.");
      return;
    }

    try {
      await api(token).patch(`/api/inventory/${adjustItem.id}/adjust`, {
        type: adjustForm.type,
        qty: Number(adjustForm.qty || 0),
        reason: adjustForm.reason,
        note: adjustForm.note
      });

      setAdjustItem(null);
      await loadInventory();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to adjust stock.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 22 }}>
      <div className="nexa-row-between">
        <div>
          <button className="nexa-logout" onClick={onBack}>
            <ChevronLeft size={18} /> Back
          </button>
          <h1 className="nexa-section-title" style={{ marginTop: 18 }}>
            Inventory Control
          </h1>
          <p className="nexa-section-sub">
            Stock management for {session?.tenant?.restaurantName}. Orders automatically reduce linked stock.
          </p>
        </div>

        <button className="nexa-create-btn" onClick={loadInventory}>
          <RefreshCw size={18} /> Refresh Stock
        </button>
      </div>

      <div className="nexa-stats">
        {[
          ["Total Items", stats.totalItems, Boxes],
          ["Active Items", stats.activeItems, PackagePlus],
          ["Low Stock", stats.lowStock, AlertTriangle],
          ["Stock Value", `Rs ${stats.stockValue}`, CircleDollarSign]
        ].map(([label, value, Icon]) => (
          <div className="nexa-stat-card" key={label}>
            <Icon color="#d8b4fe" size={34} />
            <p className="nexa-stat-label">{label}</p>
            <p className="nexa-stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <button
          className="nexa-pill"
          onClick={() => setActiveTab("stock")}
          style={{ background: activeTab === "stock" ? "rgba(34,211,238,.20)" : "rgba(255,255,255,.08)" }}
        >
          <Boxes size={16} /> Stock Items
        </button>
        <button
          className="nexa-pill"
          onClick={() => setActiveTab("history")}
          style={{ background: activeTab === "history" ? "rgba(34,211,238,.20)" : "rgba(255,255,255,.08)" }}
        >
          <History size={16} /> Movements
        </button>
      </div>

      {activeTab === "stock" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 390px", gap: 18 }}>
          <main className="nexa-panel" style={{ padding: 18 }}>
            <div className="nexa-row-between">
              <div>
                <h2 style={{ margin: 0 }}>Stock Items</h2>
                <p className="nexa-section-sub">{filteredInventory.length} items showing</p>
              </div>

              <div className="nexa-input-wrap" style={{ minWidth: 320 }}>
                <Search size={18} color="#a5f3fc" />
                <input
                  className="nexa-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search stock..."
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {filteredInventory.map((item) => {
                const low = Number(item.currentStock || 0) <= Number(item.lowStockAlert || 0);
                const value = Number(item.currentStock || 0) * Number(item.costPrice || 0);

                return (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: 24,
                      border: low ? "1px solid rgba(239,68,68,.55)" : "1px solid rgba(255,255,255,.12)",
                      background: low ? "rgba(239,68,68,.12)" : "rgba(255,255,255,.06)",
                      padding: 16
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <h3 style={{ margin: 0 }}>{item.name}</h3>
                        <p className="nexa-small">{item.category}  -  {item.sku}</p>
                      </div>

                      {low ? (
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 16,
                            background: "rgba(239,68,68,.18)",
                            color: "#fecaca",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <AlertTriangle size={22} />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 16,
                            background: "rgba(34,211,238,.15)",
                            color: "#a5f3fc",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Boxes size={22} />
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div className="nexa-pill" style={{ justifyContent: "center" }}>
                        Stock: {item.currentStock} {item.unit}
                      </div>
                      <div className="nexa-pill" style={{ justifyContent: "center" }}>
                        Alert: {item.lowStockAlert}
                      </div>
                      <div className="nexa-pill" style={{ justifyContent: "center" }}>
                        Cost: Rs {item.costPrice}
                      </div>
                      <div className="nexa-pill" style={{ justifyContent: "center" }}>
                        Value: Rs {value}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                      <button className="nexa-pill" onClick={() => openAdjust(item, "IN")}>
                        <Plus size={14} />
                      </button>
                      <button className="nexa-pill" onClick={() => openAdjust(item, "OUT")}>
                        <Minus size={14} />
                      </button>
                      <button className="nexa-pill" onClick={() => editItem(item)}>
                        Edit
                      </button>
                      <button className="nexa-logout" onClick={() => deleteItem(item)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          <aside className="nexa-panel" style={{ padding: 18 }}>
            <div className="nexa-row-between">
              <div>
                <h2 style={{ margin: 0 }}>{form.id ? "Edit Stock" : "Add Stock Item"}</h2>
                <p className="nexa-section-sub">Manual stock item or non-menu stock.</p>
              </div>

              {form.id ? (
                <button className="nexa-logout" onClick={resetForm}>
                  <X size={16} />
                </button>
              ) : null}
            </div>

            <form onSubmit={saveItem}>
              <SimpleInput label="Item Name" value={form.name} onChange={(v) => setValue("name", v)} />
              <SimpleInput label="SKU" value={form.sku} onChange={(v) => setValue("sku", v)} />
              <SimpleInput label="Unit" value={form.unit} onChange={(v) => setValue("unit", v)} placeholder="pcs / kg / litre" />
              <SimpleInput label="Category" value={form.category} onChange={(v) => setValue("category", v)} />

              {!form.id ? (
                <SimpleInput label="Opening Stock" type="number" value={form.currentStock} onChange={(v) => setValue("currentStock", v)} />
              ) : null}

              <SimpleInput label="Low Stock Alert" type="number" value={form.lowStockAlert} onChange={(v) => setValue("lowStockAlert", v)} />
              <SimpleInput label="Cost Price" type="number" value={form.costPrice} onChange={(v) => setValue("costPrice", v)} />
              <SimpleInput label="Sale Price" type="number" value={form.salePrice} onChange={(v) => setValue("salePrice", v)} />

              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.06)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span>Track Stock</span>
                  <button type="button" className="nexa-pill" onClick={() => setValue("trackStock", !form.trackStock)}>
                    {form.trackStock ? "Tracking" : "Not Tracking"}
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Active</span>
                  <button type="button" className="nexa-pill" onClick={() => setValue("isActive", !form.isActive)}>
                    {form.isActive ? "Active" : "Disabled"}
                  </button>
                </div>
              </div>

              <button className="nexa-create-btn" disabled={saving} style={{ width: "100%", marginTop: 16, justifyContent: "center" }}>
                <Save size={18} /> {saving ? "Saving..." : form.id ? "Update Stock" : "Create Stock"}
              </button>
            </form>
          </aside>
        </div>
      ) : (
        <div className="nexa-panel" style={{ padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Stock Movement History</h2>

          <div style={{ display: "grid", gap: 10 }}>
            {movements.length === 0 ? (
              <p className="nexa-section-sub">No stock movements yet.</p>
            ) : (
              movements.map((movement) => (
                <div
                  key={movement.id}
                  style={{
                    borderRadius: 18,
                    padding: 14,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.06)",
                    display: "grid",
                    gridTemplateColumns: "120px 1fr 160px 160px",
                    gap: 12,
                    alignItems: "center"
                  }}
                >
                  <div
                    className="nexa-pill"
                    style={{
                      justifyContent: "center",
                      background:
                        movement.type === "IN"
                          ? "rgba(34,197,94,.18)"
                          : movement.type === "OUT"
                            ? "rgba(239,68,68,.18)"
                            : "rgba(34,211,238,.18)"
                    }}
                  >
                    {movement.type}
                  </div>

                  <div>
                    <strong>{movement.reason}</strong>
                    <p className="nexa-small">{movement.note || movement.orderNo || "Stock movement"}</p>
                  </div>

                  <div className="nexa-small">
                    {movement.previousStock} -> {movement.newStock}
                  </div>

                  <div className="nexa-small">
                    {new Date(movement.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {adjustItem ? (
        <div className="nexa-modal-backdrop">
          <form
            className="nexa-modal"
            style={{ maxWidth: 520 }}
            onSubmit={submitAdjust}
          >
            <div className="nexa-row-between">
              <div>
                <h2 style={{ margin: 0 }}>Adjust Stock</h2>
                <p className="nexa-section-sub">{adjustItem.name}</p>
              </div>

              <button type="button" className="nexa-logout" onClick={() => setAdjustItem(null)}>
                <X size={18} />
              </button>
            </div>

            <label className="nexa-field">
              <span className="nexa-label">Adjustment Type</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                >
                  <option value="IN">Add Stock</option>
                  <option value="OUT">Reduce Stock</option>
                  <option value="SET">Set Exact Stock</option>
                </select>
              </div>
            </label>

            <SimpleInput
              label="Quantity"
              type="number"
              value={adjustForm.qty}
              onChange={(v) => setAdjustForm({ ...adjustForm, qty: v })}
            />

            <SimpleInput
              label="Reason"
              value={adjustForm.reason}
              onChange={(v) => setAdjustForm({ ...adjustForm, reason: v })}
            />

            <SimpleInput
              label="Note"
              value={adjustForm.note}
              onChange={(v) => setAdjustForm({ ...adjustForm, note: v })}
            />

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.06)"
              }}
            >
              <p className="nexa-small">Current Stock</p>
              <h2 style={{ margin: 0 }}>{adjustItem.currentStock} {adjustItem.unit}</h2>
            </div>

            <button className="nexa-create-btn" style={{ width: "100%", marginTop: 16, justifyContent: "center" }}>
              Save Adjustment
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}





