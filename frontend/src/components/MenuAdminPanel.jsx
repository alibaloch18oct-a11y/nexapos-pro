import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  CircleDollarSign,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  Utensils,
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

const emptyItem = {
  id: "",
  categoryId: "",
  name: "",
  subtitle: "",
  price: "",
  discount: "",
  emoji: "ðŸ½ï¸",
  sku: "",
  imageUrl: "",
  isActive: true,
  isAvailable: true
};

export default function MenuAdminPanel({ token, session, onBack }) {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [itemForm, setItemForm] = useState(emptyItem);
  const [saving, setSaving] = useState(false);

  async function loadMenu() {
    try {
      const res = await api(token).get("/api/menu");
      setCategories(res.data.categories || []);
      setItems(res.data.items || []);

      if (!itemForm.categoryId && res.data.categories?.length) {
        setItemForm((prev) => ({ ...prev, categoryId: res.data.categories[0].id }));
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load menu.");
    }
  }

  useEffect(() => {
    loadMenu();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const byCategory = activeCategoryId === "all" || item.categoryId === activeCategoryId;
      const bySearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase()) ||
        String(item.sku || "").toLowerCase().includes(search.toLowerCase());

      return byCategory && bySearch;
    });
  }, [items, activeCategoryId, search]);

  function setItemValue(key, value) {
    setItemForm((prev) => ({ ...prev, [key]: value }));
  }

  function editItem(item) {
    setItemForm({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      subtitle: item.subtitle || "",
      price: String(item.price || ""),
      discount: item.discount || "",
      emoji: item.emoji || "ðŸ½ï¸",
      sku: item.sku || "",
      imageUrl: item.imageUrl || "",
      isActive: item.isActive !== false,
      isAvailable: item.isAvailable !== false
    });
  }

  function resetItemForm() {
    setItemForm({
      ...emptyItem,
      categoryId: categories[0]?.id || ""
    });
  }

  async function createCategory() {
    if (!categoryName.trim()) {
      alert("Enter category name.");
      return;
    }

    try {
      await api(token).post("/api/menu/categories", { name: categoryName.trim() });
      setCategoryName("");
      await loadMenu();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create category.");
    }
  }

  async function toggleCategory(category) {
    try {
      await api(token).put(`/api/menu/categories/${category.id}`, {
        name: category.name,
        isActive: !category.isActive
      });
      await loadMenu();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update category.");
    }
  }

  async function deleteCategory(category) {
    if (!confirm(`Delete category "${category.name}"?`)) return;

    try {
      await api(token).delete(`/api/menu/categories/${category.id}`);
      await loadMenu();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete category.");
    }
  }

  async function saveItem(e) {
    e.preventDefault();

    if (!itemForm.categoryId || !itemForm.name || itemForm.price === "") {
      alert("Category, item name and price are required.");
      return;
    }

    setSaving(true);

    const payload = {
      categoryId: itemForm.categoryId,
      name: itemForm.name,
      subtitle: itemForm.subtitle,
      price: Number(itemForm.price || 0),
      discount: itemForm.discount,
      emoji: itemForm.emoji || "ðŸ½ï¸",
      sku: itemForm.sku,
      imageUrl: itemForm.imageUrl,
      isActive: itemForm.isActive,
      isAvailable: itemForm.isAvailable
    };

    try {
      if (itemForm.id) {
        await api(token).put(`/api/menu/items/${itemForm.id}`, payload);
      } else {
        await api(token).post("/api/menu/items", payload);
      }

      resetItemForm();
      await loadMenu();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save menu item.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(item) {
    try {
      await api(token).patch(`/api/menu/items/${item.id}/toggle`);
      await loadMenu();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update item.");
    }
  }

  async function deleteItem(item) {
    if (!confirm(`Delete "${item.name}"?`)) return;

    try {
      await api(token).delete(`/api/menu/items/${item.id}`);
      await loadMenu();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete item.");
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
            Menu Admin Panel
          </h1>
          <p className="nexa-section-sub">
            Manage real categories and menu items for {session?.tenant?.restaurantName}.
          </p>
        </div>

        <button className="nexa-create-btn" onClick={loadMenu}>
          <RefreshCw size={18} /> Refresh Menu
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "330px 1fr 390px", gap: 18 }}>
        <aside className="nexa-panel" style={{ padding: 18 }}>
          <h2 style={{ marginTop: 0 }}>Categories</h2>

          <div className="nexa-input-wrap" style={{ marginBottom: 12 }}>
            <input
              className="nexa-input"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="New category name"
            />
          </div>

          <button className="nexa-create-btn" style={{ width: "100%", justifyContent: "center" }} onClick={createCategory}>
            <Plus size={18} /> Add Category
          </button>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <button
              className={`nexa-select-card ${activeCategoryId === "all" ? "active" : ""}`}
              style={{ minHeight: 70 }}
              onClick={() => setActiveCategoryId("all")}
            >
              <Utensils color="#a5f3fc" />
              <strong>All Items</strong>
              <span className="nexa-small">{items.length} items</span>
            </button>

            {categories.map((category) => {
              const count = items.filter((item) => item.categoryId === category.id).length;

              return (
                <div
                  key={category.id}
                  style={{
                    borderRadius: 20,
                    border: activeCategoryId === category.id ? "1px solid rgba(34,211,238,.55)" : "1px solid rgba(255,255,255,.12)",
                    background: activeCategoryId === category.id ? "rgba(34,211,238,.14)" : "rgba(255,255,255,.06)",
                    padding: 12
                  }}
                >
                  <button
                    onClick={() => setActiveCategoryId(category.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: 0,
                      color: "white",
                      background: "transparent",
                      padding: 0
                    }}
                  >
                    <strong>{category.name}</strong>
                    <p className="nexa-small">{count} items Â· {category.isActive ? "Active" : "Hidden"}</p>
                  </button>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    <button className="nexa-pill" onClick={() => toggleCategory(category)}>
                      {category.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                      {category.isActive ? "Hide" : "Show"}
                    </button>
                    <button className="nexa-logout" onClick={() => deleteCategory(category)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="nexa-panel" style={{ padding: 18 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>Menu Items</h2>
              <p className="nexa-section-sub">{filteredItems.length} items showing</p>
            </div>

            <div className="nexa-input-wrap" style={{ minWidth: 280 }}>
              <Search size={18} color="#a5f3fc" />
              <input
                className="nexa-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item..."
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {filteredItems.map((item) => (
              <div
                key={item.id}
                style={{
                  borderRadius: 24,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: item.isActive ? "rgba(255,255,255,.06)" : "rgba(239,68,68,.10)",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    height: 120,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "radial-gradient(circle, rgba(168,85,247,.25), rgba(6,182,212,.12), rgba(15,23,42,.2))",
                    fontSize: 58
                  }}
                >
                  {item.emoji || "ðŸ½ï¸"}
                </div>

                <div style={{ padding: 14 }}>
                  <h3 style={{ margin: 0 }}>{item.name}</h3>
                  <p className="nexa-small">{item.category}</p>
                  <p style={{ color: "#94a3b8", minHeight: 34 }}>{item.subtitle || "No description"}</p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 22 }}>Rs {item.price}</strong>
                    <span className="nexa-pill">{item.isActive ? "Active" : "Hidden"}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                    <button className="nexa-pill" onClick={() => editItem(item)}>
                      <Settings size={14} /> Edit
                    </button>
                    <button className="nexa-pill" onClick={() => toggleItem(item)}>
                      {item.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button className="nexa-logout" onClick={() => deleteItem(item)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <aside className="nexa-panel" style={{ padding: 18 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>{itemForm.id ? "Edit Item" : "Add Item"}</h2>
              <p className="nexa-section-sub">Saved directly to backend.</p>
            </div>

            {itemForm.id ? (
              <button className="nexa-logout" onClick={resetItemForm}>
                <X size={16} />
              </button>
            ) : null}
          </div>

          <form onSubmit={saveItem}>
            <label className="nexa-field">
              <span className="nexa-label">Category</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={itemForm.categoryId}
                  onChange={(e) => setItemValue("categoryId", e.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <SimpleInput label="Item Name" value={itemForm.name} onChange={(v) => setItemValue("name", v)} />
            <SimpleInput label="Description" value={itemForm.subtitle} onChange={(v) => setItemValue("subtitle", v)} />
            <SimpleInput label="Price" type="number" value={itemForm.price} onChange={(v) => setItemValue("price", v)} />
            <SimpleInput label="Discount Text" value={itemForm.discount} onChange={(v) => setItemValue("discount", v)} placeholder="10% off" />
            <SimpleInput label="Emoji/Icon" value={itemForm.emoji} onChange={(v) => setItemValue("emoji", v)} />
            <SimpleInput label="SKU" value={itemForm.sku} onChange={(v) => setItemValue("sku", v)} />
            <SimpleInput label="Image URL" value={itemForm.imageUrl} onChange={(v) => setItemValue("imageUrl", v)} />

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
                <span>Active Item</span>
                <button
                  type="button"
                  className="nexa-pill"
                  onClick={() => setItemValue("isActive", !itemForm.isActive)}
                >
                  {itemForm.isActive ? "Active" : "Hidden"}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Available Today</span>
                <button
                  type="button"
                  className="nexa-pill"
                  onClick={() => setItemValue("isAvailable", !itemForm.isAvailable)}
                >
                  {itemForm.isAvailable ? "Available" : "Unavailable"}
                </button>
              </div>
            </div>

            <button className="nexa-create-btn" disabled={saving} style={{ width: "100%", marginTop: 16, justifyContent: "center" }}>
              <Save size={18} /> {saving ? "Saving..." : itemForm.id ? "Update Item" : "Create Item"}
            </button>
          </form>

          <div
            style={{
              marginTop: 16,
              borderRadius: 24,
              padding: 16,
              background: "rgba(34,211,238,.10)",
              border: "1px solid rgba(34,211,238,.22)",
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: 46 }}>{itemForm.emoji || "ðŸ½ï¸"}</div>
            <h3 style={{ margin: "6px 0" }}>{itemForm.name || "Preview Item"}</h3>
            <p className="nexa-small">{itemForm.subtitle || "Description preview"}</p>
            <strong style={{ fontSize: 28 }}>
              <CircleDollarSign size={22} style={{ display: "inline" }} /> Rs {itemForm.price || 0}
            </strong>
          </div>
        </aside>
      </div>
    </div>
  );
}



