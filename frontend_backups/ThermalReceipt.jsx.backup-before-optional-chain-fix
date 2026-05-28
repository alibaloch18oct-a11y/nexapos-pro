import React from "react";

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
  serviceChargeName: "Service Charges",
  receiptFooter: "Thank you for your order.",
  receiptNote: "Powered by NexaPOS Pro",
  showTaxOnReceipt: true,
  showServiceChargeOnReceipt: true
};

function safeNumber(value) {
  return Number(value || 0);
}

function money(settings, value) {
  return `${settings.currency || "Rs"} ${Math.round(safeNumber(value)).toLocaleString()}`;
}

function modeLabel(mode) {
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

function statusLabel(order) {
  const paymentStatus = String(order?.paymentStatus || "").toLowerCase();
  const method = String(order?.paymentMethod || "").toLowerCase();

  if (paymentStatus === "paid") return "PAID";
  if (paymentStatus === "complimentary") return "COMPLIMENTARY";
  if (paymentStatus === "cancelled") return "CANCELLED";
  if (method.includes("cash on delivery") || method.includes("cod")) return "COD / UNPAID";
  if (paymentStatus === "unpaid") return "UNPAID";
  return paymentStatus.toUpperCase() || "ORDER";
}

function statusClass(order) {
  const label = statusLabel(order).toLowerCase();

  if (label.includes("paid") && !label.includes("unpaid")) return "paid";
  if (label.includes("complimentary")) return "comp";
  if (label.includes("cancelled")) return "cancelled";
  return "unpaid";
}

function formatDate(value) {
  try {
    return new Date(value || Date.now()).toLocaleString();
  } catch {
    return new Date().toLocaleString();
  }
}

function customerName(order) {
  return (
    `${order?.customer?.firstName || ""} ${order?.customer?.lastName || ""}`.trim() ||
    order?.customerName ||
    order?.driveThru?.customerName ||
    "Walk-in Customer"
  );
}

function lineItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

function splitPayments(order) {
  return Array.isArray(order?.splitPayments) ? order.splitPayments : [];
}

export default function ThermalReceipt({ order, settings, onClose }) {
  const receiptSettings = {
    ...defaultSettings,
    ...(settings || {}),
    ...(order?.restaurantSettings || {})
  };

  const items = lineItems(order);
  const splits = splitPayments(order);

  const subtotal = safeNumber(order?.subtotal);
  const systemDiscount = safeNumber(order?.systemDiscountAmount || order?.discountAmount);
  const loyaltyDiscount = safeNumber(order?.loyaltyRedeemedAmount || order?.loyaltyRedeemedPoints);
  const tax = safeNumber(order?.tax);
  const service = safeNumber(order?.serviceChargeAmount);
  const total = safeNumber(order?.total);

  const token = order?.orderNo || order?.tokenNo || order?.id || "N/A";
  const customerToken = order?.customerToken || order?.pickupToken || "";
  const kitchenToken = order?.kitchenToken || "";

  function printReceipt() {
    window.print();
  }

  return (
    <div className="receipt-backdrop">
      <style>
        {`
          .receipt-backdrop {
            position: fixed;
            inset: 0;
            z-index: 99999;
            background:
              radial-gradient(circle at 20% 20%, rgba(34,211,238,.16), transparent 28%),
              radial-gradient(circle at 80% 20%, rgba(168,85,247,.16), transparent 28%),
              rgba(2,6,23,.78);
            backdrop-filter: blur(12px);
            display: grid;
            place-items: center;
            padding: 18px;
            color: #0f172a;
          }

          .receipt-shell {
            width: min(520px, calc(100vw - 36px));
            max-height: calc(100vh - 36px);
            display: grid;
            grid-template-rows: auto 1fr;
            overflow: hidden;
            border-radius: 30px;
            background: #0f172a;
            border: 1px solid rgba(255,255,255,.12);
            box-shadow: 0 30px 90px rgba(0,0,0,.50);
          }

          .receipt-top-actions {
            padding: 14px;
            display: flex;
            justify-content: space-between;
            gap: 10px;
            border-bottom: 1px solid rgba(255,255,255,.08);
          }

          .receipt-action-btn {
            border: 0;
            border-radius: 16px;
            min-height: 44px;
            padding: 0 16px;
            cursor: pointer;
            color: white;
            font-weight: 900;
            background: rgba(255,255,255,.09);
            border: 1px solid rgba(255,255,255,.10);
          }

          .receipt-action-btn.primary {
            background: linear-gradient(135deg,#06b6d4,#2563eb);
            border: 0;
          }

          .receipt-scroll {
            overflow-y: auto;
            padding: 18px;
          }

          .receipt-paper {
            width: 100%;
            max-width: 380px;
            margin: 0 auto;
            background: #ffffff;
            color: #111827;
            border-radius: 12px;
            padding: 18px 16px;
            font-family: "Consolas", "Courier New", monospace;
            box-shadow: 0 18px 50px rgba(0,0,0,.35);
          }

          .receipt-center {
            text-align: center;
          }

          .receipt-logo {
            width: 72px;
            height: 72px;
            object-fit: contain;
            border-radius: 16px;
            margin: 0 auto 8px;
            display: block;
          }

          .receipt-logo-fallback {
            width: 72px;
            height: 72px;
            border-radius: 18px;
            margin: 0 auto 8px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg,#0f172a,#2563eb);
            color: white;
            font-size: 32px;
            font-family: Arial, sans-serif;
            font-weight: 950;
          }

          .receipt-title {
            margin: 0;
            font-size: 21px;
            font-weight: 950;
            letter-spacing: -.03em;
            font-family: Arial, sans-serif;
          }

          .receipt-subtitle {
            margin: 4px 0 0;
            font-size: 11px;
            color: #4b5563;
          }

          .receipt-small {
            margin: 3px 0 0;
            font-size: 10px;
            color: #4b5563;
            line-height: 1.35;
          }

          .receipt-dashed {
            border: 0;
            border-top: 1px dashed #9ca3af;
            margin: 12px 0;
          }

          .receipt-token-box {
            border: 2px solid #111827;
            border-radius: 12px;
            padding: 10px;
            text-align: center;
            margin: 12px 0;
          }

          .receipt-token-label {
            font-size: 10px;
            color: #4b5563;
            text-transform: uppercase;
            letter-spacing: .12em;
            font-weight: 800;
          }

          .receipt-token {
            font-size: 28px;
            font-weight: 1000;
            margin-top: 4px;
            font-family: Arial, sans-serif;
          }

          .receipt-kitchen-token {
            margin-top: 4px;
            font-size: 13px;
            font-weight: 950;
            color: #374151;
          }

          .receipt-status {
            margin-top: 8px;
            display: inline-flex;
            border-radius: 999px;
            padding: 6px 10px;
            font-size: 11px;
            font-weight: 950;
            letter-spacing: .04em;
            color: white;
            font-family: Arial, sans-serif;
          }

          .receipt-status.paid {
            background: #16a34a;
          }

          .receipt-status.unpaid {
            background: #f97316;
          }

          .receipt-status.comp {
            background: #7c3aed;
          }

          .receipt-status.cancelled {
            background: #dc2626;
          }

          .receipt-info-grid {
            display: grid;
            gap: 5px;
            font-size: 11px;
          }

          .receipt-info-row,
          .receipt-total-row,
          .receipt-item-row,
          .receipt-split-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
          }

          .receipt-info-row span:first-child,
          .receipt-total-row span:first-child {
            color: #4b5563;
          }

          .receipt-item-list {
            display: grid;
            gap: 9px;
          }

          .receipt-item-row {
            align-items: start;
            font-size: 11px;
          }

          .receipt-item-name {
            flex: 1;
          }

          .receipt-item-name strong {
            display: block;
            font-size: 12px;
          }

          .receipt-item-name small {
            display: block;
            margin-top: 2px;
            color: #6b7280;
          }

          .receipt-qty {
            min-width: 34px;
            font-weight: 900;
          }

          .receipt-price {
            min-width: 70px;
            text-align: right;
            font-weight: 900;
          }

          .receipt-total-stack {
            display: grid;
            gap: 6px;
            font-size: 12px;
          }

          .receipt-total-row.grand {
            font-size: 17px;
            font-weight: 1000;
            font-family: Arial, sans-serif;
          }

          .receipt-split-box {
            border: 1px dashed #9ca3af;
            border-radius: 10px;
            padding: 10px;
            display: grid;
            gap: 6px;
            font-size: 11px;
          }

          .receipt-footer {
            text-align: center;
            font-size: 11px;
            color: #374151;
            line-height: 1.45;
          }

          .receipt-qr {
            width: 82px;
            height: 82px;
            margin: 10px auto 6px;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 3px;
            padding: 8px;
            border: 1px solid #111827;
          }

          .receipt-qr span {
            background: #111827;
          }

          .receipt-qr span:nth-child(2n) {
            opacity: .15;
          }

          .receipt-qr span:nth-child(3n) {
            opacity: .55;
          }

          @media print {
            body * {
              visibility: hidden !important;
            }

            .receipt-paper,
            .receipt-paper * {
              visibility: visible !important;
            }

            .receipt-backdrop {
              position: static !important;
              display: block !important;
              background: white !important;
              padding: 0 !important;
            }

            .receipt-shell,
            .receipt-scroll {
              all: unset !important;
            }

            .receipt-top-actions {
              display: none !important;
            }

            .receipt-paper {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              max-width: 80mm !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              padding: 8px !important;
            }
          }
        `}
      </style>

      <div className="receipt-shell">
        <div className="receipt-top-actions">
          <button className="receipt-action-btn" onClick={onClose}>
            Close
          </button>
          <button className="receipt-action-btn primary" onClick={printReceipt}>
            Print Receipt
          </button>
        </div>

        <div className="receipt-scroll">
          <div className="receipt-paper">
            <div className="receipt-center">
              {receiptSettings.logoUrl ? (
                <img className="receipt-logo" src={receiptSettings.logoUrl} alt="Restaurant logo" />
              ) : (
                <div className="receipt-logo-fallback">N</div>
              )}

              <h2 className="receipt-title">
                {receiptSettings.receiptTitle || receiptSettings.restaurantName || receiptSettings.brandTitle}
              </h2>

              <p className="receipt-subtitle">
                {receiptSettings.receiptSubtitle || "Restaurant POS Receipt"}
              </p>

              {receiptSettings.address ? <p className="receipt-small">{receiptSettings.address}</p> : null}
              {receiptSettings.phone ? <p className="receipt-small">Phone: {receiptSettings.phone}</p> : null}
              {receiptSettings.email ? <p className="receipt-small">Email: {receiptSettings.email}</p> : null}
            </div>

            <div className="receipt-token-box">
              <div className="receipt-token-label">Order Token / Bill No</div>
              <div className="receipt-token">{token}</div>
              <div className={`receipt-status ${statusClass(order)}`}>{statusLabel(order)}</div>
            </div>

            <hr className="receipt-dashed" />

            <div className="receipt-info-grid">
              <div className="receipt-info-row">
                <span>Date</span>
                <strong>{formatDate(order?.createdAt || order?.date)}</strong>
              </div>

              <div className="receipt-info-row">
                <span>Mode</span>
                <strong>{modeLabel(order?.mode)}</strong>
              </div>

              {order?.table?.name ? (
                <div className="receipt-info-row">
                  <span>Table</span>
                  <strong>{order.table.name}</strong>
                </div>
              ) : null}

              {order?.waiterName ? (
                <div className="receipt-info-row">
                  <span>Waiter</span>
                  <strong>{order.waiterName}</strong>
                </div>
              ) : null}

              {order?.riderName ? (
                <div className="receipt-info-row">
                  <span>Rider</span>
                  <strong>{order.riderName}</strong>
                </div>
              ) : null}

              <div className="receipt-info-row">
                <span>Customer</span>
                <strong>{customerName(order)}</strong>
              </div>

              {order?.phone ? (
                <div className="receipt-info-row">
                  <span>Phone</span>
                  <strong>{order.phone}</strong>
                </div>
              ) : null}

              <div className="receipt-info-row">
                <span>Payment</span>
                <strong>{order?.paymentMethod || statusLabel(order)}</strong>
              </div>
            </div>

            <hr className="receipt-dashed" />

            <div className="receipt-item-list">
              {items.length === 0 ? (
                <div className="receipt-item-row">
                  <div className="receipt-item-name">
                    <strong>No items found</strong>
                  </div>
                </div>
              ) : (
                items.map((item, index) => {
                  const qty = safeNumber(item.qty || item.quantity || 1);
                  const price = safeNumber(item.price);
                  const lineTotal = qty * price;

                  return (
                    <div className="receipt-item-row" key={`${item.id || item.name}-${index}`}>
                      <div className="receipt-qty">{qty}x</div>
                      <div className="receipt-item-name">
                        <strong>{item.name}</strong>
                        <small>{item.category || item.subtitle || "Menu Item"}</small>
                      </div>
                      <div className="receipt-price">{money(receiptSettings, lineTotal)}</div>
                    </div>
                  );
                })
              )}
            </div>

            <hr className="receipt-dashed" />

            <div className="receipt-total-stack">
              <div className="receipt-total-row">
                <span>Subtotal</span>
                <strong>{money(receiptSettings, subtotal)}</strong>
              </div>

              {systemDiscount > 0 ? (
                <div className="receipt-total-row">
                  <span>Discount</span>
                  <strong>- {money(receiptSettings, systemDiscount)}</strong>
                </div>
              ) : null}

              {loyaltyDiscount > 0 ? (
                <div className="receipt-total-row">
                  <span>Loyalty Redeem</span>
                  <strong>- {money(receiptSettings, loyaltyDiscount)}</strong>
                </div>
              ) : null}

              {receiptSettings.showTaxOnReceipt !== false ? (
                <div className="receipt-total-row">
                  <span>{order?.taxName || receiptSettings.taxName || "GST"}</span>
                  <strong>{money(receiptSettings, tax)}</strong>
                </div>
              ) : null}

              {receiptSettings.showServiceChargeOnReceipt !== false ? (
                <div className="receipt-total-row">
                  <span>{order?.serviceChargeName || receiptSettings.serviceChargeName || "Service"}</span>
                  <strong>{money(receiptSettings, service)}</strong>
                </div>
              ) : null}

              <div className="receipt-total-row grand">
                <span>Total</span>
                <strong>{money(receiptSettings, total)}</strong>
              </div>
            </div>

            {splits.length > 0 ? (
              <>
                <hr className="receipt-dashed" />
                <div className="receipt-split-box">
                  <strong>Split Payments</strong>
                  {splits.map((split, index) => (
                    <div className="receipt-split-row" key={split.id || index}>
                      <span>{split.label || `Guest ${index + 1}`} Â· {split.method}</span>
                      <strong>{money(receiptSettings, split.amount)}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {order?.orderInstructions ? (
              <>
                <hr className="receipt-dashed" />
                <div className="receipt-footer">
                  <strong>Order Note</strong>
                  <br />
                  {order.orderInstructions}
                </div>
              </>
            ) : null}

            <hr className="receipt-dashed" />

            <div className="receipt-footer">
              <div className="receipt-qr">
                {Array.from({ length: 25 }).map((_, index) => (
                  <span key={index} />
                ))}
              </div>

              <strong>{receiptSettings.receiptFooter || "Thank you for your order."}</strong>
              <br />
              {receiptSettings.receiptNote || "Powered by NexaPOS Pro"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
