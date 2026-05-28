import React, { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  ChevronLeft,
  Copy,
  Eye,
  EyeOff,
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

const emptyDiscount = {
  id: "",
  name: "",
  type: "order",
  paymentMethod: "all",
  valueType: "percent",
  value: "",
  code: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  itemId: "",
  isActive: true
};

function discountTypeLabel(type) {
  const map = {
    order: "Order Discount",
    payment: "Payment Discount",
    item: "Item Discount",
    coupon: "Coupon / Promo"
  };

  return map[type] || type;
}

export default function DiscountPanel({ token, session, onBack }) {
  const [discounts, setDiscounts] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState(emptyDiscount);
  const [saving, setSaving] = useState(false);

  async function loadDiscounts() {
    try {
      const [discountRes, menuRes] = await Promise.all([
        api(token).get("/api/discounts"),
        api(token).get("/api/menu")
      ]);

      setDiscounts(discountRes.data.discounts || []);
      setMenuItems(menuRes.data.items || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load discounts.");
    }
  }

  useEffect(() => {
    loadDiscounts();
  }, []);

  const filteredDiscounts = useMemo(() => {
    return discounts.filter((discount) => {
      const byType = typeFilter === "all" || discount.type === typeFilter;
      const query = search.toLowerCase();
      const bySearch =
        !search ||
        discount.name.toLowerCase().includes(query) ||
        String(discount.code || "").toLowerCase().includes(query) ||
        String(discount.paymentMethod || "").toLowerCase().includes(query);

      return byType && bySearch;
    });
  }, [discounts, search, typeFilter]);

  function setValue(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function editDiscount(discount) {
    setForm({
      id: discount.id,
      name: discount.name || "",
      type: discount.type || "order",
      paymentMethod: discount.paymentMethod || "all",
      valueType: discount.valueType || "percent",
      value: String(discount.value || ""),
      code: discount.code || "",
      minOrderAmount: String(discount.minOrderAmount || ""),
      maxDiscountAmount: String(discount.maxDiscountAmount || ""),
      itemId: discount.itemId || "",
      isActive: discount.isActive !== false
    });
  }

  function resetForm() {
    setForm(emptyDiscount);
  }

  async function saveDiscount(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Discount name is required.");
      return;
    }

    if (form.value === "") {
      alert("Discount value is required.");
      return;
    }

    if (form.type === "coupon" && !form.code.trim()) {
      alert("Coupon code is required.");
      return;
    }

    if (form.type === "item" && !form.itemId) {
      alert("Select menu item for item discount.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name,
      type: form.type,
      paymentMethod: form.paymentMethod,
      valueType: form.valueType,
      value: Number(form.value || 0),
      code: form.code,
      minOrderAmount: Number(form.minOrderAmount || 0),
      maxDiscountAmount: Number(form.maxDiscountAmount || 0),
      itemId: form.itemId,
      isActive: form.isActive
    };

    try {
      if (form.id) {
        await api(token).put(`/api/discounts/${form.id}`, payload);
      } else {
        await api(token).post("/api/discounts", payload);
      }

      resetForm();
      await loadDiscounts();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save discount.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDiscount(discount) {
    try {
      await api(token).patch(`/api/discounts/${discount.id}/toggle`);
      await loadDiscounts();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update discount.");
    }
  }

  async function deleteDiscount(discount) {
    if (!confirm(`Delete discount "${discount.name}"?`)) return;

    try {
      await api(token).delete(`/api/discounts/${discount.id}`);
      await loadDiscounts();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete discount.");
    }
  }

  function copyCoupon(code) {
    navigator.clipboard?.writeText(code);
    alert(`Copied coupon code: ${code}`);
  }

  return (
    <div style={{ minHeight: "100vh", padding: 22 }}>
      <div className="nexa-row-between">
        <div>
          <button className="nexa-logout" onClick={onBack}>
            <ChevronLeft size={18} /> Back
          </button>
          <h1 className="nexa-section-title" style={{ marginTop: 18 }}>
            Discount Control Center
          </h1>
          <p className="nexa-section-sub">
            Manage cash/card/order/item/coupon discounts for {session?.tenant?.restaurantName}.
          </p>
        </div>

        <button className="nexa-create-btn" onClick={loadDiscounts}>
          <RefreshCw size={18} /> Refresh Discounts
        </button>
      </div>

      <div className="nexa-stats">
        {[
          ["Total Discounts", discounts.length],
          ["Active Discounts", discounts.filter((d) => d.isActive !== false).length],
          ["Coupons", discounts.filter((d) => d.type === "coupon").length],
          ["Payment Rules", discounts.filter((d) => d.type === "payment").length]
        ].map(([label, value]) => (
          <div className="nexa-stat-card" key={label}>
            <BadgePercent color="#d8b4fe" size={34} />
            <p className="nexa-stat-label">{label}</p>
            <p className="nexa-stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 410px", gap: 18 }}>
        <main className="nexa-panel" style={{ padding: 18 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>Discount Rules</h2>
              <p className="nexa-section-sub">{filteredDiscounts.length} rules showing</p>
            </div>

            <div className="nexa-input-wrap" style={{ minWidth: 300 }}>
              <Search size={18} color="#a5f3fc" />
              <input
                className="nexa-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search discount..."
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            {["all", "order", "payment", "item", "coupon"].map((type) => (
              <button
                key={type}
                className="nexa-pill"
                onClick={() => setTypeFilter(type)}
                style={{
                  background: typeFilter === type ? "rgba(34,211,238,.20)" : "rgba(255,255,255,.08)"
                }}
              >
                {type === "all" ? "All" : discountTypeLabel(type)}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {filteredDiscounts.length === 0 ? (
              <div className="nexa-panel" style={{ textAlign: "center", color: "#94a3b8" }}>
                <BadgePercent size={56} />
                <h3>No discounts found</h3>
                <p>Create your first discount rule.</p>
              </div>
            ) : (
              filteredDiscounts.map((discount) => {
                const item = menuItems.find((menuItem) => menuItem.id === discount.itemId);

                return (
                  <div
                    key={discount.id}
                    style={{
                      borderRadius: 24,
                      border: discount.isActive ? "1px solid rgba(255,255,255,.12)" : "1px solid rgba(239,68,68,.45)",
                      background: discount.isActive ? "rgba(255,255,255,.06)" : "rgba(239,68,68,.10)",
                      padding: 16
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <h3 style={{ margin: 0 }}>{discount.name}</h3>
                        <p className="nexa-small">{discountTypeLabel(discount.type)}</p>
                      </div>

                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 18,
                          background: "rgba(34,211,238,.15)",
                          color: "#a5f3fc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <BadgePercent size={24} />
                      </div>
                    </div>

                    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div className="nexa-pill" style={{ justifyContent: "center" }}>
                        {discount.valueType === "percent" ? `${discount.value}%` : `Rs ${discount.value}`}
                      </div>
                      <div className="nexa-pill" style={{ justifyContent: "center" }}>
                        {discount.isActive ? "Active" : "Hidden"}
                      </div>
                      <div className="nexa-pill" style={{ justifyContent: "center" }}>
                        {discount.paymentMethod || "all"}
                      </div>
                      <div className="nexa-pill" style={{ justifyContent: "center" }}>
                        Min Rs {discount.minOrderAmount || 0}
                      </div>
                    </div>

                    {discount.type === "coupon" ? (
                      <button
                        className="nexa-create-btn"
                        style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
                        onClick={() => copyCoupon(discount.code)}
                      >
                        <Copy size={15} /> {discount.code}
                      </button>
                    ) : null}

                    {discount.type === "item" ? (
                      <p className="nexa-small" style={{ marginTop: 12 }}>
                        Item: {item?.name || "Unknown item"}
                      </p>
                    ) : null}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                      <button className="nexa-pill" onClick={() => editDiscount(discount)}>
                        Edit
                      </button>

                      <button className="nexa-pill" onClick={() => toggleDiscount(discount)}>
                        {discount.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>

                      <button className="nexa-logout" onClick={() => deleteDiscount(discount)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>

        <aside className="nexa-panel" style={{ padding: 18 }}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>{form.id ? "Edit Discount" : "Create Discount"}</h2>
              <p className="nexa-section-sub">Saved to backend discount database.</p>
            </div>

            {form.id ? (
              <button className="nexa-logout" onClick={resetForm}>
                <X size={16} />
              </button>
            ) : null}
          </div>

          <form onSubmit={saveDiscount}>
            <SimpleInput label="Discount Name" value={form.name} onChange={(v) => setValue("name", v)} />

            <label className="nexa-field">
              <span className="nexa-label">Discount Type</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={form.type}
                  onChange={(e) => setValue("type", e.target.value)}
                >
                  <option value="order">Order Discount</option>
                  <option value="payment">Payment Method Discount</option>
                  <option value="item">Item Discount</option>
                  <option value="coupon">Coupon / Promo Code</option>
                </select>
              </div>
            </label>

            {form.type === "payment" ? (
              <label className="nexa-field">
                <span className="nexa-label">Payment Method</span>
                <div className="nexa-input-wrap">
                  <select
                    className="nexa-input"
                    value={form.paymentMethod}
                    onChange={(e) => setValue("paymentMethod", e.target.value)}
                  >
                    <option value="all">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="easypaisa">Easypaisa</option>
                    <option value="bank transfer">Bank Transfer</option>
                    <option value="foodpanda">Foodpanda</option>
                  </select>
                </div>
              </label>
            ) : null}

            {form.type === "item" ? (
              <label className="nexa-field">
                <span className="nexa-label">Menu Item</span>
                <div className="nexa-input-wrap">
                  <select
                    className="nexa-input"
                    value={form.itemId}
                    onChange={(e) => setValue("itemId", e.target.value)}
                  >
                    <option value="">Select menu item</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - Rs {item.price}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            ) : null}

            {form.type === "coupon" ? (
              <SimpleInput label="Coupon Code" value={form.code} onChange={(v) => setValue("code", v.toUpperCase())} placeholder="SAVE10" />
            ) : null}

            <label className="nexa-field">
              <span className="nexa-label">Value Type</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={form.valueType}
                  onChange={(e) => setValue("valueType", e.target.value)}
                >
                  <option value="percent">Percentage %</option>
                  <option value="fixed">Fixed Rs</option>
                </select>
              </div>
            </label>

            <SimpleInput label="Discount Value" type="number" value={form.value} onChange={(v) => setValue("value", v)} />
            <SimpleInput label="Minimum Order Amount" type="number" value={form.minOrderAmount} onChange={(v) => setValue("minOrderAmount", v)} />
            <SimpleInput label="Maximum Discount Amount" type="number" value={form.maxDiscountAmount} onChange={(v) => setValue("maxDiscountAmount", v)} />

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.06)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Discount Status</span>
                <button type="button" className="nexa-pill" onClick={() => setValue("isActive", !form.isActive)}>
                  {form.isActive ? "Active" : "Hidden"}
                </button>
              </div>
            </div>

            <button className="nexa-create-btn" disabled={saving} style={{ width: "100%", marginTop: 16, justifyContent: "center" }}>
              <Save size={18} /> {saving ? "Saving..." : form.id ? "Update Discount" : "Create Discount"}
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
            <BadgePercent size={48} color="#a5f3fc" />
            <h3 style={{ margin: "8px 0" }}>{form.name || "Discount Preview"}</h3>
            <p className="nexa-small">{discountTypeLabel(form.type)}</p>
            <strong style={{ fontSize: 30 }}>
              {form.valueType === "percent" ? `${form.value || 0}%` : `Rs ${form.value || 0}`}
            </strong>
          </div>
        </aside>
      </div>
    </div>
  );
}





