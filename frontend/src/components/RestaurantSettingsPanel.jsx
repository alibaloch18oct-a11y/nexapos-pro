import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

const defaultSettings = {
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
  return `${settings.currency || "Rs"} ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function Field({ label, children, hint }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="settings-toggle">
      <div>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>

      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function ReceiptPreview({ settings }) {
  const sampleItems = [
    { name: "Zinger Burger", qty: 2, price: 650 },
    { name: "Mint Margarita", qty: 1, price: 290 },
    { name: "Loaded Fries", qty: 1, price: 680 }
  ];

  const subtotal = sampleItems.reduce((sum, item) => sum + item.qty * item.price, 0);
  const tax = Math.round(subtotal * (Number(settings.taxPercent || 0) / 100));
  const service = Math.round(subtotal * (Number(settings.serviceChargePercent || 0) / 100));
  const total = subtotal + tax + service;

  return (
    <div className="receipt-preview-card">
      <div className="preview-paper">
        <div className="preview-center">
          {settings.logoUrl ? (
            <img className="preview-logo" src={settings.logoUrl} alt="Logo preview" />
          ) : (
            <div className="preview-logo-fallback">N</div>
          )}

          <h3>{settings.receiptTitle || settings.restaurantName}</h3>
          <p>{settings.receiptSubtitle || "Restaurant POS Receipt"}</p>
          {settings.address ? <small>{settings.address}</small> : null}
          {settings.phone ? <small>Phone: {settings.phone}</small> : null}
          {settings.email ? <small>Email: {settings.email}</small> : null}
        </div>

        <div className="preview-token">
          <small>ORDER TOKEN</small>
          <strong>ORD-1001</strong>
          <span>PAID</span>
        </div>

        <div className="preview-line" />

        <div className="preview-info">
          <div><span>Date</span><b>{new Date().toLocaleString()}</b></div>
          <div><span>Mode</span><b>Dine In</b></div>
          <div><span>Table</span><b>T1</b></div>
          <div><span>Payment</span><b>Cash</b></div>
        </div>

        <div className="preview-line" />

        <div className="preview-items">
          {sampleItems.map((item) => (
            <div key={item.name}>
              <span>{item.qty}x {item.name}</span>
              <b>{money(settings, item.qty * item.price)}</b>
            </div>
          ))}
        </div>

        <div className="preview-line" />

        <div className="preview-totals">
          <div><span>Subtotal</span><b>{money(settings, subtotal)}</b></div>

          {settings.showTaxOnReceipt ? (
            <div><span>{settings.taxName || "GST"} ({settings.taxPercent || 0}%)</span><b>{money(settings, tax)}</b></div>
          ) : null}

          {settings.showServiceChargeOnReceipt ? (
            <div><span>{settings.serviceChargeName || "Service"} ({settings.serviceChargePercent || 0}%)</span><b>{money(settings, service)}</b></div>
          ) : null}

          <div className="grand"><span>Total</span><b>{money(settings, total)}</b></div>
        </div>

        <div className="preview-line" />

        <div className="preview-center">
          <strong>{settings.receiptFooter || "Thank you for your order."}</strong>
          <small>{settings.receiptNote || "Powered by NexaPOS Pro"}</small>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantSettingsPanel({ token, session, onBack }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  function update(key, value) {
    setSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  async function loadSettings() {
    setLoading(true);

    try {
      const res = await api(token).get("/api/restaurant-settings");
      setSettings({
        ...defaultSettings,
        restaurantName: session?.tenant?.restaurantName || defaultSettings.restaurantName,
        brandTitle: session?.tenant?.restaurantName || defaultSettings.brandTitle,
        receiptTitle: session?.tenant?.restaurantName || defaultSettings.receiptTitle,
        ...(res.data.settings || {})
      });
    } catch {
      setSettings({
        ...defaultSettings,
        restaurantName: session?.tenant?.restaurantName || defaultSettings.restaurantName,
        brandTitle: session?.tenant?.restaurantName || defaultSettings.brandTitle,
        receiptTitle: session?.tenant?.restaurantName || defaultSettings.receiptTitle
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);

    try {
      await api(token).post("/api/restaurant-settings", {
        settings
      });

      alert("Restaurant settings saved successfully.");
    } catch (error) {
      try {
        await api(token).patch("/api/restaurant-settings", {
          settings
        });

        alert("Restaurant settings saved successfully.");
      } catch (secondError) {
        alert(
          secondError.response?.data?.message ||
            error.response?.data?.message ||
            "Failed to save restaurant settings."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    const ok = confirm("Reset receipt and restaurant settings to defaults?");
    if (!ok) return;

    setSettings({
      ...defaultSettings,
      restaurantName: session?.tenant?.restaurantName || defaultSettings.restaurantName,
      brandTitle: session?.tenant?.restaurantName || defaultSettings.brandTitle,
      receiptTitle: session?.tenant?.restaurantName || defaultSettings.receiptTitle
    });
  }

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="settings-page">
      <style>
        {`
          .settings-page {
            min-height: 100vh;
            padding: 18px;
            color: white;
            background:
              radial-gradient(circle at 12% 16%, rgba(34,211,238,.12), transparent 28%),
              radial-gradient(circle at 84% 12%, rgba(168,85,247,.12), transparent 30%),
              linear-gradient(180deg,#020617,#071028);
          }

          .settings-head {
            display: flex;
            justify-content: space-between;
            align-items: start;
            gap: 14px;
            margin-bottom: 16px;
          }

          .settings-title {
            margin: 13px 0 4px;
            font-size: 36px;
            font-weight: 1000;
            letter-spacing: -.04em;
          }

          .settings-sub {
            margin: 0;
            color: #94a3b8;
          }

          .settings-back,
          .settings-primary-btn,
          .settings-soft-btn {
            border: 0;
            color: white;
            font-weight: 900;
            cursor: pointer;
            transition: .18s ease;
          }

          .settings-back,
          .settings-soft-btn {
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.10);
          }

          .settings-back,
          .settings-primary-btn,
          .settings-soft-btn {
            height: 44px;
            padding: 0 15px;
            border-radius: 15px;
          }

          .settings-primary-btn {
            background: linear-gradient(135deg,#06b6d4,#2563eb);
          }

          .settings-primary-btn:disabled,
          .settings-soft-btn:disabled {
            opacity: .55;
            cursor: not-allowed;
          }

          .settings-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .settings-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 430px;
            gap: 16px;
            align-items: start;
          }

          .settings-card {
            border-radius: 28px;
            background: rgba(15,23,42,.78);
            border: 1px solid rgba(255,255,255,.10);
            box-shadow: 0 20px 50px rgba(0,0,0,.22);
            padding: 16px;
          }

          .settings-section {
            margin-bottom: 18px;
          }

          .settings-section:last-child {
            margin-bottom: 0;
          }

          .settings-section h2 {
            margin: 0 0 12px;
            font-size: 20px;
            font-weight: 1000;
          }

          .settings-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .settings-field {
            display: grid;
            gap: 7px;
          }

          .settings-field span,
          .settings-toggle strong {
            color: #e2e8f0;
            font-size: 13px;
            font-weight: 900;
          }

          .settings-field small,
          .settings-toggle small {
            color: #94a3b8;
            font-size: 12px;
            line-height: 1.35;
          }

          .settings-input,
          .settings-select,
          .settings-textarea {
            width: 100%;
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,.10);
            background: rgba(255,255,255,.07);
            color: white;
            padding: 0 13px;
            outline: none;
            font-weight: 800;
          }

          .settings-input,
          .settings-select {
            height: 45px;
          }

          .settings-textarea {
            min-height: 82px;
            padding-top: 12px;
            resize: vertical;
          }

          .settings-select option {
            color: #111827;
          }

          .settings-toggle {
            padding: 13px;
            border-radius: 18px;
            background: rgba(255,255,255,.055);
            border: 1px solid rgba(255,255,255,.09);
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
          }

          .settings-toggle input {
            width: 22px;
            height: 22px;
          }

          .settings-preview-sticky {
            position: sticky;
            top: 18px;
          }

          .receipt-preview-card {
            border-radius: 28px;
            background:
              radial-gradient(circle at top left, rgba(34,211,238,.10), transparent 35%),
              rgba(15,23,42,.78);
            border: 1px solid rgba(255,255,255,.10);
            padding: 16px;
            box-shadow: 0 20px 50px rgba(0,0,0,.22);
          }

          .preview-paper {
            max-width: 330px;
            margin: 0 auto;
            background: white;
            color: #111827;
            border-radius: 13px;
            padding: 16px 14px;
            font-family: Consolas, "Courier New", monospace;
            box-shadow: 0 18px 45px rgba(0,0,0,.35);
          }

          .preview-center {
            text-align: center;
            display: grid;
            justify-items: center;
            gap: 4px;
          }

          .preview-logo {
            width: 66px;
            height: 66px;
            object-fit: contain;
            border-radius: 16px;
            margin-bottom: 5px;
          }

          .preview-logo-fallback {
            width: 66px;
            height: 66px;
            border-radius: 17px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg,#0f172a,#2563eb);
            color: white;
            font-size: 30px;
            font-weight: 1000;
            font-family: Arial, sans-serif;
            margin-bottom: 5px;
          }

          .preview-center h3 {
            margin: 0;
            font-family: Arial, sans-serif;
            font-size: 20px;
            font-weight: 1000;
            letter-spacing: -.04em;
          }

          .preview-center p,
          .preview-center small {
            margin: 0;
            color: #4b5563;
            font-size: 10px;
            line-height: 1.35;
          }

          .preview-line {
            border-top: 1px dashed #9ca3af;
            margin: 12px 0;
          }

          .preview-token {
            border: 2px solid #111827;
            border-radius: 12px;
            padding: 9px;
            text-align: center;
            margin-top: 12px;
          }

          .preview-token small {
            color: #4b5563;
            letter-spacing: .12em;
            font-weight: 900;
            font-size: 9px;
          }

          .preview-token strong {
            display: block;
            font-family: Arial, sans-serif;
            font-size: 25px;
            font-weight: 1000;
            margin-top: 4px;
          }

          .preview-token span {
            display: inline-flex;
            margin-top: 6px;
            padding: 5px 9px;
            border-radius: 999px;
            color: white;
            background: #16a34a;
            font-size: 10px;
            font-weight: 950;
          }

          .preview-info,
          .preview-items,
          .preview-totals {
            display: grid;
            gap: 6px;
            font-size: 11px;
          }

          .preview-info div,
          .preview-items div,
          .preview-totals div {
            display: flex;
            justify-content: space-between;
            gap: 10px;
          }

          .preview-info span,
          .preview-totals span {
            color: #4b5563;
          }

          .preview-totals .grand {
            font-family: Arial, sans-serif;
            font-size: 16px;
            font-weight: 1000;
          }

          .settings-loading {
            padding: 24px;
            border-radius: 24px;
            background: rgba(15,23,42,.78);
            border: 1px solid rgba(255,255,255,.10);
            color: #94a3b8;
          }

          @media (max-width: 1150px) {
            .settings-layout {
              grid-template-columns: 1fr;
            }

            .settings-preview-sticky {
              position: relative;
              top: auto;
            }
          }

          @media (max-width: 760px) {
            .settings-grid {
              grid-template-columns: 1fr;
            }

            .settings-head {
              display: grid;
            }

            .settings-actions {
              justify-content: flex-start;
            }
          }
        `}
      </style>

      <div className="settings-head">
        <div>
          <button className="settings-back" onClick={onBack}>â† Back</button>
          <h1 className="settings-title">Restaurant Settings</h1>
          <p className="settings-sub">
            Receipt designer, tax, service charges, branding and bill print settings.
          </p>
        </div>

        <div className="settings-actions">
          <button className="settings-soft-btn" onClick={loadSettings} disabled={loading || saving}>
            Refresh
          </button>
          <button className="settings-soft-btn" onClick={resetDefaults} disabled={saving}>
            Reset
          </button>
          <button className="settings-primary-btn" onClick={saveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="settings-loading">Loading restaurant settings...</div>
      ) : (
        <div className="settings-layout">
          <div className="settings-card">
            <div className="settings-section">
              <h2>Branding</h2>

              <div className="settings-grid">
                <Field label="Restaurant Name">
                  <input className="settings-input" value={settings.restaurantName} onChange={(e) => update("restaurantName", e.target.value)} />
                </Field>

                <Field label="Brand Title">
                  <input className="settings-input" value={settings.brandTitle} onChange={(e) => update("brandTitle", e.target.value)} />
                </Field>

                <Field label="Logo URL" hint="Paste image URL. Local upload can be added later.">
                  <input className="settings-input" value={settings.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://..." />
                </Field>

                <Field label="Currency">
                  <select className="settings-select" value={settings.currency} onChange={(e) => update("currency", e.target.value)}>
                    <option value="Rs">Rs</option>
                    <option value="PKR">PKR</option>
                    <option value="$">$</option>
                    <option value="AED">AED</option>
                    <option value="Â£">Â£</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="settings-section">
              <h2>Contact Details</h2>

              <div className="settings-grid">
                <Field label="Phone">
                  <input className="settings-input" value={settings.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+92..." />
                </Field>

                <Field label="Email">
                  <input className="settings-input" value={settings.email} onChange={(e) => update("email", e.target.value)} placeholder="restaurant@email.com" />
                </Field>

                <Field label="Address">
                  <textarea className="settings-textarea" value={settings.address} onChange={(e) => update("address", e.target.value)} placeholder="Restaurant address" />
                </Field>
              </div>
            </div>

            <div className="settings-section">
              <h2>Receipt Text</h2>

              <div className="settings-grid">
                <Field label="Receipt Title">
                  <input className="settings-input" value={settings.receiptTitle} onChange={(e) => update("receiptTitle", e.target.value)} />
                </Field>

                <Field label="Receipt Subtitle">
                  <input className="settings-input" value={settings.receiptSubtitle} onChange={(e) => update("receiptSubtitle", e.target.value)} />
                </Field>

                <Field label="Receipt Footer">
                  <input className="settings-input" value={settings.receiptFooter} onChange={(e) => update("receiptFooter", e.target.value)} />
                </Field>

                <Field label="Receipt Note">
                  <input className="settings-input" value={settings.receiptNote} onChange={(e) => update("receiptNote", e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="settings-section">
              <h2>Tax & Service Charges</h2>

              <div className="settings-grid">
                <Field label="Tax Name">
                  <input className="settings-input" value={settings.taxName} onChange={(e) => update("taxName", e.target.value)} />
                </Field>

                <Field label="Tax Percent">
                  <input className="settings-input" type="number" value={settings.taxPercent} onChange={(e) => update("taxPercent", Number(e.target.value || 0))} />
                </Field>

                <Field label="Service Charge Name">
                  <input className="settings-input" value={settings.serviceChargeName} onChange={(e) => update("serviceChargeName", e.target.value)} />
                </Field>

                <Field label="Service Charge Percent">
                  <input className="settings-input" type="number" value={settings.serviceChargePercent} onChange={(e) => update("serviceChargePercent", Number(e.target.value || 0))} />
                </Field>

                <Toggle
                  label="Show Tax on Receipt"
                  hint="Hide or show tax row on printed bill."
                  checked={settings.showTaxOnReceipt}
                  onChange={(value) => update("showTaxOnReceipt", value)}
                />

                <Toggle
                  label="Show Service Charge on Receipt"
                  hint="Hide or show service charges row on printed bill."
                  checked={settings.showServiceChargeOnReceipt}
                  onChange={(value) => update("showServiceChargeOnReceipt", value)}
                />
              </div>
            </div>
          </div>

          <div className="settings-preview-sticky">
            <ReceiptPreview settings={settings} />
          </div>
        </div>
      )}
    </div>
  );
}

