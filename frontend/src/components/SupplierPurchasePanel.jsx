import React, { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Building2,
  ChevronLeft,
  CreditCard,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Truck,
  UserPlus
} from "lucide-react";
import { api } from "../lib/api";

const emptySupplier = {
  id: "",
  name: "",
  companyName: "",
  phone: "",
  email: "",
  address: "",
  openingBalance: "",
  isActive: true
};

const emptyPurchase = {
  supplierId: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  paymentStatus: "paid",
  paymentMethod: "Cash",
  paidAmount: "",
  notes: "",
  items: []
};

function money(value) {
  return `Rs ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function getInventoryName(item) {
  return item.name || item.itemName || item.productName || "Inventory Item";
}

function getStockValue(item) {
  return item.currentStock ?? item.stock ?? item.quantity ?? item.qty ?? 0;
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="nexa-field">
      <span className="nexa-label">{label}</span>
      <div className="nexa-input-wrap">
        <input
          className="nexa-input"
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
        />
      </div>
    </label>
  );
}

function SupplierCard({ supplier, active, onEdit, onToggle, onDelete }) {
  return (
    <div
      style={{
        borderRadius: 22,
        border: active ? "1px solid rgba(34,211,238,.55)" : "1px solid rgba(255,255,255,.11)",
        background: active ? "rgba(34,211,238,.12)" : "rgba(255,255,255,.055)",
        padding: 14
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{supplier.name}</h3>
          <p className="nexa-small">{supplier.companyName || "No company name"}</p>
          <p className="nexa-small">{supplier.phone || "No phone"}</p>
        </div>

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 16,
            background: "rgba(34,211,238,.14)",
            display: "grid",
            placeItems: "center",
            color: "#a5f3fc"
          }}
        >
          <Truck size={22} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <div className="nexa-pill">Balance {money(supplier.balance)}</div>
        <div className="nexa-pill" style={{ color: supplier.isActive === false ? "#fca5a5" : "#86efac" }}>
          {supplier.isActive === false ? "Inactive" : "Active"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
        <button className="nexa-pill" onClick={() => onEdit(supplier)}>Edit</button>
        <button className="nexa-pill" onClick={() => onToggle(supplier)}>Toggle</button>
        <button className="nexa-logout" onClick={() => onDelete(supplier)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function PurchaseCard({ invoice, onPayment }) {
  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,.11)",
        background: "rgba(255,255,255,.055)",
        padding: 14
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{invoice.invoiceNo}</h3>
          <p className="nexa-small">{invoice.supplierName}</p>
          <p className="nexa-small">{invoice.invoiceDate}</p>
        </div>

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 16,
            background: "rgba(168,85,247,.15)",
            display: "grid",
            placeItems: "center",
            color: "#d8b4fe"
          }}
        >
          <FileText size={22} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <div className="nexa-pill">Total {money(invoice.subtotal)}</div>
        <div className="nexa-pill">Paid {money(invoice.paidAmount)}</div>
        <div className="nexa-pill" style={{ color: invoice.balance > 0 ? "#fca5a5" : "#86efac" }}>
          Balance {money(invoice.balance)}
        </div>
        <div className="nexa-pill">{invoice.paymentStatus}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <p className="nexa-small">Items: {invoice.items?.length || 0}</p>
        <div style={{ display: "grid", gap: 6 }}>
          {(invoice.items || []).slice(0, 4).map((item) => (
            <div key={item.id} className="nexa-pill" style={{ justifyContent: "space-between" }}>
              <span>{item.inventoryItemName}</span>
              <span>{item.qty} x {money(item.unitCost)}</span>
            </div>
          ))}
        </div>
      </div>

      {invoice.balance > 0 ? (
        <button
          className="nexa-create-btn"
          style={{ width: "100%", marginTop: 12 }}
          onClick={() => onPayment(invoice)}
        >
          <CreditCard size={15} /> Add Payment
        </button>
      ) : null}
    </div>
  );
}

export default function SupplierPurchasePanel({ token, session, onBack }) {
  const [suppliers, setSuppliers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase);
  const [searchSupplier, setSearchSupplier] = useState("");
  const [searchPurchase, setSearchPurchase] = useState("");
  const [activeTab, setActiveTab] = useState("purchase");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);

  async function loadData() {
    try {
      const [supplierRes, setupRes, purchaseRes] = await Promise.all([
        api(token).get("/api/supplier-purchases/suppliers"),
        api(token).get("/api/supplier-purchases/setup"),
        api(token).get("/api/supplier-purchases/purchases")
      ]);

      setSuppliers(supplierRes.data.suppliers || []);
      setInventory(setupRes.data.inventory || []);
      setPurchases(purchaseRes.data.purchases || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load supplier purchase data.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const query = searchSupplier.toLowerCase();

      return (
        !searchSupplier ||
        String(supplier.name || "").toLowerCase().includes(query) ||
        String(supplier.companyName || "").toLowerCase().includes(query) ||
        String(supplier.phone || "").toLowerCase().includes(query)
      );
    });
  }, [suppliers, searchSupplier]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((invoice) => {
      const query = searchPurchase.toLowerCase();

      return (
        !searchPurchase ||
        String(invoice.invoiceNo || "").toLowerCase().includes(query) ||
        String(invoice.supplierName || "").toLowerCase().includes(query) ||
        String(invoice.paymentStatus || "").toLowerCase().includes(query)
      );
    });
  }, [purchases, searchPurchase]);

  const totalPurchase = purchases.reduce((sum, invoice) => sum + Number(invoice.subtotal || 0), 0);
  const totalBalance = purchases.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);
  const totalPaid = purchases.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);

  function setSupplierValue(key, value) {
    setSupplierForm((prev) => ({ ...prev, [key]: value }));
  }

  function setPurchaseValue(key, value) {
    setPurchaseForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetSupplier() {
    setSupplierForm(emptySupplier);
  }

  function editSupplier(supplier) {
    setSupplierForm({
      id: supplier.id,
      name: supplier.name || "",
      companyName: supplier.companyName || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      openingBalance: String(supplier.openingBalance || ""),
      isActive: supplier.isActive !== false
    });
    setActiveTab("supplier");
  }

  async function saveSupplier(e) {
    e.preventDefault();

    if (!supplierForm.name.trim()) {
      alert("Supplier name is required.");
      return;
    }

    setSavingSupplier(true);

    const payload = {
      name: supplierForm.name,
      companyName: supplierForm.companyName,
      phone: supplierForm.phone,
      email: supplierForm.email,
      address: supplierForm.address,
      openingBalance: Number(supplierForm.openingBalance || 0),
      isActive: supplierForm.isActive
    };

    try {
      if (supplierForm.id) {
        await api(token).put(`/api/supplier-purchases/suppliers/${supplierForm.id}`, payload);
      } else {
        await api(token).post("/api/supplier-purchases/suppliers", payload);
      }

      resetSupplier();
      await loadData();
      alert("Supplier saved successfully.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save supplier.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function toggleSupplier(supplier) {
    try {
      await api(token).patch(`/api/supplier-purchases/suppliers/${supplier.id}/toggle`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update supplier.");
    }
  }

  async function deleteSupplier(supplier) {
    if (!confirm(`Delete supplier "${supplier.name}"?`)) return;

    try {
      await api(token).delete(`/api/supplier-purchases/suppliers/${supplier.id}`);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete supplier.");
    }
  }

  function addPurchaseLine() {
    setPurchaseForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `line-${Date.now()}`,
          inventoryItemId: "",
          qty: "1",
          unit: "pcs",
          unitCost: ""
        }
      ]
    }));
  }

  function removePurchaseLine(lineId) {
    setPurchaseForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== lineId)
    }));
  }

  function updatePurchaseLine(lineId, key, value) {
    setPurchaseForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== lineId) return item;

        if (key === "inventoryItemId") {
          const inv = inventory.find((stock) => stock.id === value);

          return {
            ...item,
            inventoryItemId: value,
            unit: inv?.unit || inv?.stockUnit || item.unit || "pcs",
            unitCost: String(inv?.lastPurchasePrice || inv?.costPrice || inv?.unitCost || item.unitCost || "")
          };
        }

        return {
          ...item,
          [key]: value
        };
      })
    }));
  }

  const purchaseSubtotal = purchaseForm.items.reduce(
    (sum, item) => sum + Number(item.qty || 0) * Number(item.unitCost || 0),
    0
  );

  async function savePurchase(e) {
    e.preventDefault();

    if (!purchaseForm.supplierId) {
      alert("Select supplier first.");
      return;
    }

    if (!purchaseForm.items.length) {
      alert("Add at least one purchase item.");
      return;
    }

    const invalidLine = purchaseForm.items.find((item) => !item.inventoryItemId || Number(item.qty || 0) <= 0);

    if (invalidLine) {
      alert("Every purchase line must have inventory item and quantity.");
      return;
    }

    setSavingPurchase(true);

    const payload = {
      ...purchaseForm,
      paidAmount: Number(purchaseForm.paidAmount || 0),
      items: purchaseForm.items.map((item) => {
        const inv = inventory.find((stock) => stock.id === item.inventoryItemId);

        return {
          inventoryItemId: item.inventoryItemId,
          inventoryItemName: inv ? getInventoryName(inv) : "",
          qty: Number(item.qty || 0),
          unit: item.unit || "pcs",
          unitCost: Number(item.unitCost || 0)
        };
      })
    };

    try {
      const res = await api(token).post("/api/supplier-purchases/purchases", payload);

      alert(res.data.message || "Purchase saved and stock updated.");

      setPurchaseForm(emptyPurchase);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save purchase.");
    } finally {
      setSavingPurchase(false);
    }
  }

  async function addPayment(invoice) {
    const amount = prompt(`Enter payment amount for ${invoice.invoiceNo}. Balance: ${money(invoice.balance)}`);

    if (!amount) return;

    try {
      await api(token).patch(`/api/supplier-purchases/purchases/${invoice.id}/payment`, {
        paidAmount: Number(amount || 0),
        paymentMethod: "Cash"
      });

      await loadData();
      alert("Payment updated.");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add payment.");
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
            Supplier & Purchase Stock
          </h1>
          <p className="nexa-section-sub">
            Manage suppliers, create purchase invoices and automatically add stock for {session?.tenant?.restaurantName}.
          </p>
        </div>

        <button className="nexa-create-btn" onClick={loadData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="nexa-stats">
        {[
          ["Suppliers", suppliers.length, Truck],
          ["Purchase Invoices", purchases.length, FileText],
          ["Total Purchase", money(totalPurchase), Boxes],
          ["Paid", money(totalPaid), CreditCard],
          ["Supplier Balance", money(totalBalance), Building2]
        ].map(([label, value, Icon]) => (
          <div className="nexa-stat-card" key={label}>
            <Icon color="#d8b4fe" size={30} />
            <p className="nexa-stat-label">{label}</p>
            <p className="nexa-stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          ["purchase", "New Purchase"],
          ["suppliers", "Suppliers"],
          ["history", "Purchase History"]
        ].map(([key, label]) => (
          <button
            key={key}
            className="nexa-pill"
            onClick={() => setActiveTab(key)}
            style={{
              background: activeTab === key ? "rgba(34,211,238,.20)" : "rgba(255,255,255,.08)"
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "purchase" ? (
        <form className="nexa-panel" onSubmit={savePurchase}>
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>Create Purchase Invoice</h2>
              <p className="nexa-section-sub">Stock will increase immediately after saving purchase.</p>
            </div>
            <button type="button" className="nexa-create-btn" onClick={addPurchaseLine}>
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div className="nexa-form-grid">
            <label className="nexa-field">
              <span className="nexa-label">Supplier</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={purchaseForm.supplierId}
                  onChange={(e) => setPurchaseValue("supplierId", e.target.value)}
                >
                  <option value="">Select supplier</option>
                  {suppliers.filter((supplier) => supplier.isActive !== false).map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}  -  Balance {money(supplier.balance)}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <Field label="Invoice Date" type="date" value={purchaseForm.invoiceDate} onChange={(v) => setPurchaseValue("invoiceDate", v)} />
          </div>

          <div className="nexa-form-grid">
            <Field label="Due Date" type="date" value={purchaseForm.dueDate} onChange={(v) => setPurchaseValue("dueDate", v)} />

            <label className="nexa-field">
              <span className="nexa-label">Payment Status</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={purchaseForm.paymentStatus}
                  onChange={(e) => setPurchaseValue("paymentStatus", e.target.value)}
                >
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
            </label>
          </div>

          <div className="nexa-form-grid">
            <label className="nexa-field">
              <span className="nexa-label">Payment Method</span>
              <div className="nexa-input-wrap">
                <select
                  className="nexa-input"
                  value={purchaseForm.paymentMethod}
                  onChange={(e) => setPurchaseValue("paymentMethod", e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="Card">Card</option>
                </select>
              </div>
            </label>

            <Field label="Paid Amount" type="number" value={purchaseForm.paidAmount} onChange={(v) => setPurchaseValue("paidAmount", v)} />
          </div>

          <Field label="Notes" value={purchaseForm.notes} onChange={(v) => setPurchaseValue("notes", v)} />

          <div style={{ marginTop: 14 }}>
            <div className="nexa-row-between">
              <h3 style={{ margin: 0 }}>Purchase Items</h3>
              <div className="nexa-pill">Subtotal {money(purchaseSubtotal)}</div>
            </div>

            {purchaseForm.items.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>
                <Boxes size={52} />
                <h3>No items added</h3>
                <p>Click Add Item to start purchase invoice.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {purchaseForm.items.map((line, index) => {
                  const inv = inventory.find((item) => item.id === line.inventoryItemId);
                  const lineTotal = Number(line.qty || 0) * Number(line.unitCost || 0);

                  return (
                    <div
                      key={line.id}
                      style={{
                        borderRadius: 20,
                        border: "1px solid rgba(255,255,255,.11)",
                        background: "rgba(255,255,255,.055)",
                        padding: 12,
                        display: "grid",
                        gridTemplateColumns: "2fr .8fr .8fr .8fr auto",
                        gap: 10,
                        alignItems: "end"
                      }}
                    >
                      <label className="nexa-field" style={{ margin: 0 }}>
                        <span className="nexa-label">Inventory Item #{index + 1}</span>
                        <div className="nexa-input-wrap">
                          <select
                            className="nexa-input"
                            value={line.inventoryItemId}
                            onChange={(e) => updatePurchaseLine(line.id, "inventoryItemId", e.target.value)}
                          >
                            <option value="">Select inventory</option>
                            {inventory.map((item) => (
                              <option key={item.id} value={item.id}>
                                {getInventoryName(item)}  -  Stock {getStockValue(item)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>

                      <label className="nexa-field" style={{ margin: 0 }}>
                        <span className="nexa-label">Qty</span>
                        <div className="nexa-input-wrap">
                          <input
                            type="number"
                            step="0.01"
                            className="nexa-input"
                            value={line.qty}
                            onChange={(e) => updatePurchaseLine(line.id, "qty", e.target.value)}
                          />
                        </div>
                      </label>

                      <label className="nexa-field" style={{ margin: 0 }}>
                        <span className="nexa-label">Unit</span>
                        <div className="nexa-input-wrap">
                          <input
                            className="nexa-input"
                            value={line.unit}
                            onChange={(e) => updatePurchaseLine(line.id, "unit", e.target.value)}
                          />
                        </div>
                      </label>

                      <label className="nexa-field" style={{ margin: 0 }}>
                        <span className="nexa-label">Unit Cost</span>
                        <div className="nexa-input-wrap">
                          <input
                            type="number"
                            step="0.01"
                            className="nexa-input"
                            value={line.unitCost}
                            onChange={(e) => updatePurchaseLine(line.id, "unitCost", e.target.value)}
                          />
                        </div>
                      </label>

                      <div style={{ display: "grid", gap: 6 }}>
                        <strong>{money(lineTotal)}</strong>
                        <button type="button" className="nexa-logout" onClick={() => removePurchaseLine(line.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {inv ? (
                        <div style={{ gridColumn: "1 / -1", color: "#94a3b8", fontSize: 12 }}>
                          Current stock: {getStockValue(inv)} {inv.unit || inv.stockUnit || "pcs"} -> After purchase:{" "}
                          {Number(getStockValue(inv)) + Number(line.qty || 0)} {line.unit || inv.unit || inv.stockUnit || "pcs"}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 20,
              border: "1px solid rgba(34,211,238,.22)",
              background: "rgba(34,211,238,.08)",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              alignItems: "center"
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Invoice Total: {money(purchaseSubtotal)}</h3>
              <p className="nexa-small">
                Balance after payment: {money(Math.max(0, purchaseSubtotal - Number(purchaseForm.paidAmount || 0)))}
              </p>
            </div>

            <button className="nexa-create-btn" disabled={savingPurchase}>
              <Save size={16} /> {savingPurchase ? "Saving..." : "Save Purchase & Add Stock"}
            </button>
          </div>
        </form>
      ) : null}

      {activeTab === "suppliers" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 390px", gap: 14 }}>
          <main className="nexa-panel">
            <div className="nexa-row-between">
              <div>
                <h2 style={{ margin: 0 }}>Suppliers</h2>
                <p className="nexa-section-sub">{filteredSuppliers.length} suppliers showing</p>
              </div>

              <div className="nexa-input-wrap" style={{ minWidth: 280 }}>
                <Search size={16} color="#a5f3fc" />
                <input
                  className="nexa-input"
                  value={searchSupplier}
                  onChange={(e) => setSearchSupplier(e.target.value)}
                  placeholder="Search suppliers..."
                />
              </div>
            </div>

            {filteredSuppliers.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                <Truck size={54} />
                <h3>No suppliers found</h3>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginTop: 14 }}>
                {filteredSuppliers.map((supplier) => (
                  <SupplierCard
                    key={supplier.id}
                    supplier={supplier}
                    active={supplierForm.id === supplier.id}
                    onEdit={editSupplier}
                    onToggle={toggleSupplier}
                    onDelete={deleteSupplier}
                  />
                ))}
              </div>
            )}
          </main>

          <aside className="nexa-panel" style={{ alignSelf: "start", position: "sticky", top: 14 }}>
            <div className="nexa-row-between">
              <div>
                <h2 style={{ margin: 0 }}>{supplierForm.id ? "Edit Supplier" : "Create Supplier"}</h2>
                <p className="nexa-section-sub">Supplier profile and balance.</p>
              </div>
              <UserPlus color="#a5f3fc" size={28} />
            </div>

            <form onSubmit={saveSupplier}>
              <Field label="Supplier Name" value={supplierForm.name} onChange={(v) => setSupplierValue("name", v)} />
              <Field label="Company Name" value={supplierForm.companyName} onChange={(v) => setSupplierValue("companyName", v)} />
              <Field label="Phone" value={supplierForm.phone} onChange={(v) => setSupplierValue("phone", v)} />
              <Field label="Email" value={supplierForm.email} onChange={(v) => setSupplierValue("email", v)} />
              <Field label="Address" value={supplierForm.address} onChange={(v) => setSupplierValue("address", v)} />
              <Field label="Opening Balance" type="number" value={supplierForm.openingBalance} onChange={(v) => setSupplierValue("openingBalance", v)} />

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
                <button type="button" className="nexa-pill" onClick={() => setSupplierValue("isActive", !supplierForm.isActive)}>
                  {supplierForm.isActive ? "Active" : "Inactive"}
                </button>
              </div>

              <button className="nexa-create-btn" disabled={savingSupplier} style={{ width: "100%", marginTop: 14 }}>
                <Save size={16} /> {savingSupplier ? "Saving..." : supplierForm.id ? "Update Supplier" : "Create Supplier"}
              </button>
            </form>
          </aside>
        </div>
      ) : null}

      {activeTab === "history" ? (
        <section className="nexa-panel">
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>Purchase History</h2>
              <p className="nexa-section-sub">{filteredPurchases.length} invoices showing</p>
            </div>

            <div className="nexa-input-wrap" style={{ minWidth: 280 }}>
              <Search size={16} color="#a5f3fc" />
              <input
                className="nexa-input"
                value={searchPurchase}
                onChange={(e) => setSearchPurchase(e.target.value)}
                placeholder="Search purchases..."
              />
            </div>
          </div>

          {filteredPurchases.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
              <FileText size={54} />
              <h3>No purchase invoices found</h3>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12, marginTop: 14 }}>
              {filteredPurchases.map((invoice) => (
                <PurchaseCard key={invoice.id} invoice={invoice} onPayment={addPayment} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}




