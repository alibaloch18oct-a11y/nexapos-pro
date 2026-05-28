import React, { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronLeft,
  Eye,
  EyeOff,
  Link2,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Wand2,
  X
} from "lucide-react";
import { api } from "../lib/api";

const emptyForm = {
  id: "",
  menuItemId: "",
  inventoryItemId: "",
  deductQty: "1",
  unit: "pcs",
  note: "",
  isActive: true
};

function getInventoryName(item) {
  return item.name || item.itemName || item.productName || "Inventory Item";
}

function getStockValue(item) {
  return item.currentStock ?? item.stock ?? item.quantity ?? item.qty ?? 0;
}

function MappingCard({ mapping, onEdit, onToggle, onDelete }) {
  return (
    <div
      style={{
        borderRadius: 22,
        border: mapping.isActive === false ? "1px solid rgba(239,68,68,.30)" : "1px solid rgba(255,255,255,.11)",
        background: mapping.isActive === false ? "rgba(239,68,68,.09)" : "rgba(255,255,255,.055)",
        padding: 14
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{mapping.menuItemName}</h3>
          <p className="nexa-small">Menu Item</p>
        </div>

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 16,
            background: "rgba(34,211,238,.14)",
            color: "#a5f3fc",
            display: "grid",
            placeItems: "center"
          }}
        >
          <Link2 size={22} />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 18,
          background: "rgba(2,6,23,.42)",
          border: "1px solid rgba(255,255,255,.08)"
        }}
      >
        <strong>{mapping.inventoryItemName}</strong>
        <p className="nexa-small">
          Deduct {mapping.deductQty} {mapping.unit || "pcs"} per 1 sale
        </p>
        {mapping.note ? <p className="nexa-small">{mapping.note}</p> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
        <button className="nexa-pill" onClick={() => onEdit(mapping)}>
          Edit
        </button>

        <button className="nexa-pill" onClick={() => onToggle(mapping)}>
          {mapping.isActive === false ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        <button className="nexa-logout" onClick={() => onDelete(mapping)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function MenuInventoryMappingPanel({ token, session, onBack }) {
  const [mappings, setMappings] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      const res = await api(token).get("/api/menu-inventory-mappings");
      setMappings(res.data.mappings || []);
      setMenuItems(res.data.menuItems || []);
      setInventory(res.data.inventory || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load menu inventory mappings.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredMappings = useMemo(() => {
    return mappings.filter((mapping) => {
      const query = search.toLowerCase();

      return (
        !search ||
        String(mapping.menuItemName || "").toLowerCase().includes(query) ||
        String(mapping.inventoryItemName || "").toLowerCase().includes(query) ||
        String(mapping.note || "").toLowerCase().includes(query)
      );
    });
  }, [mappings, search]);

  const mappedMenuCount = new Set(mappings.filter((m) => m.isActive !== false).map((m) => m.menuItemId)).size;
  const activeMappings = mappings.filter((m) => m.isActive !== false);
  const inactiveMappings = mappings.filter((m) => m.isActive === false);

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
  }

  function editMapping(mapping) {
    setForm({
      id: mapping.id,
      menuItemId: mapping.menuItemId || "",
      inventoryItemId: mapping.inventoryItemId || "",
      deductQty: String(mapping.deductQty || 1),
      unit: mapping.unit || "pcs",
      note: mapping.note || "",
      isActive: mapping.isActive !== false
    });
  }

  function applySuggestion(suggestion) {
    setForm({
      id: "",
      menuItemId: suggestion.menuItemId,
      inventoryItemId: suggestion.inventoryItemId,
      deductQty: String(suggestion.deductQty || 1),
      unit: "pcs",
      note: `Auto suggestion confidence: ${suggestion.confidence}`,
      isActive: true
    });
  }

  async function loadSuggestions() {
    try {
      const res = await api(token).post("/api/menu-inventory-mappings/auto-suggest");
      setSuggestions(res.data.suggestions || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to generate suggestions.");
    }
  }

  async function saveMapping(e) {
    e.preventDefault();

    if (!form.menuItemId || !form.inventoryItemId) {
      alert("Select menu item and inventory item.");
      return;
    }

    setSaving(true);

    const payload = {
      menuItemId: form.menuItemId,
      inventoryItemId: form.inventoryItemId,
      deductQty: Number(form.deductQty || 1),
      unit: form.unit || "pcs",
      note: form.note,
      isActive: form.isActive
    };

    try {
      if (form.id) {
        await api(token).put(`/api/menu-inventory-mappings/${form.id}`, payload);
      } else {
        await api(token).post("/api/menu-inventory-mappings", payload);
      }

      resetForm();
      setSuggestions([]);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save mapping.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleMapping(mapping) {
    try {
      await api(token).patch(`/api/menu-inventory-mappings/${mapping.id}/toggle`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update mapping.");
    }
  }

  async function deleteMapping(mapping) {
    if (!confirm(`Delete mapping "${mapping.menuItemName} -> ${mapping.inventoryItemName}"?`)) return;

    try {
      await api(token).delete(`/api/menu-inventory-mappings/${mapping.id}`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete mapping.");
    }
  }

  const selectedInventory = inventory.find((item) => item.id === form.inventoryItemId);

  return (
    <div style={{ minHeight: "100vh", padding: 18 }}>
      <div className="nexa-row-between">
        <div>
          <button className="nexa-logout" onClick={onBack}>
            <ChevronLeft size={18} /> Back
          </button>
          <h1 className="nexa-section-title" style={{ marginTop: 16 }}>
            Menu-to-Inventory Mapping
          </h1>
          <p className="nexa-section-sub">
            Create recipe-style deductions for {session?.tenant?.restaurantName}. One menu item can deduct multiple stock items.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="nexa-logout" onClick={loadSuggestions}>
            <Wand2 size={16} /> Auto Suggest
          </button>
          <button className="nexa-create-btn" onClick={loadData}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="nexa-stats">
        {[
          ["Menu Items", menuItems.length, PackageCheck],
          ["Inventory Items", inventory.length, Boxes],
          ["Active Mappings", activeMappings.length, Link2],
          ["Mapped Menus", mappedMenuCount, Save],
          ["Inactive", inactiveMappings.length, EyeOff]
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
          {suggestions.length > 0 ? (
            <section className="nexa-panel">
              <div className="nexa-row-between" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Auto Suggestions</h2>
                  <p className="nexa-section-sub">Click a suggestion to load it into the form.</p>
                </div>
                <Wand2 color="#a5f3fc" size={28} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.menuItemId}-${suggestion.inventoryItemId}`}
                    className="nexa-select-card"
                    onClick={() => applySuggestion(suggestion)}
                    style={{ minHeight: 110 }}
                  >
                    <strong>{suggestion.menuItemName}</strong>
                    <p className="nexa-small">-> {suggestion.inventoryItemName}</p>
                    <div className="nexa-pill">Confidence: {suggestion.confidence}</div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="nexa-panel">
            <div className="nexa-row-between">
              <div>
                <h2 style={{ margin: 0 }}>Mappings</h2>
                <p className="nexa-section-sub">{filteredMappings.length} mappings showing</p>
              </div>

              <div className="nexa-input-wrap" style={{ minWidth: 300 }}>
                <Search size={16} color="#a5f3fc" />
                <input
                  className="nexa-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search mappings..."
                />
              </div>
            </div>

            {filteredMappings.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>
                <Link2 size={56} />
                <h3>No mappings yet</h3>
                <p>Create mapping so paid orders deduct exact ingredients.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 14 }}>
                {filteredMappings.map((mapping) => (
                  <MappingCard
                    key={mapping.id}
                    mapping={mapping}
                    onEdit={editMapping}
                    onToggle={toggleMapping}
                    onDelete={deleteMapping}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="nexa-panel" style={{ alignSelf: "start", position: "sticky", top: 14 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>{form.id ? "Edit Mapping" : "Create Mapping"}</h2>
              <p className="nexa-section-sub">Recipe deduction rule</p>
            </div>

            {form.id ? (
              <button className="nexa-logout" onClick={resetForm}>
                <X size={16} />
              </button>
            ) : null}
          </div>

          <form onSubmit={saveMapping}>
            <label className="nexa-field">
              <span className="nexa-label">Menu Item</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={form.menuItemId}
                  onChange={(e) => setValue("menuItemId", e.target.value)}
                >
                  <option value="">Select menu item</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}  -  {item.category || "Menu"}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="nexa-field">
              <span className="nexa-label">Inventory Item</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={form.inventoryItemId}
                  onChange={(e) => {
                    const inventoryItem = inventory.find((item) => item.id === e.target.value);

                    setForm((prev) => ({
                      ...prev,
                      inventoryItemId: e.target.value,
                      unit: inventoryItem?.unit || inventoryItem?.stockUnit || prev.unit || "pcs"
                    }));
                  }}
                >
                  <option value="">Select inventory item</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getInventoryName(item)}  -  Stock {getStockValue(item)}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div className="nexa-form-grid">
              <label className="nexa-field">
                <span className="nexa-label">Deduct Qty Per Sale</span>
                <div className="nexa-input-wrap">
                  <input
                    type="number"
                    step="0.01"
                    className="nexa-input"
                    value={form.deductQty}
                    onChange={(e) => setValue("deductQty", e.target.value)}
                  />
                </div>
              </label>

              <label className="nexa-field">
                <span className="nexa-label">Unit</span>
                <div className="nexa-input-wrap">
                  <input
                    className="nexa-input"
                    value={form.unit}
                    onChange={(e) => setValue("unit", e.target.value)}
                    placeholder="pcs / kg / litre"
                  />
                </div>
              </label>
            </div>

            <label className="nexa-field">
              <span className="nexa-label">Note</span>
              <div className="nexa-input-wrap">
                <input
                  className="nexa-input"
                  value={form.note}
                  onChange={(e) => setValue("note", e.target.value)}
                  placeholder="Example: 1 bun per burger"
                />
              </div>
            </label>

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

            {selectedInventory ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 18,
                  border: "1px solid rgba(34,211,238,.22)",
                  background: "rgba(34,211,238,.08)"
                }}
              >
                <strong>{getInventoryName(selectedInventory)}</strong>
                <p className="nexa-small">
                  Current Stock: {getStockValue(selectedInventory)} {selectedInventory.unit || selectedInventory.stockUnit || "pcs"}
                </p>
                <p className="nexa-small">
                  Deduction Preview: selling 1 menu item deducts {form.deductQty || 1} {form.unit || "pcs"}.
                </p>
              </div>
            ) : null}

            <button className="nexa-create-btn" disabled={saving} style={{ width: "100%", marginTop: 14 }}>
              <Plus size={16} />
              {saving ? "Saving..." : form.id ? "Update Mapping" : "Create Mapping"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}





