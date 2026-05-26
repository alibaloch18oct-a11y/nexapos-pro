import React, { useState } from "react";
import { motion } from "framer-motion";
import { CircleDollarSign, Printer, ReceiptText, X } from "lucide-react";
import { paymentMethods, tableSplitItems } from "../lib/data";
import { formatTime } from "../lib/api";

function PriceLine({ label, value, strong }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        color: strong ? "white" : "#94a3b8",
        fontWeight: strong ? 950 : 600
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function ReceiptModal({ table, mode = "settle", onClose, onPaid }) {
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const subtotal = table?.total || tableSplitItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const service = Math.round(subtotal * 0.05);
  const tax = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + service + tax;
  const paidAt = new Date().toISOString();

  function printReceipt() {
    window.print();
  }

  function completePayment() {
    onPaid?.({
      table,
      paymentMethod,
      subtotal,
      service,
      tax,
      grandTotal,
      paidAt
    });
    onClose();
  }

  return (
    <div className="nexa-modal-backdrop">
      <motion.div
        className="nexa-modal"
        style={{
          maxWidth: 980,
          maxHeight: "94vh",
          overflowY: "auto"
        }}
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 18 }}
      >
        <div className="nexa-row-between">
          <div>
            <h2 className="nexa-section-title" style={{ marginBottom: 4 }}>
              {mode === "print" ? "Print Bill Preview" : "Settle Table Payment"}
            </h2>
            <p className="nexa-section-sub">
              Table {table?.name}  -  Order {table?.orderNo || "#NEW"}  -  Staff {table?.staff || "Staff"}
            </p>
          </div>

          <button className="nexa-logout" onClick={onClose}>
            <X size={18} /> Close
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 18 }}>
          <div
            style={{
              borderRadius: 28,
              padding: 22,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.06)"
            }}
          >
            <div style={{ textAlign: "center", borderBottom: "1px dashed rgba(255,255,255,.22)", paddingBottom: 18 }}>
              <ReceiptText size={46} color="#a5f3fc" />
              <h2 style={{ margin: "10px 0 4px", fontSize: 28 }}>NexaPOS Pro</h2>
              <p style={{ margin: 0, color: "#94a3b8" }}>Premium Restaurant POS Receipt</p>
              <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>{formatTime(paidAt)}</p>
            </div>

            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="nexa-pill">Table: {table?.name}</div>
              <div className="nexa-pill">Order: {table?.orderNo || "#NEW"}</div>
              <div className="nexa-pill">Guests: {table?.guests || 2}</div>
              <div className="nexa-pill">Payment: {paymentMethod}</div>
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
              {tableSplitItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                    padding: 12,
                    borderRadius: 16,
                    background: "rgba(15,23,42,.68)",
                    border: "1px solid rgba(255,255,255,.08)"
                  }}
                >
                  <div>
                    <strong>{item.qty}x {item.name}</strong>
                    <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>Unit Rs {item.price}</p>
                  </div>
                  <strong>Rs {item.qty * item.price}</strong>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(15,23,42,.72)"
              }}
            >
              <PriceLine label="Subtotal" value={`Rs ${subtotal}`} />
              <PriceLine label="Service Charges (5%)" value={`Rs ${service}`} />
              <PriceLine label="Tax (5%)" value={`Rs ${tax}`} />
              <div style={{ height: 1, background: "rgba(255,255,255,.15)", margin: "12px 0" }} />
              <PriceLine label="Grand Total" value={`Rs ${grandTotal}`} strong />
            </div>

            <div
              style={{
                marginTop: 18,
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 13
              }}
            >
              Thank you for dining with us.
              <br />
              Powered by NexaPOS Pro
            </div>
          </div>

          <aside
            style={{
              borderRadius: 28,
              padding: 18,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(2,6,23,.72)"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Payment Method</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {paymentMethods.map((method) => (
                <button
                  key={method}
                  className={`nexa-select-card ${paymentMethod === method ? "active" : ""}`}
                  onClick={() => setPaymentMethod(method)}
                  style={{ minHeight: 86 }}
                >
                  <CircleDollarSign color={paymentMethod === method ? "#a5f3fc" : "#94a3b8"} />
                  <strong>{method}</strong>
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 18,
                borderRadius: 22,
                background: "rgba(34,211,238,.10)",
                border: "1px solid rgba(34,211,238,.24)",
                textAlign: "center"
              }}
            >
              <p style={{ margin: 0, color: "#94a3b8" }}>Outstanding Amount</p>
              <div style={{ fontSize: 42, fontWeight: 950 }}>Rs {grandTotal}</div>
            </div>

            <button
              className="nexa-create-btn"
              style={{ width: "100%", marginTop: 14, justifyContent: "center" }}
              onClick={completePayment}
            >
              Mark as Paid
            </button>

            <button
              className="nexa-logout"
              style={{ width: "100%", marginTop: 10, justifyContent: "center" }}
              onClick={printReceipt}
            >
              <Printer size={16} /> Print Preview
            </button>

            <button
              className="nexa-btn"
              style={{ marginTop: 10 }}
              onClick={() => alert("Duplicate receipt saved locally. Backend receipt storage will come later.")}
            >
              Save Receipt
            </button>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}




