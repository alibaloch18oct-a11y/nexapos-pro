import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  CreditCard,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { api } from "../lib/api";

const emptyRenew = {
  tenantId: "",
  months: "1",
  amount: "",
  paymentMethod: "Cash",
  billingCycle: "monthly",
  note: ""
};

const emptyStatus = {
  tenantId: "",
  paymentStatus: "paid",
  subscriptionStatus: "active",
  expiryDate: "",
  note: ""
};

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="nexa-field">
      <span className="nexa-label">{label}</span>
      <div className="nexa-input-wrap">
        <input
          className="nexa-input"
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
        />
      </div>
    </label>
  );
}

function statusColor(client) {
  if (client.isExpired) return "#fca5a5";
  if (client.isExpiringSoon) return "#fde68a";
  if (client.paymentStatus === "paid") return "#86efac";
  if (client.paymentStatus === "trial") return "#a5f3fc";
  return "#fca5a5";
}

function ClientSubscriptionCard({ client, active, onSelectRenew, onSelectStatus }) {
  const color = statusColor(client);

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
          <h3 style={{ margin: 0 }}>{client.restaurantName}</h3>
          <p className="nexa-small">Owner: {client.ownerName}</p>
          <p className="nexa-small">Package: {client.packageName || "Custom"}</p>
        </div>

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 17,
            background: client.isExpired ? "rgba(239,68,68,.16)" : "rgba(34,211,238,.14)",
            display: "grid",
            placeItems: "center",
            color
          }}
        >
          {client.isExpired ? <ShieldAlert size={23} /> : <ShieldCheck size={23} />}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <div className="nexa-pill" style={{ color }}>
          {client.subscriptionStatus || "active"}
        </div>
        <div className="nexa-pill" style={{ color }}>
          {client.paymentStatus || "unpaid"}
        </div>
        <div className="nexa-pill">
          <CalendarClock size={14} /> {client.expiryDate || "No expiry"}
        </div>
        <div className="nexa-pill">
          <Clock3 size={14} /> {client.daysLeft === null ? "No limit" : `${client.daysLeft} days`}
        </div>
      </div>

      {client.isExpired ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 16,
            background: "rgba(239,68,68,.13)",
            border: "1px solid rgba(239,68,68,.22)",
            color: "#fecaca",
            fontWeight: 900
          }}
        >
          Account locked because subscription expired.
        </div>
      ) : client.isExpiringSoon ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 16,
            background: "rgba(250,204,21,.12)",
            border: "1px solid rgba(250,204,21,.22)",
            color: "#fde68a",
            fontWeight: 900
          }}
        >
          Renewal reminder: subscription expires soon.
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <button className="nexa-create-btn" type="button" onClick={() => onSelectRenew(client)}>
          <CreditCard size={15} /> Renew
        </button>
        <button className="nexa-logout" type="button" onClick={() => onSelectStatus(client)}>
          <Save size={15} /> Status
        </button>
      </div>
    </div>
  );
}

