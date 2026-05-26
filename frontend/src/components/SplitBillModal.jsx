import React, { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Printer, ReceiptText, X } from "lucide-react";
import { tableSplitItems } from "../lib/data";

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

export default function SplitBillModal({ table, onClose }) {
  const [splitType, setSplitType] = useState("item");
  const [selectedCheck, setSelectedCheck] = useState("check1");
  const [checks, setChecks] = useState([
    {
      id: "check1",
      name: "Check 1",
      portions: 1,
      items: [
        { ...tableSplitItems[0], splitQty: 1 },
        { ...tableSplitItems[1], splitQty: 1 }
      ]
    },
    {
      id: "check2",
      name: "Check 2",
      portions: 1,
      items: [
        { ...tableSplitItems[0], splitQty: 1 },
        { ...tableSplitItems[2], splitQty: 1 }
      ]
    }
  ]);

  const originalTotal = tableSplitItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const originalService = Math.round(originalTotal * 0.05);
  const originalGrand = originalTotal + originalService;
  const activeCheck = checks.find((check) => check.id === selectedCheck) || checks[0];

  function checkSubtotal(check) {
    return check.items.reduce((sum, item) => sum + item.price * item.splitQty, 0);
  }

  function checkService(check) {
    return Math.round(checkSubtotal(check) * 0.05);
  }

  function checkGrand(check) {
    return checkSubtotal(check) + checkService(check);
  }

  function addCheck() {
    const nextNo = checks.length + 1;
    const newCheck = {
      id: `check${nextNo}`,
      name: `Check ${nextNo}`,
      portions: 1,
      items: []
    };

    setChecks((prev) => [...prev, newCheck]);
    setSelectedCheck(newCheck.id);
  }

  function increasePortion(checkId) {
    setChecks((prev) =>
      prev.map((check) =>
        check.id === checkId ? { ...check, portions: check.portions + 1 } : check
      )
    );
  }

  function decreasePortion(checkId) {
    setChecks((prev) =>
      prev.map((check) =>
        check.id === checkId ? { ...check, portions: Math.max(1, check.portions - 1) } : check
      )
    );
  }

  function addItemToCheck(item) {
    setChecks((prev) =>
      prev.map((check) => {
        if (check.id !== selectedCheck) return check;

        const found = check.items.find((checkItem) => checkItem.id === item.id);

        if (found) {
          return {
            ...check,
            items: check.items.map((checkItem) =>
              checkItem.id === item.id
                ? { ...checkItem, splitQty: checkItem.splitQty + 1 }
                : checkItem
            )
          };
        }

        return {
          ...check,
          items: [...check.items, { ...item, splitQty: 1 }]
        };
      })
    );
  }

  function removeItemFromCheck(itemId) {
    setChecks((prev) =>
      prev.map((check) => {
        if (check.id !== selectedCheck) return check;

        return {
          ...check,
          items: check.items
            .map((item) =>
              item.id === itemId ? { ...item, splitQty: item.splitQty - 1 } : item
            )
            .filter((item) => item.splitQty > 0)
        };
      })
    );
  }

  function applyEqualSplit() {
    const people = Math.max(2, checks.length);
    const equalAmount = Math.round(originalGrand / people);

    setChecks((prev) =>
      prev.map((check, index) => ({
        ...check,
        name: `Check ${index + 1}`,
        portions: 1,
        equalAmount
      }))
    );

    setSplitType("equal");
  }

  return (
    <div className="nexa-modal-backdrop">
      <motion.div
        className="nexa-modal"
        style={{
          maxWidth: 1280,
          maxHeight: "94vh",
          padding: 0,
          overflow: "hidden"
        }}
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 18 }}
      >
        <div
          style={{
            height: 76,
            padding: "0 22px",
            borderBottom: "1px solid rgba(255,255,255,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(15,23,42,.95)"
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 25, fontWeight: 950 }}>
              Split Bill Order {table.orderNo || "#694"}
            </h2>
            <p style={{ margin: "4px 0 0", color: "#94a3b8" }}>
              Table {table.name} Â· Staff {table.staff || "Admin"} Â· Guests {table.guests || 2}
            </p>
          </div>

          <button className="nexa-logout" onClick={onClose}>
            <X size={18} /> Close
          </button>
        </div>

        <div
          style={{
            height: "calc(94vh - 76px)",
            display: "grid",
            gridTemplateColumns: "300px 1fr 380px",
            gap: 0,
            overflow: "hidden"
          }}
        >
          <aside
            style={{
              borderRight: "1px solid rgba(255,255,255,.1)",
              padding: 16,
              background: "rgba(2,6,23,.7)",
              overflowY: "auto"
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <button
                className="nexa-create-btn"
                onClick={addCheck}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Plus size={18} /> Add Check
              </button>

              <button
                className="nexa-pill"
                onClick={applyEqualSplit}
                style={{
                  justifyContent: "center",
                  background: splitType === "equal" ? "rgba(34,211,238,.22)" : "rgba(255,255,255,.08)"
                }}
              >
                Equal Split
              </button>

              <button
                className="nexa-pill"
                onClick={() => setSplitType("item")}
                style={{
                  justifyContent: "center",
                  background: splitType === "item" ? "rgba(34,211,238,.22)" : "rgba(255,255,255,.08)"
                }}
              >
                Item Wise Split
              </button>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {checks.map((check) => {
                const active = selectedCheck === check.id;
                const grand = splitType === "equal" && check.equalAmount ? check.equalAmount : checkGrand(check);

                return (
                  <button
                    key={check.id}
                    onClick={() => setSelectedCheck(check.id)}
                    style={{
                      textAlign: "left",
                      padding: 14,
                      borderRadius: 20,
                      color: "white",
                      border: active ? "1px solid rgba(34,211,238,.6)" : "1px solid rgba(255,255,255,.12)",
                      background: active ? "rgba(34,211,238,.16)" : "rgba(255,255,255,.06)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <strong>{check.name}</strong>
                      <span style={{ color: "#a5f3fc", fontWeight: 950 }}>Rs {grand}</span>
                    </div>

                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8", fontSize: 13 }}>Portions</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                            decreasePortion(check.id);
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 10,
                            background: "rgba(255,255,255,.08)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          -
                        </span>
                        <strong>{check.portions}</strong>
                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                            increasePortion(check.id);
                          }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 10,
                            background: "rgba(255,255,255,.08)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          +
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.06)"
              }}
            >
              <h3 style={{ margin: 0 }}>Original Bill</h3>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <PriceLine label="Price" value={`Rs ${originalTotal}`} />
                <PriceLine label="Service Charges (5%)" value={`Rs ${originalService}`} />
                <PriceLine label="Grand Total" value={`Rs ${originalGrand}`} strong />
              </div>
            </div>
          </aside>

          <main
            style={{
              padding: 18,
              background: "rgba(15,23,42,.58)",
              overflowY: "auto"
            }}
          >
            <div className="nexa-row-between">
              <div>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 950 }}>
                  Original Bill Items
                </h2>
                <p className="nexa-section-sub">
                  Click + to add item portion to {activeCheck?.name}
                </p>
              </div>
              <div className="nexa-pill">Split Type: {splitType === "equal" ? "Equal" : "Item Wise"}</div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {tableSplitItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 22,
                    padding: 16,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.06)",
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 12,
                    alignItems: "center"
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0 }}>{item.name}</h3>
                    <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>
                      Original Qty: {item.qty} Â· Unit Price Rs {item.price}
                    </p>
                  </div>

                  <strong>Rs {item.price * item.qty}</strong>

                  <button
                    className="nexa-create-btn"
                    onClick={() => addItemToCheck(item)}
                    style={{ padding: "10px 14px" }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </main>

          <aside
            style={{
              borderLeft: "1px solid rgba(255,255,255,.1)",
              background: "rgba(2,6,23,.72)",
              padding: 16,
              overflowY: "auto"
            }}
          >
            <div
              style={{
                borderRadius: 24,
                padding: 16,
                border: "1px solid rgba(34,211,238,.25)",
                background: "rgba(34,211,238,.08)"
              }}
            >
              <h2 style={{ margin: 0 }}>
                Bill for {activeCheck?.name}
              </h2>
              <p className="nexa-small">
                Selected check preview
              </p>
            </div>

            {splitType === "equal" && activeCheck?.equalAmount ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 16,
                  borderRadius: 22,
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.12)"
                }}
              >
                <h3 style={{ marginTop: 0 }}>Equal Split Amount</h3>
                <div style={{ fontSize: 44, fontWeight: 950 }}>Rs {activeCheck.equalAmount}</div>
                <p className="nexa-small">Original bill divided into {checks.length} checks.</p>
              </div>
            ) : (
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {activeCheck?.items?.length ? (
                  activeCheck.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 18,
                        padding: 12,
                        border: "1px solid rgba(255,255,255,.12)",
                        background: "rgba(255,255,255,.06)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong>{item.name}</strong>
                        <button
                          className="nexa-logout"
                          onClick={() => removeItemFromCheck(item.id)}
                          style={{ padding: 8 }}
                        >
                          <Minus size={14} />
                        </button>
                      </div>

                      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                        <span>{item.splitQty} x Rs {item.price}</span>
                        <span>Rs {item.splitQty * item.price}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: 30 }}>
                    <ReceiptText size={46} />
                    <h3>No items in this check</h3>
                    <p>Add items from original bill.</p>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.06)"
              }}
            >
              {splitType === "equal" && activeCheck?.equalAmount ? (
                <>
                  <PriceLine label="Equal Amount" value={`Rs ${activeCheck.equalAmount}`} strong />
                  <PriceLine label="Payable" value={`Rs ${activeCheck.equalAmount}`} strong />
                </>
              ) : (
                <>
                  <PriceLine label="Price" value={`Rs ${checkSubtotal(activeCheck)}`} />
                  <PriceLine label="Service Charges (5%)" value={`Rs ${checkService(activeCheck)}`} />
                  <PriceLine label="Grand Total" value={`Rs ${checkGrand(activeCheck)}`} strong />
                </>
              )}
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                className="nexa-logout"
                onClick={() => alert(`Printing ${activeCheck?.name} bill.`)}
              >
                <Printer size={16} /> Print
              </button>

              <button
                className="nexa-create-btn"
                onClick={() => alert(`${activeCheck?.name} payment screen will be connected in next upgrade.`)}
              >
                Pay Check
              </button>
            </div>

            <button
              className="nexa-btn"
              style={{ marginTop: 12 }}
              onClick={() => alert("Split bill saved locally. Backend save will be connected later.")}
            >
              Save Split Bill
            </button>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}


