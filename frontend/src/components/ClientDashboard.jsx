import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const mainModes = [
  {
    number: 1,
    key: "walk_in",
    modeKey: "walk_in",
    name: "Walk In",
    subtitle: "Counter customer",
    icon: "🚶",
    bg: "linear-gradient(135deg,#18181b,#020617)",
    shadow: "rgba(15,23,42,.45)",
    animation: "walkAnim"
  },
  {
    number: 2,
    key: "take_away",
    modeKey: "take_away",
    name: "Take Away",
    subtitle: "Fast pickup order",
    icon: "🛍️",
    bg: "linear-gradient(135deg,#38bdf8,#2563eb)",
    shadow: "rgba(37,99,235,.38)",
    animation: "bagAnim"
  },
  {
    number: 3,
    key: "delivery",
    modeKey: "delivery",
    name: "Delivery",
    subtitle: "Rider dispatch",
    icon: "🛵",
    bg: "linear-gradient(135deg,#fde047,#f97316)",
    shadow: "rgba(249,115,22,.38)",
    animation: "deliveryAnim"
  },
  {
    number: 4,
    key: "dine_in",
    modeKey: "dine_in",
    name: "Dine In",
    subtitle: "Tables & waiter",
    icon: "🍽️",
    bg: "linear-gradient(135deg,#fb7185,#ef4444)",
    shadow: "rgba(239,68,68,.38)",
    animation: "dineAnim"
  },
  {
    number: 5,
    key: "drive_thru",
    modeKey: "drive_thru",
    name: "Drive Thru",
    subtitle: "Vehicle order",
    icon: "🚗",
    bg: "linear-gradient(135deg,#4ade80,#16a34a)",
    shadow: "rgba(22,163,74,.38)",
    animation: "driveAnim"
  },
  {
    number: 6,
    key: "kiosk",
    modeKey: "kiosk",
    name: "Kiosk",
    subtitle: "Self ordering",
    icon: "☝️",
    bg: "linear-gradient(135deg,#ffe4e6,#f9a8d4)",
    shadow: "rgba(244,114,182,.35)",
    animation: "tapAnim",
    dark: true
  }
];

const bottomModules = [
  { key: "orders", name: "Orders", icon: "📋", bg: "linear-gradient(135deg,#e5e7eb,#94a3b8)", dark: true },
  { key: "drive_thru_queue", name: "Dispatch", icon: "📍", bg: "linear-gradient(135deg,#22c55e,#06b6d4)", dark: true },
  { key: "staff", name: "Attendance", icon: "🕘", bg: "linear-gradient(135deg,#ec4899,#8b5cf6)" },
  { key: "staff", name: "Staff", icon: "👥", bg: "linear-gradient(135deg,#bae6fd,#60a5fa)", dark: true },
  { key: "staff", name: "Cashier", icon: "💳", bg: "linear-gradient(135deg,#ccfbf1,#2dd4bf)", dark: true },
  { key: "kds", name: "KDS", icon: "🖥️", bg: "linear-gradient(135deg,#94a3b8,#475569)" },
  { key: "analytics", name: "Reports", icon: "📈", bg: "linear-gradient(135deg,#ffffff,#c4b5fd)", dark: true },
  { key: "restaurant_settings", name: "Printer", icon: "🖨️", bg: "linear-gradient(135deg,#111827,#64748b)" },
  { key: "settings", name: "Menu", icon: "🍔", bg: "linear-gradient(135deg,#334155,#020617)" },
  { key: "restaurant_settings", name: "Settings", icon: "⚙️", bg: "linear-gradient(135deg,#1e293b,#0f172a)" },
  { key: "inventory", name: "Inventory", icon: "📦", bg: "linear-gradient(135deg,#f59e0b,#ea580c)" },
  { key: "discounts", name: "Discounts", icon: "🏷️", bg: "linear-gradient(135deg,#06b6d4,#7c3aed)" },
  { key: "customers", name: "Customers", icon: "🎁", bg: "linear-gradient(135deg,#22c55e,#15803d)" },
  { key: "expenses", name: "Expenses", icon: "💸", bg: "linear-gradient(135deg,#ef4444,#7f1d1d)" },
  { key: "supplier_purchases", name: "Suppliers", icon: "🚚", bg: "linear-gradient(135deg,#0ea5e9,#1d4ed8)" }
];

