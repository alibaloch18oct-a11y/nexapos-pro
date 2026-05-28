import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgePercent,
  Bike,
  ChefHat,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Minus,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShoppingBag,
  Tag,
  Trash2,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { api, formatMode, getOrderMode } from "../lib/api";
import { paymentMethods } from "../lib/data";

const defaultRestaurantSettings = {
  restaurantName: "Nexa Restaurant",
  brandTitle: "Nexa Restaurant",
  receiptTitle: "Nexa Restaurant",
  receiptSubtitle: "Premium Restaurant POS Receipt",
  logoUrl: "",
  address: "",
  phone: "",
  email: "",
  currency: "Rs",
  taxName: "GST",
  taxPercent: 5,
  serviceChargeName: "Service Charges",
  serviceChargePercent: 0,
  receiptFooter: "Thank you for your order.",
  receiptNote: "Powered by NexaPOS Pro",
  showTaxOnReceipt: true,
  showServiceChargeOnReceipt: true
};

function money(settings, value) {
  return `${settings.currency || "Rs"} ${Math.round(Number(value || 0))}`;
}

function PriceLine({ label, value, strong, danger, success }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        color: success ? "#86efac" : danger ? "#fca5a5" : strong ? "white" : "#94a3b8",
        fontWeight: strong ? 950 : 650,
        fontSize: strong ? 14 : 12
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SimpleInput({ label, value, onChange, type = "text" }) {
  return (
    <label className="nexa-field">
      <span className="nexa-label">{label}</span>
      <div className="nexa-input-wrap">
        <input
          type={type}
          className="nexa-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
        />
      </div>
    </label>
  );
}

function StaffSelectBox({ label, icon, value, onChange, options, placeholder }) {
  const Icon = icon || UserCheck;

  return (
    <label className="nexa-field" style={{ margin: 0 }}>
      <span className="nexa-label">{label}</span>
      <div className="nexa-input-wrap">
        <Icon size={18} color="#a5f3fc" />
        <select className="nexa-input" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{placeholder || "Select staff"}</option>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} - {item.shift}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function PhoneModal({ phone, setPhone, onClose }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "0", "âŒ«"];

  function press(key) {
    if (key === "âŒ«") {
      setPhone(phone.slice(0, -1));
      return;
    }

    setPhone(phone + key);
  }

  return (
    <div className="nexa-modal-backdrop">
      <motion.div className="nexa-modal" style={{ maxWidth: 420 }} initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }}>
        <div className="nexa-row-between">
          <h2 style={{ margin: 0 }}>Phone Number</h2>
          <button className="nexa-logout" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="nexa-input-wrap" style={{ marginBottom: 14, minHeight: 52, fontSize: 18 }}>
          <Phone color="#a5f3fc" />
          {phone || "Enter phone..."}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {keys.map((key) => (
            <button
              key={key}
              onClick={() => press(key)}
              style={{
                minHeight: 54,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.08)",
                color: "white",
                fontSize: 20,
                fontWeight: 900
              }}
            >
              {key}
            </button>
          ))}
        </div>

        <button className="nexa-btn" style={{ marginTop: 14, width: "100%" }} onClick={onClose}>
          Next
        </button>
      </motion.div>
    </div>
  );
}

function CustomerModal({ customer, setCustomer, onClose }) {
  function update(key, value) {
    setCustomer({ ...customer, [key]: value });
  }

  return (
    <div className="nexa-modal-backdrop">
      <motion.div className="nexa-modal" style={{ maxWidth: 620 }} initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }}>
        <div className="nexa-row-between">
          <h2 style={{ margin: 0 }}>Customer Information</h2>
          <button className="nexa-logout" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="nexa-form-grid">
          <SimpleInput label="First Name" value={customer.firstName} onChange={(v) => update("firstName", v)} />
          <SimpleInput label="Last Name" value={customer.lastName} onChange={(v) => update("lastName", v)} />
        </div>

        <SimpleInput label="Email" value={customer.email} onChange={(v) => update("email", v)} />

        <label className="nexa-field">
          <span className="nexa-label">Order Instructions</span>
          <div className="nexa-input-wrap">
            <input
              className="nexa-input"
              value={customer.instructions}
              onChange={(e) => update("instructions", e.target.value)}
              placeholder="Less spicy, extra sauce, no onion..."
            />
          </div>
        </label>

        <button className="nexa-btn" onClick={onClose} style={{ width: "100%" }}>
          Save Customer
        </button>
      </motion.div>
    </div>
  );
}