export default function SubscriptionPanel({ token, onBack }) {
  const [overview, setOverview] = useState({
    stats: {
      totalClients: 0,
      activeClients: 0,
      expiredClients: 0,
      expiringSoon: 0,
      paidClients: 0,
      unpaidClients: 0,
      overdueClients: 0
    },
    clients: []
  });
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [renewForm, setRenewForm] = useState(emptyRenew);
  const [statusForm, setStatusForm] = useState(emptyStatus);
  const [savingRenew, setSavingRenew] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const clients = overview.clients || [];
  const stats = overview.stats || {};

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const query = search.toLowerCase();

      const bySearch =
        !search ||
        client.restaurantName.toLowerCase().includes(query) ||
        client.ownerName.toLowerCase().includes(query) ||
        String(client.packageName || "").toLowerCase().includes(query) ||
        String(client.paymentStatus || "").toLowerCase().includes(query);

      const byFilter =
        filter === "all" ||
        (filter === "expired" && client.isExpired) ||
        (filter === "expiring" && client.isExpiringSoon) ||
        client.paymentStatus === filter ||
        client.subscriptionStatus === filter;

      return bySearch && byFilter;
    });
  }, [clients, search, filter]);

  async function loadData() {
    try {
      const [overviewRes, paymentRes] = await Promise.all([
        api(token).get("/api/subscriptions/overview"),
        api(token).get("/api/subscriptions/payments")
      ]);

      setOverview(overviewRes.data || overview);
      setPayments(paymentRes.data.payments || []);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load subscription data.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function selectRenew(client) {
    const defaultAmount =
      client.billingCycle === "yearly"
        ? client.packageYearlyPrice || ""
        : client.packageMonthlyPrice || "";

    setRenewForm({
      tenantId: client.id,
      months: client.billingCycle === "yearly" ? "12" : "1",
      amount: String(defaultAmount || ""),
      paymentMethod: client.lastPaymentMethod || "Cash",
      billingCycle: client.billingCycle || "monthly",
      note: ""
    });
  }

  function selectStatus(client) {
    setStatusForm({
      tenantId: client.id,
      paymentStatus: client.paymentStatus || "paid",
      subscriptionStatus: client.subscriptionStatus || "active",
      expiryDate: client.expiryDate || "",
      note: client.subscriptionNote || ""
    });
  }

  function setRenewValue(key, value) {
    setRenewForm((prev) => ({ ...prev, [key]: value }));
  }

  function setStatusValue(key, value) {
    setStatusForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitRenew(e) {
    e.preventDefault();

    if (!renewForm.tenantId) {
      alert("Select a client first.");
      return;
    }

    setSavingRenew(true);

    try {
      const res = await api(token).post(`/api/subscriptions/client/${renewForm.tenantId}/renew`, {
        months: Number(renewForm.months || 1),
        amount: Number(renewForm.amount || 0),
        paymentMethod: renewForm.paymentMethod,
        billingCycle: renewForm.billingCycle,
        note: renewForm.note
      });

      alert(res.data.message || "Client renewed.");

      setRenewForm(emptyRenew);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to renew client.");
    } finally {
      setSavingRenew(false);
    }
  }

  async function submitStatus(e) {
    e.preventDefault();

    if (!statusForm.tenantId) {
      alert("Select a client first.");
      return;
    }

    setSavingStatus(true);

    try {
      const res = await api(token).patch(`/api/subscriptions/client/${statusForm.tenantId}/status`, {
        paymentStatus: statusForm.paymentStatus,
        subscriptionStatus: statusForm.subscriptionStatus,
        expiryDate: statusForm.expiryDate,
        note: statusForm.note
      });

      alert(res.data.message || "Status updated.");

      setStatusForm(emptyStatus);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update subscription status.");
    } finally {
      setSavingStatus(false);
    }
  }

  const selectedRenewClient = clients.find((client) => client.id === renewForm.tenantId);
  const selectedStatusClient = clients.find((client) => client.id === statusForm.tenantId);

  return (
    <div style={{ minHeight: "100vh", padding: 18 }}>
      <div className="nexa-row-between">
        <div>
          <button className="nexa-logout" onClick={onBack}>
            <ChevronLeft size={18} /> Back
          </button>
          <h1 className="nexa-section-title" style={{ marginTop: 16 }}>
            Subscription & Renewal Control
          </h1>
          <p className="nexa-section-sub">
            Lock expired clients, renew packages, track payments and monitor expiry reminders.
          </p>
        </div>

        <button className="nexa-create-btn" onClick={loadData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="nexa-stats">
        {[
          ["Total Clients", stats.totalClients || 0, ShieldCheck],
          ["Active", stats.activeClients || 0, CheckCircle2],
          ["Expired", stats.expiredClients || 0, ShieldAlert],
          ["Expiring Soon", stats.expiringSoon || 0, CalendarClock],
          ["Paid", stats.paidClients || 0, BadgeDollarSign],
          ["Unpaid", stats.unpaidClients || 0, XCircle]
        ].map(([label, value, Icon]) => (
          <div className="nexa-stat-card" key={label}>
            <Icon color="#d8b4fe" size={30} />
            <p className="nexa-stat-label">{label}</p>
            <p className="nexa-stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 14 }}>
        <main className="nexa-panel">
          <div className="nexa-row-between">
            <div>
              <h2 style={{ margin: 0 }}>Client Subscriptions</h2>
              <p className="nexa-section-sub">{filteredClients.length} clients showing</p>
            </div>

            <div className="nexa-input-wrap" style={{ minWidth: 280 }}>
              <Search size={16} color="#a5f3fc" />
              <input
                className="nexa-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client..."
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
            {["all", "paid", "unpaid", "trial", "overdue", "expired", "expiring", "active", "paused"].map((item) => (
              <button
                key={item}
                className="nexa-pill"
                onClick={() => setFilter(item)}
                style={{
                  background: filter === item ? "rgba(34,211,238,.20)" : "rgba(255,255,255,.08)"
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 12 }}>
            {filteredClients.map((client) => (
              <ClientSubscriptionCard
                key={client.id}
                client={client}
                active={renewForm.tenantId === client.id || statusForm.tenantId === client.id}
                onSelectRenew={selectRenew}
                onSelectStatus={selectStatus}
              />
            ))}
          </div>
        </main>

        <aside style={{ display: "grid", gap: 14, alignSelf: "start", position: "sticky", top: 14 }}>
          <section className="nexa-panel">
            <h2 style={{ marginTop: 0 }}>Renew Client</h2>
            <p className="nexa-section-sub">
              {selectedRenewClient ? `Renewing: ${selectedRenewClient.restaurantName}` : "Select a client and click Renew."}
            </p>

            <form onSubmit={submitRenew}>
              <Field label="Months" type="number" value={renewForm.months} onChange={(v) => setRenewValue("months", v)} />
              <Field label="Amount" type="number" value={renewForm.amount} onChange={(v) => setRenewValue("amount", v)} />

              <label className="nexa-field">
                <span className="nexa-label">Payment Method</span>
                <div className="nexa-input-wrap">
                  <select
                    className="nexa-input"
                    value={renewForm.paymentMethod}
                    onChange={(e) => setRenewValue("paymentMethod", e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Easypaisa">Easypaisa</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </label>

              <label className="nexa-field">
                <span className="nexa-label">Billing Cycle</span>
                <div className="nexa-input-wrap">
                  <select
                    className="nexa-input"
                    value={renewForm.billingCycle}
                    onChange={(e) => setRenewValue("billingCycle", e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="trial">Trial</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
              </label>

              <Field label="Note" value={renewForm.note} onChange={(v) => setRenewValue("note", v)} />

              <button className="nexa-create-btn" disabled={savingRenew} style={{ width: "100%", marginTop: 14 }}>
                <CreditCard size={16} />
                {savingRenew ? "Renewing..." : "Renew Subscription"}
              </button>
            </form>
          </section>

          <section className="nexa-panel">
            <h2 style={{ marginTop: 0 }}>Manual Status</h2>
            <p className="nexa-section-sub">
              {selectedStatusClient ? `Editing: ${selectedStatusClient.restaurantName}` : "Select a client and click Status."}
            </p>

            <form onSubmit={submitStatus}>
              <label className="nexa-field">
                <span className="nexa-label">Payment Status</span>
                <div className="nexa-input-wrap">
                  <select
                    className="nexa-input"
                    value={statusForm.paymentStatus}
                    onChange={(e) => setStatusValue("paymentStatus", e.target.value)}
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="trial">Trial</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </label>

              <label className="nexa-field">
                <span className="nexa-label">Subscription Status</span>
                <div className="nexa-input-wrap">
                  <select
                    className="nexa-input"
                    value={statusForm.subscriptionStatus}
                    onChange={(e) => setStatusValue("subscriptionStatus", e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </label>

              <Field label="Expiry Date" type="date" value={statusForm.expiryDate} onChange={(v) => setStatusValue("expiryDate", v)} />
              <Field label="Note" value={statusForm.note} onChange={(v) => setStatusValue("note", v)} />

              <button className="nexa-logout" disabled={savingStatus} style={{ width: "100%", marginTop: 14 }}>
                <Save size={16} />
                {savingStatus ? "Saving..." : "Update Status"}
              </button>
            </form>
          </section>

          <section className="nexa-panel">
            <h2 style={{ marginTop: 0 }}>Payment History</h2>

            <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto" }}>
              {payments.length === 0 ? (
                <p className="nexa-section-sub">No subscription payments yet.</p>
              ) : (
                payments.slice(0, 20).map((payment) => (
                  <div
                    key={payment.id}
                    style={{
                      borderRadius: 16,
                      padding: 10,
                      border: "1px solid rgba(255,255,255,.10)",
                      background: "rgba(255,255,255,.055)"
                    }}
                  >
                    <strong>{payment.restaurantName}</strong>
                    <p className="nexa-small">
                      Rs {payment.amount}  -  {payment.months} months  -  {payment.paymentMethod}
                    </p>
                    <p className="nexa-small">Expiry: {payment.expiryDate}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}