function formatMoney(value) {
  return `Rs ${Math.round(Number(value || 0)).toLocaleString()}`;
}

export default function ClientDashboard({ token, session, onOpenModule }) {
  const [clock, setClock] = useState(new Date());
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    activeTables: 0,
    pendingKitchenOrders: 0
  });
  const [demoSeeding, setDemoSeeding] = useState(false);
  const [demoStatus, setDemoStatus] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  async function loadStats() {
    try {
      const res = await api(token).get("/api/client/dashboard");
      setStats(res.data.stats || {});
    } catch {
      setStats({
        todaySales: 0,
        todayOrders: 0,
        activeTables: 0,
        pendingKitchenOrders: 0
      });
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function seedDemoData() {
    const ok = window.confirm(
      "This will refresh demo menu, staff, customers and tables for this restaurant. Continue?"
    );

    if (!ok) return;

    setDemoSeeding(true);
    setDemoStatus("Seeding demo data...");

    try {
      const res = await api(token).post("/api/demo-polish/seed");

      setDemoStatus(
        `Demo ready: ${res.data?.menuItems || 0} menu items, ${res.data?.staff || 0} staff, ${res.data?.customers || 0} customers, ${res.data?.tables || 0} tables.`
      );

      await loadStats();

      alert(
        res.data?.message ||
          "Demo data seeded successfully. Open Menu, Staff, Customers and Dine In to view demo content."
      );
    } catch (error) {
      setDemoStatus("Demo seed failed.");
      alert(
        error.response?.data?.message ||
          "Demo seed failed. Make sure backend demo-polish route is deployed on Render."
      );
    } finally {
      setDemoSeeding(false);
    }
  }

  const topStats = useMemo(
    () => [
      { label: "Today Sales", value: formatMoney(stats.todaySales), icon: "💰" },
      { label: "Orders", value: stats.todayOrders || 0, icon: "🧾" },
      { label: "Tables", value: stats.activeTables || 0, icon: "🍽️" },
      { label: "Kitchen", value: stats.pendingKitchenOrders || 0, icon: "👨‍🍳" }
    ],
    [stats]
  );

  function openModule(item) {
    const key = item.key;
    const sellingModes = ["walk_in", "take_away", "delivery", "drive_thru", "kiosk"];

    if (key === "dine_in") {
      onOpenModule({
        key: "dine_in",
        modeKey: "dine_in",
        name: "Dine In",
        description: "Dine In tables"
      });
      return;
    }

    if (sellingModes.includes(key)) {
      onOpenModule({
        key,
        modeKey: key,
        name: item.name,
        description: item.subtitle || `${item.name} POS mode`
      });
      return;
    }

    onOpenModule({
      key,
      name: item.name,
      description: item.subtitle || `${item.name} module`
    });
  }

  return (
    <div className="nexa-epos-dashboard">
      <style>
        {`
          .nexa-epos-dashboard {
            height: calc(100vh - 94px);
            min-height: 0;
            position: relative;
            overflow: hidden;
            padding: 10px 18px 10px;
            display: grid;
            grid-template-rows: 92px 58px minmax(0, 1fr) 96px;
            gap: 9px;
            background:
              radial-gradient(circle at 12% 22%, rgba(88,28,135,.95), transparent 30%),
              radial-gradient(circle at 86% 18%, rgba(236,72,153,.74), transparent 34%),
              radial-gradient(circle at 52% 72%, rgba(79,70,229,.72), transparent 40%),
              linear-gradient(135deg,#4c1d95 0%, #7e22ce 35%, #db2777 68%, #4c1d95 100%);
            color: white;
          }

          .nexa-epos-dashboard::before {
            content: "";
            position: absolute;
            inset: 0;
            background:
              linear-gradient(126deg, transparent 0 18%, rgba(255,255,255,.12) 19% 24%, transparent 25% 100%),
              linear-gradient(38deg, transparent 0 42%, rgba(255,255,255,.08) 43% 49%, transparent 50% 100%);
            pointer-events: none;
          }

          .epos-top {
            position: relative;
            z-index: 2;
            display: grid;
            grid-template-columns: 285px minmax(360px, 1fr) 350px;
            gap: 10px;
            align-items: stretch;
            min-height: 0;
          }

          .epos-glass {
            border-radius: 22px;
            background: rgba(15,23,42,.25);
            border: 1px solid rgba(255,255,255,.13);
            backdrop-filter: blur(18px);
            box-shadow: 0 18px 42px rgba(0,0,0,.18);
          }

          .sync-card {
            display: grid;
            grid-template-columns: 70px 1fr;
            overflow: hidden;
            min-height: 0;
          }

          .sync-left {
            background: rgba(255,255,255,.94);
            color: #15803d;
            display: grid;
            place-items: center;
            text-align: center;
            font-weight: 950;
            font-size: 11px;
          }

          .sync-right {
            padding: 12px 14px;
            display: grid;
            align-content: center;
          }

          .sync-time {
            font-size: 28px;
            font-weight: 1000;
            line-height: 1;
            text-shadow: 0 5px 12px rgba(0,0,0,.38);
          }

          .sync-date {
            margin-top: 7px;
            font-size: 16px;
            font-weight: 850;
            opacity: .96;
          }

          .welcome-panel {
            padding: 10px 14px;
            text-align: center;
            display: grid;
            align-content: center;
            min-height: 0;
          }

          .welcome-kicker {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            justify-self: center;
            padding: 5px 10px;
            border-radius: 999px;
            background: rgba(255,255,255,.13);
            border: 1px solid rgba(255,255,255,.12);
            font-size: 11px;
            font-weight: 900;
            margin-bottom: 6px;
          }

          .welcome-title {
            margin: 0;
            font-size: 30px;
            font-weight: 1000;
            letter-spacing: -.055em;
            line-height: .96;
            text-shadow: 0 7px 18px rgba(0,0,0,.32);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .stats-strip {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
            margin-top: 9px;
          }

          .stat-chip {
            border-radius: 14px;
            padding: 7px 8px;
            background: rgba(255,255,255,.105);
            border: 1px solid rgba(255,255,255,.105);
            text-align: left;
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 6px;
            align-items: center;
            min-width: 0;
          }

          .stat-label {
            margin: 0;
            color: rgba(255,255,255,.70);
            font-size: 9.5px;
            font-weight: 800;
            white-space: nowrap;
          }

          .stat-value {
            margin: 2px 0 0;
            font-weight: 1000;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .user-panel {
            display: grid;
            grid-template-columns: 46px 1fr 46px;
            align-items: center;
            gap: 9px;
            padding: 11px;
            min-height: 0;
          }

          .user-avatar,
          .notify-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 0;
            display: grid;
            place-items: center;
            background: rgba(255,255,255,.96);
            font-size: 23px;
            position: relative;
          }

          .notify-btn {
            cursor: pointer;
          }

          .notify-dot {
            position: absolute;
            top: -3px;
            right: -3px;
            width: 20px;
            height: 20px;
            border-radius: 999px;
            background: #ef4444;
            color: white;
            display: grid;
            place-items: center;
            font-size: 10px;
            font-weight: 950;
          }

          .user-name {
            font-weight: 1000;
            margin-bottom: 6px;
            text-shadow: 0 4px 10px rgba(0,0,0,.22);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .branch-select {
            width: 100%;
            height: 36px;
            border-radius: 13px;
            border: 1px solid rgba(255,255,255,.15);
            background: rgba(255,255,255,.16);
            color: white;
            padding: 0 10px;
            outline: none;
            font-weight: 850;
            font-size: 12px;
          }

          .branch-select option {
            color: #111827;
          }

          .demo-control-panel {
            position: relative;
            z-index: 2;
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 10px;
            align-items: center;
            padding: 9px 12px;
            border-radius: 20px;
            background:
              radial-gradient(circle at top left, rgba(250,204,21,.16), transparent 32%),
              rgba(15,23,42,.25);
            border: 1px solid rgba(255,255,255,.13);
            backdrop-filter: blur(18px);
            box-shadow: 0 16px 38px rgba(0,0,0,.14);
            min-height: 0;
            overflow: hidden;
          }

          .demo-control-panel h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 1000;
          }

          .demo-control-panel p {
            margin: 3px 0 0;
            color: rgba(255,255,255,.74);
            font-size: 11.5px;
            font-weight: 750;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .demo-status {
            margin-top: 3px;
            color: #fde68a;
            font-size: 10.5px;
            font-weight: 850;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .demo-seed-btn {
            min-height: 39px;
            border: 0;
            border-radius: 14px;
            background: linear-gradient(135deg,#facc15,#f97316);
            color: #111827;
            font-weight: 1000;
            cursor: pointer;
            padding: 0 14px;
            box-shadow: 0 12px 26px rgba(249,115,22,.25);
            transition: .18s ease;
            white-space: nowrap;
            font-size: 12px;
          }

          .demo-seed-btn:hover {
            transform: translateY(-2px);
            filter: brightness(1.05);
          }

          .demo-seed-btn:disabled {
            opacity: .65;
            cursor: not-allowed;
            transform: none;
          }

          .epos-center {
            position: relative;
            z-index: 2;
            display: grid;
            place-items: center;
            min-height: 0;
            overflow: hidden;
          }

          .main-mode-grid {
            width: min(840px, 100%);
            display: grid;
            grid-template-columns: repeat(3, minmax(160px, 1fr));
            gap: 13px 34px;
            justify-items: center;
            align-items: center;
          }

          .mode-tile-wrap {
            display: grid;
            justify-items: center;
            position: relative;
            min-width: 0;
          }

          .mode-tile {
            width: 178px;
            height: 118px;
            border: 0;
            border-radius: 23px;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            color: white;
            box-shadow: 0 18px 38px var(--tile-shadow);
            transition: .22s ease;
          }

          .mode-tile:hover {
            transform: translateY(-7px) scale(1.022);
            filter: brightness(1.06);
          }

          .mode-tile::before {
            content: "";
            position: absolute;
            inset: 0;
            background:
              radial-gradient(circle at 72% 18%, rgba(255,255,255,.23), transparent 30%),
              linear-gradient(180deg, rgba(255,255,255,.13), transparent 58%, rgba(255,255,255,.07));
            pointer-events: none;
          }

          .mode-number {
            position: absolute;
            top: 9px;
            left: 10px;
            width: 28px;
            height: 28px;
            border-radius: 10px;
            background: rgba(255,255,255,.92);
            color: #4c1d95;
            display: grid;
            place-items: center;
            font-weight: 1000;
            font-size: 13px;
            z-index: 4;
          }

          .mode-icon {
            height: 100%;
            display: grid;
            place-items: center;
            font-size: 63px;
            position: relative;
            z-index: 2;
          }

          .mode-dark .mode-icon {
            color: #111827;
          }

          .mode-name {
            margin-top: 7px;
            font-size: 18px;
            font-weight: 1000;
            text-shadow: 0 5px 12px rgba(0,0,0,.55);
            line-height: 1;
          }

          .mode-subtitle {
            margin-top: 2px;
            font-size: 10.5px;
            font-weight: 850;
            color: rgba(255,255,255,.78);
            text-shadow: 0 4px 8px rgba(0,0,0,.35);
            line-height: 1;
          }

          .walkAnim { animation: walkAnim 1.05s ease-in-out infinite; }
          .bagAnim { animation: bagAnim 1.35s ease-in-out infinite; }
          .deliveryAnim { animation: deliveryAnim 1.2s ease-in-out infinite; }
          .dineAnim { animation: dineAnim 1.6s ease-in-out infinite; }
          .driveAnim { animation: driveAnim 1.15s ease-in-out infinite; }
          .tapAnim { animation: tapAnim 1.15s ease-in-out infinite; }

          @keyframes walkAnim {
            0%,100% { transform: translateX(0) rotate(0deg); }
            25% { transform: translateX(-5px) rotate(-5deg); }
            50% { transform: translateX(5px) rotate(4deg); }
            75% { transform: translateX(-2px) rotate(-3deg); }
          }

          @keyframes bagAnim {
            0%,100% { transform: translateY(0) rotate(0deg); }
            35% { transform: translateY(-5px) rotate(-7deg); }
            70% { transform: translateY(0) rotate(6deg); }
          }

          @keyframes deliveryAnim {
            0%,100% { transform: translateX(0); }
            45% { transform: translateX(8px); }
            75% { transform: translateX(-4px); }
          }

          @keyframes dineAnim {
            0%,100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }

          @keyframes driveAnim {
            0%,100% { transform: translateX(0); }
            30% { transform: translateX(8px); }
            65% { transform: translateX(-4px); }
          }

          @keyframes tapAnim {
            0%,100% { transform: scale(1) translateY(0); }
            40% { transform: scale(1.08) translateY(-5px); }
            75% { transform: scale(.98) translateY(0); }
          }

          .bottom-dock-zone {
            position: relative;
            z-index: 2;
            border-radius: 22px;
            background: rgba(15,23,42,.18);
            border: 1px solid rgba(255,255,255,.08);
            padding: 7px 10px 6px;
            backdrop-filter: blur(12px);
            overflow: hidden;
            min-height: 0;
          }

          .dock-scroll {
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            overflow: hidden;
          }

          .dock-item {
            width: 68px;
            border: 0;
            background: transparent;
            color: white;
            display: grid;
            justify-items: center;
            gap: 4px;
            cursor: pointer;
            transition: .18s ease;
            padding: 0;
          }

          .dock-item:hover {
            transform: translateY(-5px) scale(1.035);
          }

          .dock-icon {
            width: 45px;
            height: 45px;
            border-radius: 14px;
            display: grid;
            place-items: center;
            font-size: 24px;
            box-shadow: 0 13px 22px rgba(0,0,0,.16);
            border: 1px solid rgba(255,255,255,.22);
          }

          .dock-label {
            font-size: 10.5px;
            font-weight: 950;
            line-height: 1.05;
            text-shadow: 0 4px 10px rgba(0,0,0,.55);
            white-space: nowrap;
          }

          @media (max-height: 760px) {
            .nexa-epos-dashboard {
              height: calc(100vh - 88px);
              grid-template-rows: 84px 52px minmax(0, 1fr) 86px;
              gap: 7px;
              padding: 8px 14px 8px;
            }

            .epos-top {
              grid-template-columns: 250px minmax(330px, 1fr) 320px;
              gap: 8px;
            }

            .sync-card {
              grid-template-columns: 62px 1fr;
            }

            .sync-time {
              font-size: 24px;
            }

            .sync-date {
              font-size: 13px;
            }

            .welcome-title {
              font-size: 25px;
            }

            .stats-strip {
              margin-top: 7px;
            }

            .stat-chip {
              padding: 6px 7px;
            }

            .stat-label {
              font-size: 9px;
            }

            .stat-value {
              font-size: 12px;
            }

            .demo-control-panel h2 {
              font-size: 14px;
            }

            .demo-control-panel p {
              font-size: 10.5px;
            }

            .demo-seed-btn {
              min-height: 34px;
              font-size: 11px;
            }

            .main-mode-grid {
              width: min(760px, 100%);
              gap: 10px 28px;
              grid-template-columns: repeat(3, minmax(145px, 1fr));
            }

            .mode-tile {
              width: 158px;
              height: 102px;
              border-radius: 20px;
            }

            .mode-icon {
              font-size: 54px;
            }

            .mode-name {
              font-size: 16px;
              margin-top: 6px;
            }

            .mode-subtitle {
              font-size: 10px;
            }

            .dock-item {
              width: 62px;
            }

            .dock-icon {
              width: 39px;
              height: 39px;
              border-radius: 12px;
              font-size: 21px;
            }

            .dock-label {
              font-size: 9.5px;
            }
          }

          @media (max-width: 1280px) {
            .epos-top {
              grid-template-columns: 230px minmax(320px, 1fr) 280px;
            }

            .welcome-title {
              font-size: 24px;
            }

            .main-mode-grid {
              width: min(740px, 100%);
              gap: 10px 22px;
            }

            .mode-tile {
              width: 156px;
              height: 104px;
            }

            .mode-icon {
              font-size: 54px;
            }

            .dock-item {
              width: 60px;
            }

            .dock-icon {
              width: 38px;
              height: 38px;
              font-size: 20px;
            }

            .dock-label {
              font-size: 9px;
            }
          }

          @media (max-width: 980px) {
            .nexa-epos-dashboard {
              height: auto;
              min-height: calc(100vh - 94px);
              overflow-y: auto;
              grid-template-rows: auto auto auto auto;
            }

            .epos-top {
              grid-template-columns: 1fr;
            }

            .demo-control-panel {
              grid-template-columns: 1fr;
            }

            .demo-control-panel p,
            .demo-status,
            .welcome-title {
              white-space: normal;
            }

            .main-mode-grid {
              grid-template-columns: repeat(2, minmax(160px, 1fr));
              width: 100%;
              gap: 22px 18px;
            }

            .mode-tile {
              width: min(210px, 100%);
              height: 132px;
            }

            .mode-icon {
              font-size: 68px;
            }

            .bottom-dock-zone {
              overflow: visible;
            }

            .dock-scroll {
              overflow: visible;
            }
          }

          @media (max-width: 760px) {
            .nexa-epos-dashboard {
              padding: 12px;
            }

            .stats-strip {
              grid-template-columns: 1fr 1fr;
            }

            .main-mode-grid {
              grid-template-columns: 1fr;
            }

            .mode-tile {
              width: min(286px, 100%);
              height: 150px;
            }

            .dock-item {
              width: 76px;
            }

            .dock-icon {
              width: 52px;
              height: 52px;
              font-size: 27px;
            }
          }
        `}
      </style>

      <section className="epos-top">
        <div className="epos-glass sync-card">
          <div className="sync-left">
            <div>
              <div style={{ fontSize: 29 }}>📡</div>
              <div>Connected</div>
              <div>0</div>
            </div>
          </div>

          <div className="sync-right">
            <div className="sync-time">
              {clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="sync-date">
              {clock.toLocaleDateString([], {
                weekday: "long",
                month: "short",
                day: "numeric"
              })}
            </div>
          </div>
        </div>

        <div className="epos-glass welcome-panel">
          <div className="welcome-kicker">⚡ NexaPOS Pro Command Center</div>
          <h1 className="welcome-title">
            Welcome {session?.tenant?.restaurantName || session?.user?.username || "Restaurant"}
          </h1>

          <div className="stats-strip">
            {topStats.map((item) => (
              <div className="stat-chip" key={item.label}>
                <div>{item.icon}</div>
                <div>
                  <p className="stat-label">{item.label}</p>
                  <p className="stat-value">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="epos-glass user-panel">
          <div className="user-avatar">👤</div>

          <div>
            <div className="user-name">{session?.user?.username || "Client User"}</div>
            <select className="branch-select" defaultValue="main">
              <option value="main">{session?.tenant?.restaurantName || "Main Branch"}</option>
              <option value="branch2">Branch 2</option>
              <option value="branch3">Branch 3</option>
            </select>
          </div>

          <button className="notify-btn" type="button">
            🔔
            <span className="notify-dot">1</span>
          </button>
        </div>
      </section>

      <section className="demo-control-panel">
        <div>
          <h2>Demo Control Center</h2>
          <p>
            One click fills this restaurant with demo menu items, customers, staff members,
            riders, waiters, and editable dine-in tables.
          </p>
          {demoStatus ? <div className="demo-status">{demoStatus}</div> : null}
        </div>

        <button className="demo-seed-btn" type="button" onClick={seedDemoData} disabled={demoSeeding}>
          {demoSeeding ? "Seeding..." : "✨ Seed Demo Data"}
        </button>
      </section>

      <main className="epos-center">
        <div className="main-mode-grid">
          {mainModes.map((mode) => (
            <div className="mode-tile-wrap" key={mode.key}>
              <button
                type="button"
                className={`mode-tile ${mode.dark ? "mode-dark" : ""}`}
                style={{
                  background: mode.bg,
                  "--tile-shadow": mode.shadow
                }}
                onClick={() => openModule(mode)}
              >
                <div className="mode-number">{mode.number}</div>
                <div className={`mode-icon ${mode.animation}`}>{mode.icon}</div>
              </button>

              <div className="mode-name">{mode.name}</div>
              <div className="mode-subtitle">{mode.subtitle}</div>
            </div>
          ))}
        </div>
      </main>

      <section className="bottom-dock-zone">
        <div className="dock-scroll">
          {bottomModules.map((item) => (
            <button
              key={`${item.key}-${item.name}`}
              type="button"
              className="dock-item"
              onClick={() => openModule(item)}
            >
              <div
                className="dock-icon"
                style={{
                  background: item.bg,
                  color: item.dark ? "#111827" : "#ffffff"
                }}
              >
                {item.icon}
              </div>
              <div className="dock-label">{item.name}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}