function PaymentModal({
  settings,
  subtotal,
  taxAmount,
  serviceChargeAmount,
  grandTotal,
  discountResult,
  couponCode,
  setCouponCode,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  saving,
  calculatingDiscount,
  onClose,
  onRecalculate,
  onComplete
}) {
  const finalDiscount = Number(discountResult?.totalDiscount || 0);
  const discountedSubtotal = Math.max(0, subtotal - finalDiscount);
  const applied = discountResult?.applied || [];

  return (
    <div className="nexa-modal-backdrop">
      <motion.div className="nexa-modal" style={{ maxWidth: 880 }} initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }}>
        <div className="nexa-row-between">
          <div>
            <h2 style={{ margin: 0 }}>Order & Payment</h2>
            <p className="nexa-section-sub">
              Tax and service charges are coming from Restaurant Branding Settings.
            </p>
          </div>

          <button className="nexa-logout" onClick={onClose}>
            <X />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 310px", gap: 14 }}>
          <main>
            <div style={{ textAlign: "center", margin: "14px 0" }}>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Ready to Pay</div>
              <div style={{ fontSize: 42, fontWeight: 950 }}>{money(settings, grandTotal)}</div>
              {finalDiscount > 0 ? (
                <div style={{ color: "#86efac", fontWeight: 900 }}>
                  Saved {money(settings, finalDiscount)}
                </div>
              ) : null}
            </div>

            <h3>Payment Method</h3>

            <div className="nexa-module-select-grid">
              {paymentMethods.map((method) => (
                <button
                  key={method}
                  className={`nexa-select-card ${selectedPaymentMethod === method ? "active" : ""}`}
                  onClick={() => {
                    setSelectedPaymentMethod(method);
                    setTimeout(() => onRecalculate(method), 50);
                  }}
                >
                  <CircleDollarSign color={selectedPaymentMethod === method ? "#a5f3fc" : "#94a3b8"} />
                  <div style={{ marginTop: 8, fontWeight: 900 }}>{method}</div>
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.06)",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10
              }}
            >
              <div className="nexa-input-wrap">
                <Tag size={18} color="#a5f3fc" />
                <input
                  className="nexa-input"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Coupon code e.g. SAVE10"
                />
              </div>

              <button
                className="nexa-create-btn"
                type="button"
                onClick={() => onRecalculate(selectedPaymentMethod)}
                disabled={calculatingDiscount}
              >
                {calculatingDiscount ? "Checking..." : "Apply"}
              </button>
            </div>
          </main>

          <aside
            style={{
              borderRadius: 22,
              padding: 14,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(2,6,23,.72)"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Bill Summary</h3>

            <div style={{ display: "grid", gap: 8 }}>
              <PriceLine label="Subtotal" value={money(settings, subtotal)} />
              <PriceLine label="Discount" value={`- ${money(settings, finalDiscount)}`} success={finalDiscount > 0} />
              <PriceLine label="After Discount" value={money(settings, discountedSubtotal)} />
              <PriceLine label={`${settings.taxName || "GST"} (${settings.taxPercent || 0}%)`} value={money(settings, taxAmount)} />
              <PriceLine label={`${settings.serviceChargeName || "Service"} (${settings.serviceChargePercent || 0}%)`} value={money(settings, serviceChargeAmount)} />
              <div style={{ height: 1, background: "rgba(255,255,255,.15)", margin: "6px 0" }} />
              <PriceLine label="Grand Total" value={money(settings, grandTotal)} strong />
            </div>

            <div style={{ marginTop: 14 }}>
              <h4 style={{ margin: "0 0 8px" }}>Applied Discounts</h4>

              {applied.length === 0 ? (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 14,
                    background: "rgba(255,255,255,.06)",
                    color: "#94a3b8",
                    textAlign: "center"
                  }}
                >
                  No discount applied
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {applied.map((discount) => (
                    <div
                      key={discount.discountId}
                      style={{
                        padding: 9,
                        borderRadius: 14,
                        background: "rgba(34,197,94,.12)",
                        border: "1px solid rgba(34,197,94,.22)"
                      }}
                    >
                      <strong>{discount.name}</strong>
                      <div style={{ color: "#86efac", fontWeight: 900 }}>
                        - {money(settings, discount.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              className="nexa-create-btn"
              disabled={saving}
              onClick={() => onComplete(selectedPaymentMethod, grandTotal, finalDiscount, discountResult)}
              style={{ width: "100%", marginTop: 14, justifyContent: "center" }}
            >
              {saving ? "Saving..." : `Complete ${money(settings, grandTotal)}`}
            </button>

            <button className="nexa-logout" onClick={onClose} style={{ width: "100%", marginTop: 10, justifyContent: "center" }}>
              Cancel
            </button>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}

export default function POSScreen({ token, module, session, onBack }) {
  const [settings, setSettings] = useState(defaultRestaurantSettings);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [staffData, setStaffData] = useState({
    staff: [],
    waiters: [],
    riders: [],
    cashiers: [],
    kitchen: [],
    managers: []
  });
  const [selectedWaiterId, setSelectedWaiterId] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [selectedCashierId, setSelectedCashierId] = useState("");
  const [cart, setCart] = useState([]);
  const [phoneModal, setPhoneModal] = useState(false);
  const [customerModal, setCustomerModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calculatingDiscount, setCalculatingDiscount] = useState(false);
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Cash");
  const [discountResult, setDiscountResult] = useState(null);
  const [customer, setCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    instructions: ""
  });

  const orderMode = getOrderMode(module);
  const screenTitle = module?.name || `POS ${formatMode(orderMode)}`;

  async function loadSettings() {
    try {
      const res = await api(token).get("/api/restaurant-settings");
      setSettings({ ...defaultRestaurantSettings, ...(res.data.settings || {}) });
    } catch {
      setSettings({
        ...defaultRestaurantSettings,
        restaurantName: session?.tenant?.restaurantName || "Nexa Restaurant",
        brandTitle: session?.tenant?.restaurantName || "Nexa Restaurant",
        receiptTitle: session?.tenant?.restaurantName || "Nexa Restaurant"
      });
    }
  }

  async function loadMenu() {
    try {
      const res = await api(token).get("/api/menu");
      const activeCategories = (res.data.categories || []).filter((category) => category.isActive !== false);
      const activeItems = (res.data.items || []).filter((item) => item.isActive !== false && item.isAvailable !== false);

      setCategories(activeCategories);
      setMenuItems(activeItems);

      if (!activeCategoryId && activeCategories.length) {
        setActiveCategoryId(activeCategories[0].id);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load menu.");
    }
  }

  async function loadStaff() {
    try {
      const res = await api(token).get("/api/staff/active");
      setStaffData(res.data);

      if (!selectedWaiterId && res.data.waiters?.length) setSelectedWaiterId(res.data.waiters[0].id);
      if (!selectedRiderId && res.data.riders?.length) setSelectedRiderId(res.data.riders[0].id);
      if (!selectedCashierId && res.data.cashiers?.length) setSelectedCashierId(res.data.cashiers[0].id);
    } catch {
      setStaffData({
        staff: [],
        waiters: [],
        riders: [],
        cashiers: [],
        kitchen: [],
        managers: []
      });
    }
  }

  useEffect(() => {
    loadSettings();
    loadMenu();
    loadStaff();
  }, []);

  const selectedWaiter = staffData.waiters.find((item) => item.id === selectedWaiterId) || null;
  const selectedRider = staffData.riders.find((item) => item.id === selectedRiderId) || null;
  const selectedCashier = staffData.cashiers.find((item) => item.id === selectedCashierId) || null;

  const visibleItems = useMemo(() => {
    return menuItems.filter((item) => {
      const byCategory = !activeCategoryId || item.categoryId === activeCategoryId;
      const bySearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());

      return byCategory && bySearch;
    });
  }, [menuItems, activeCategoryId, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalDiscount = Number(discountResult?.totalDiscount || 0);
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const taxAmount = Math.round(discountedSubtotal * (Number(settings.taxPercent || 0) / 100));
  const serviceChargeAmount = Math.round(discountedSubtotal * (Number(settings.serviceChargePercent || 0) / 100));
  const finalTotal = discountedSubtotal + taxAmount + serviceChargeAmount;
  const activeCategory = categories.find((category) => category.id === activeCategoryId);

  function addToCart(item) {
    setCart((prev) => {
      const found = prev.find((cartItem) => cartItem.id === item.id);

      if (found) {
        return prev.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem
        );
      }

      return [...prev, { ...item, qty: 1 }];
    });

    setDiscountResult(null);
  }

  function changeQty(id, change) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + change) } : item
      )
    );
    setDiscountResult(null);
  }

  function removeItem(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
    setDiscountResult(null);
  }

  async function calculateDiscounts(methodOverride) {
    if (!cart.length) {
      setDiscountResult(null);
      return null;
    }

    setCalculatingDiscount(true);

    try {
      const method = methodOverride || selectedPaymentMethod;

      const res = await api(token).post("/api/discounts/calculate", {
        subtotal,
        items: cart,
        paymentMethod: method,
        couponCode
      });

      setDiscountResult(res.data);
      return res.data;
    } catch (error) {
      setDiscountResult(null);
      alert(error.response?.data?.message || "Failed to calculate discounts.");
      return null;
    } finally {
      setCalculatingDiscount(false);
    }
  }

  async function openPayment() {
    if (!cart.length) {
      alert("Cart is empty.");
      return;
    }

    setPaymentModal(true);
    await calculateDiscounts(selectedPaymentMethod);
  }

  async function saveOrder({
    paymentStatus,
    paymentMethod,
    orderStatus,
    kitchenStatus,
    payableTotal,
    discountAmount,
    discounts
  }) {
    if (!cart.length) {
      alert("Cart is empty.");
      return;
    }

    if (orderMode === "dine_in" && !selectedWaiterId) {
      alert("Please select waiter for dine in order.");
      return;
    }

    if (orderMode === "delivery" && !selectedRiderId) {
      alert("Please select rider for delivery order.");
      return;
    }

    setSaving(true);

    try {
      const finalDiscountData = discounts || discountResult;
      const finalDiscountAmount = discountAmount ?? finalDiscountData?.totalDiscount ?? 0;
      const finalDiscountedSubtotal = Math.max(0, subtotal - Number(finalDiscountAmount || 0));
      const finalTax = Math.round(finalDiscountedSubtotal * (Number(settings.taxPercent || 0) / 100));
      const finalService = Math.round(finalDiscountedSubtotal * (Number(settings.serviceChargePercent || 0) / 100));
      const finalPayable = payableTotal ?? finalDiscountedSubtotal + finalTax + finalService;

      const payload = {
        mode: orderMode,
        table: module.table || null,
        items: cart,
        customer,
        phone,
        staff: {
          waiter: selectedWaiter,
          rider: selectedRider,
          cashier: selectedCashier
        },
        waiterId: selectedWaiterId,
        riderId: selectedRiderId,
        cashierId: selectedCashierId,
        waiterName: selectedWaiter?.name || "",
        riderName: selectedRider?.name || "",
        cashierName: selectedCashier?.name || "",
        subtotal,
        tax: finalTax,
        total: finalPayable,
        originalTotal: subtotal + finalTax + finalService,
        discountAmount: finalDiscountAmount,
        discountsApplied: finalDiscountData?.applied || [],
        couponCode,
        taxName: settings.taxName || "GST",
        taxPercent: Number(settings.taxPercent || 0),
        serviceChargeName: settings.serviceChargeName || "Service Charges",
        serviceChargePercent: Number(settings.serviceChargePercent || 0),
        serviceChargeAmount: finalService,
        currency: settings.currency || "Rs",
        restaurantSettings: settings,
        paymentMethod,
        paymentStatus,
        orderStatus,
        kitchenStatus,
        orderInstructions: customer.instructions || ""
      };

      await api(token).post("/api/orders", payload);

      alert(paymentStatus === "paid" ? "Order saved and paid successfully." : "Order saved successfully.");

      setCart([]);
      setPhone("");
      setCouponCode("");
      setDiscountResult(null);
      setCustomer({
        firstName: "",
        lastName: "",
        email: "",
        instructions: ""
      });
      setPaymentModal(false);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", padding: 13 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "84px 1fr 390px",
          gap: 12,
          minHeight: "calc(100vh - 26px)"
        }}
      >
        <aside
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(15,23,42,.78)",
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}
        >
          <button className="nexa-logout" onClick={onBack} style={{ width: "100%" }}>
            <ChevronLeft size={18} />
          </button>

          {categories.map((category, index) => (
            <button
              key={category.id}
              onClick={() => setActiveCategoryId(category.id)}
              style={{
                minHeight: 62,
                borderRadius: 18,
                border:
                  activeCategoryId === category.id
                    ? "1px solid rgba(34,211,238,.5)"
                    : "1px solid rgba(255,255,255,.1)",
                background:
                  activeCategoryId === category.id
                    ? "rgba(34,211,238,.16)"
                    : "rgba(255,255,255,.06)",
                color: "white",
                padding: 7,
                fontWeight: 900,
                fontSize: 10.5,
                textAlign: "center"
              }}
            >
              <div
                style={{
                  margin: "0 auto 5px",
                  width: 22,
                  height: 22,
                  borderRadius: 8,
                  background: activeCategoryId === category.id ? "#06b6d4" : "rgba(255,255,255,.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11
                }}
              >
                {index + 1}
              </div>
              {category.name}
            </button>
          ))}
        </aside>

        <main
          style={{
            borderRadius: 24,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(2,6,23,.58)",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid rgba(255,255,255,.1)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap"
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 16,
                background: `linear-gradient(90deg, ${settings.accentColor || "#581c87"}, ${settings.primaryColor || "#0891b2"})`,
                fontWeight: 950
              }}
            >
              {settings.brandTitle || settings.restaurantName || "MENU"}
            </div>

            <button className="nexa-pill" onClick={loadMenu}>Refresh Menu</button>
            <button className="nexa-pill" onClick={loadSettings}>Refresh Settings</button>

            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 15,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.08)"
              }}
            >
              <Search size={17} />
              <input
                className="nexa-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items"
              />
            </div>
          </div>

          <div style={{ padding: 18, height: "calc(100vh - 96px)", overflowY: "auto" }}>
            <div className="nexa-row-between">
              <div>
                <h1 style={{ margin: 0, fontSize: 29, fontWeight: 950 }}>
                  {(activeCategory?.name || "MENU").toUpperCase()}
                </h1>
                <p style={{ margin: "5px 0 0", color: "#94a3b8" }}>
                  Tax {settings.taxPercent || 0}% Â· Service {settings.serviceChargePercent || 0}%
                </p>
              </div>
              <div className="nexa-pill">{settings.restaurantName || session.tenant?.restaurantName}</div>
            </div>

            {visibleItems.length === 0 ? (
              <div className="nexa-panel" style={{ textAlign: "center", color: "#94a3b8" }}>
                <ShoppingBag size={54} />
                <h2>No items found</h2>
                <p>Add items from Settings / Menu Admin Panel.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 13 }}>
                {visibleItems.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -5, scale: 1.012 }}
                    style={{
                      minHeight: 224,
                      borderRadius: 24,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,.10)",
                      background: "linear-gradient(135deg,rgba(15,23,42,.95),rgba(30,41,59,.72))",
                      boxShadow: "0 16px 44px rgba(0,0,0,.28)"
                    }}
                  >
                    <div
                      style={{
                        height: 112,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          "radial-gradient(circle,rgba(168,85,247,.24),rgba(6,182,212,.11),rgba(15,23,42,.2))"
                      }}
                    >
                      <div style={{ fontSize: 48 }}>{item.emoji || "ðŸ½ï¸"}</div>

                      {item.discount ? (
                        <div
                          style={{
                            position: "absolute",
                            left: 10,
                            top: 10,
                            padding: "6px 9px",
                            borderRadius: 11,
                            background: "#7c3aed",
                            fontSize: 10.5,
                            fontWeight: 900
                          }}
                        >
                          {item.discount}
                        </div>
                      ) : null}

                      <button
                        onClick={() => addToCart(item)}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: 10,
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          border: 0,
                          background: "linear-gradient(135deg,#facc15,#f97316)",
                          color: "#111827",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 12px 30px rgba(250,204,21,.26)"
                        }}
                      >
                        <Plus size={22} />
                      </button>

                      <div
                        style={{
                          position: "absolute",
                          left: 10,
                          bottom: 10,
                          padding: "6px 9px",
                          borderRadius: 11,
                          background: "rgba(0,0,0,.55)",
                          fontWeight: 950
                        }}
                      >
                        {money(settings, item.price)}
                      </div>
                    </div>

                    <div style={{ padding: 14 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 950 }}>{item.name}</h3>
                      <p style={{ margin: "7px 0 0", color: "#94a3b8", fontSize: 12 }}>
                        {item.subtitle || item.category}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>

        <aside
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(15,23,42,.86)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          <div style={{ padding: 14, borderBottom: "1px solid rgba(255,255,255,.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>{screenTitle}</h2>
                <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>Items: {cart.length}</p>
              </div>
              <button className="nexa-logout" style={{ padding: 9 }}>
                <Settings size={17} />
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 9 }}>
              <button className="nexa-input-wrap" onClick={() => setPhoneModal(true)} style={{ color: "white", textAlign: "left" }}>
                <Phone size={17} color="#a5f3fc" />
                {phone || "Phone Number..."}
              </button>

              <button className="nexa-input-wrap" onClick={() => setCustomerModal(true)} style={{ color: "white", textAlign: "left" }}>
                <Users size={17} color="#a5f3fc" />
                {customer.firstName ? `${customer.firstName} ${customer.lastName}` : "Customer Info..."}
              </button>

              {orderMode === "dine_in" ? (
                <StaffSelectBox
                  label="Serving Waiter"
                  icon={UserCheck}
                  value={selectedWaiterId}
                  onChange={setSelectedWaiterId}
                  options={staffData.waiters}
                  placeholder="Select waiter"
                />
              ) : null}

              {orderMode === "delivery" ? (
                <StaffSelectBox
                  label="Delivery Rider"
                  icon={Bike}
                  value={selectedRiderId}
                  onChange={setSelectedRiderId}
                  options={staffData.riders}
                  placeholder="Select rider"
                />
              ) : null}

              <StaffSelectBox
                label="Cashier"
                icon={ChefHat}
                value={selectedCashierId}
                onChange={setSelectedCashierId}
                options={staffData.cashiers}
                placeholder="Select cashier"
              />

              <div className="nexa-input-wrap" style={{ color: "#94a3b8" }}>
                <Clock3 size={17} color="#a5f3fc" />
                Today at {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, padding: 14, overflowY: "auto" }}>
            {cart.length === 0 ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#94a3b8" }}>
                <div>
                  <ShoppingBag size={48} style={{ margin: "0 auto 10px" }} />
                  <h3>Cart is empty</h3>
                  <p>Add items from menu</p>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {cart.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,.12)",
                      background: "rgba(255,255,255,.06)",
                      padding: 10
                    }}
                  >
                    <div style={{ display: "flex", gap: 9 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 13,
                          background: "rgba(34,211,238,.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 950
                        }}
                      >
                        {index + 1}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 950 }}>{item.name}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>{money(settings, item.price)}</div>
                      </div>

                      <button onClick={() => removeItem(item.id)} className="nexa-logout" style={{ padding: 7 }}>
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <button className="nexa-pill" onClick={() => changeQty(item.id, -1)}>
                          <Minus size={13} />
                        </button>
                        <strong>{item.qty}</strong>
                        <button className="nexa-pill" onClick={() => changeQty(item.id, 1)}>
                          <Plus size={13} />
                        </button>
                      </div>
                      <strong>{money(settings, item.price * item.qty)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,.1)" }}>
            <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              <PriceLine label="Subtotal" value={money(settings, subtotal)} />
              <PriceLine label="Discount" value={`- ${money(settings, totalDiscount)}`} success={totalDiscount > 0} />
              <PriceLine label={`${settings.taxName || "GST"} (${settings.taxPercent || 0}%)`} value={money(settings, taxAmount)} />
              <PriceLine label={`${settings.serviceChargeName || "Service"} (${settings.serviceChargePercent || 0}%)`} value={money(settings, serviceChargeAmount)} />
              <PriceLine label="Grand Total" value={money(settings, finalTotal)} strong />
            </div>

            {totalDiscount > 0 ? (
              <div
                style={{
                  marginBottom: 10,
                  padding: 9,
                  borderRadius: 14,
                  background: "rgba(34,197,94,.12)",
                  border: "1px solid rgba(34,197,94,.22)",
                  color: "#86efac",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  gap: 7
                }}
              >
                <BadgePercent size={16} />
                Discount applied: {money(settings, totalDiscount)}
              </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 9 }}>
              <button
                className="nexa-logout"
                style={{ justifyContent: "center" }}
                disabled={saving}
                onClick={() =>
                  saveOrder({
                    paymentStatus: "unpaid",
                    paymentMethod: "",
                    orderStatus: "held",
                    kitchenStatus: "unconfirmed",
                    payableTotal: finalTotal,
                    discountAmount: totalDiscount,
                    discounts: discountResult
                  })
                }
              >
                {saving ? "Saving..." : "Hold"}
              </button>

              <button className="nexa-create-btn" disabled={saving} onClick={openPayment}>
                Order & Pay {money(settings, finalTotal)}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {phoneModal ? <PhoneModal phone={phone} setPhone={setPhone} onClose={() => setPhoneModal(false)} /> : null}

        {customerModal ? (
          <CustomerModal customer={customer} setCustomer={setCustomer} onClose={() => setCustomerModal(false)} />
        ) : null}

        {paymentModal ? (
          <PaymentModal
            settings={settings}
            subtotal={subtotal}
            taxAmount={taxAmount}
            serviceChargeAmount={serviceChargeAmount}
            grandTotal={finalTotal}
            discountResult={discountResult}
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            selectedPaymentMethod={selectedPaymentMethod}
            setSelectedPaymentMethod={setSelectedPaymentMethod}
            saving={saving}
            calculatingDiscount={calculatingDiscount}
            onClose={() => setPaymentModal(false)}
            onRecalculate={calculateDiscounts}
            onComplete={(method, grandTotal, discountAmount, discounts) =>
              saveOrder({
                paymentStatus: method === "Complimentary" ? "complimentary" : "paid",
                paymentMethod: method,
                orderStatus: "placed",
                kitchenStatus: "placed",
                payableTotal: grandTotal,
                discountAmount,
                discounts
              })
            }
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

