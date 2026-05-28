import React, { useState } from "react";
import {
  ShieldCheck,
  Wifi,
  Utensils,
  ShoppingBag,
  Bike,
  ChefHat,
  Eye,
  EyeOff,
  Lock,
  User,
  Sparkles
} from "lucide-react";
import { api } from "../lib/api";

const loginEndpoints = ["/api/auth/login", "/api/login", "/auth/login"];

const featureCards = [
  {
    title: "Dine In",
    subtitle: "Tables, waiters, split bill",
    icon: Utensils,
    bg: "linear-gradient(135deg, rgba(244,63,94,.18), rgba(239,68,68,.08))"
  },
  {
    title: "Take Away",
    subtitle: "Fast pickup token flow",
    icon: ShoppingBag,
    bg: "linear-gradient(135deg, rgba(14,165,233,.20), rgba(37,99,235,.08))"
  },
  {
    title: "Delivery",
    subtitle: "Rider + COD workflow",
    icon: Bike,
    bg: "linear-gradient(135deg, rgba(250,204,21,.20), rgba(249,115,22,.08))"
  },
  {
    title: "KDS / KOS",
    subtitle: "Kitchen auto timers",
    icon: ChefHat,
    bg: "linear-gradient(135deg, rgba(34,197,94,.18), rgba(16,185,129,.08))"
  }
];

function normalizeLoginResponse(data) {
  const token = data?.token || data?.accessToken || data?.jwt;

  if (!token) {
    throw new Error("Login successful but token was not returned by backend.");
  }

  return {
    ...data,
    token,
    user: data.user || data.account || data.profile || data,
    tenant: data.tenant || data.restaurant || data.business || null
  };
}

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("superadmin");
  const [password, setPassword] = useState("superadmin123");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState("super");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function tryLogin(payload) {
    let lastError = null;

    for (const endpoint of loginEndpoints) {
      try {
        const res = await api().post(endpoint, payload);
        return normalizeLoginResponse(res.data);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Enter username and password.");
      return;
    }

    setLoading(true);

    try {
      const data = await tryLogin({
        username: username.trim(),
        email: username.trim(),
        password
      });

      localStorage.setItem("nexapos_token", data.token);
      onLogin(data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Login failed. Check backend is running and credentials are correct."
      );
    } finally {
      setLoading(false);
    }
  }

  function useSuperDemo() {
    setMode("super");
    setUsername("superadmin");
    setPassword("superadmin123");
  }

  function useClientDemo() {
    setMode("client");
    setUsername("demo");
    setPassword("demo123");
  }

  return (
    <div className="login-pro-page">
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
          }

          .login-pro-page {
            min-height: 100vh;
            width: 100%;
            overflow-y: auto;
            color: white;
            background:
              radial-gradient(circle at 12% 12%, rgba(34,211,238,.18), transparent 28%),
              radial-gradient(circle at 82% 14%, rgba(168,85,247,.20), transparent 30%),
              radial-gradient(circle at 55% 82%, rgba(37,99,235,.12), transparent 34%),
              linear-gradient(135deg, #020617 0%, #07111f 42%, #111827 100%);
            padding: 28px;
            display: grid;
            place-items: center;
          }

          .login-pro-shell {
            width: min(1180px, 100%);
            min-height: min(720px, calc(100vh - 56px));
            display: grid;
            grid-template-columns: minmax(0, 1.05fr) 430px;
            gap: 24px;
            align-items: stretch;
          }

          .login-hero {
            position: relative;
            overflow: hidden;
            border-radius: 34px;
            padding: 34px;
            background:
              radial-gradient(circle at 20% 22%, rgba(34,211,238,.15), transparent 28%),
              radial-gradient(circle at 76% 20%, rgba(168,85,247,.16), transparent 31%),
              rgba(15,23,42,.72);
            border: 1px solid rgba(255,255,255,.10);
            box-shadow: 0 30px 90px rgba(0,0,0,.34);
            display: grid;
            grid-template-rows: auto 1fr auto;
          }

          .login-hero::before {
            content: "";
            position: absolute;
            inset: 0;
            background:
              linear-gradient(125deg, transparent 0 20%, rgba(255,255,255,.08) 21% 26%, transparent 27% 100%),
              linear-gradient(35deg, transparent 0 48%, rgba(255,255,255,.06) 49% 54%, transparent 55% 100%);
            pointer-events: none;
          }

          .login-badge {
            position: relative;
            z-index: 2;
            width: fit-content;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            border-radius: 999px;
            background: rgba(34,211,238,.14);
            border: 1px solid rgba(34,211,238,.30);
            color: #a5f3fc;
            font-weight: 950;
          }

          .login-title {
            position: relative;
            z-index: 2;
            margin: 28px 0 14px;
            max-width: 720px;
            font-size: clamp(42px, 5vw, 72px);
            line-height: .95;
            letter-spacing: -.07em;
            font-weight: 1000;
          }

          .login-title span {
            background: linear-gradient(135deg, #ffffff, #a5f3fc, #bfdbfe);
            -webkit-background-clip: text;
            color: transparent;
          }

          .login-subtitle {
            position: relative;
            z-index: 2;
            max-width: 760px;
            margin: 0;
            color: #94a3b8;
            font-size: 18px;
            line-height: 1.55;
            font-weight: 750;
          }

          .login-feature-grid {
            position: relative;
            z-index: 2;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            align-self: center;
            margin: 28px 0;
          }

          .login-feature-card {
            min-height: 128px;
            border-radius: 24px;
            padding: 18px;
            border: 1px solid rgba(255,255,255,.10);
            background: rgba(255,255,255,.055);
            display: grid;
            grid-template-columns: 58px 1fr;
            gap: 14px;
            align-items: center;
            transition: .2s ease;
          }

          .login-feature-card:hover {
            transform: translateY(-5px);
            border-color: rgba(34,211,238,.28);
          }

          .login-feature-icon {
            width: 58px;
            height: 58px;
            border-radius: 20px;
            display: grid;
            place-items: center;
            color: #a5f3fc;
            border: 1px solid rgba(255,255,255,.10);
          }

          .login-feature-card h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 1000;
          }

          .login-feature-card p {
            margin: 6px 0 0;
            color: #94a3b8;
            font-size: 13px;
            font-weight: 750;
          }

          .login-bottom-strip {
            position: relative;
            z-index: 2;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .login-mini-stat {
            padding: 14px;
            border-radius: 20px;
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.08);
          }

          .login-mini-stat strong {
            display: block;
            font-size: 20px;
          }

          .login-mini-stat span {
            display: block;
            margin-top: 4px;
            color: #94a3b8;
            font-size: 12px;
            font-weight: 800;
          }

          .login-card {
            border-radius: 34px;
            padding: 26px;
            background:
              radial-gradient(circle at top left, rgba(34,211,238,.14), transparent 34%),
              rgba(15,23,42,.88);
            border: 1px solid rgba(255,255,255,.12);
            box-shadow: 0 30px 90px rgba(0,0,0,.38);
            display: grid;
            align-content: center;
            min-height: 620px;
          }

          .login-logo {
            width: 74px;
            height: 74px;
            border-radius: 25px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, #06b6d4, #2563eb, #7c3aed);
            box-shadow: 0 18px 40px rgba(37,99,235,.28);
            margin-bottom: 18px;
          }

          .login-card h2 {
            margin: 0;
            font-size: 34px;
            letter-spacing: -.05em;
            font-weight: 1000;
          }

          .login-card-sub {
            margin: 8px 0 20px;
            color: #94a3b8;
            line-height: 1.45;
            font-weight: 750;
          }

          .login-mode-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 18px;
          }

          .login-mode-btn {
            border: 1px solid rgba(255,255,255,.10);
            background: rgba(255,255,255,.07);
            color: white;
            min-height: 48px;
            border-radius: 17px;
            font-weight: 950;
            cursor: pointer;
            transition: .18s ease;
          }

          .login-mode-btn.active {
            background: linear-gradient(135deg, rgba(6,182,212,.28), rgba(37,99,235,.24));
            border-color: rgba(34,211,238,.34);
            color: #a5f3fc;
          }

          .login-form {
            display: grid;
            gap: 14px;
          }

          .login-field {
            display: grid;
            gap: 8px;
          }

          .login-field span {
            color: #cbd5e1;
            font-size: 13px;
            font-weight: 900;
          }

          .login-input-wrap {
            height: 54px;
            border-radius: 18px;
            display: grid;
            grid-template-columns: 44px 1fr 44px;
            align-items: center;
            background: rgba(255,255,255,.07);
            border: 1px solid rgba(255,255,255,.10);
            padding: 0 10px;
          }

          .login-input-wrap svg {
            color: #a5f3fc;
          }

          .login-input {
            width: 100%;
            height: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: white;
            font-size: 15px;
            font-weight: 800;
          }

          .login-input::placeholder {
            color: #64748b;
          }

          .login-eye-btn {
            border: 0;
            background: transparent;
            color: #cbd5e1;
            display: grid;
            place-items: center;
            cursor: pointer;
          }

          .login-error {
            padding: 12px 13px;
            border-radius: 16px;
            color: #fecaca;
            background: rgba(239,68,68,.13);
            border: 1px solid rgba(239,68,68,.22);
            font-size: 13px;
            font-weight: 850;
          }

          .login-submit {
            margin-top: 4px;
            height: 56px;
            border: 0;
            border-radius: 19px;
            color: white;
            font-size: 16px;
            font-weight: 1000;
            cursor: pointer;
            background: linear-gradient(135deg, #06b6d4, #2563eb, #7c3aed);
            box-shadow: 0 18px 40px rgba(37,99,235,.28);
            transition: .18s ease;
          }

          .login-submit:hover {
            transform: translateY(-2px);
            filter: brightness(1.06);
          }

          .login-submit:disabled {
            opacity: .65;
            cursor: not-allowed;
            transform: none;
          }

          .login-hint-box {
            margin-top: 16px;
            padding: 13px;
            border-radius: 18px;
            background: rgba(34,211,238,.08);
            border: 1px solid rgba(34,211,238,.14);
            color: #a5f3fc;
            font-size: 12px;
            line-height: 1.45;
            font-weight: 800;
          }

          @media (max-width: 1020px) {
            .login-pro-shell {
              grid-template-columns: 1fr;
            }

            .login-card {
              min-height: auto;
            }
          }

          @media (max-width: 680px) {
            .login-pro-page {
              padding: 14px;
            }

            .login-hero,
            .login-card {
              border-radius: 26px;
              padding: 20px;
            }

            .login-feature-grid,
            .login-bottom-strip {
              grid-template-columns: 1fr;
            }

            .login-title {
              font-size: 40px;
            }
          }
        `}
      </style>

      <div className="login-pro-shell">
        <section className="login-hero">
          <div>
            <div className="login-badge">
              <Wifi size={20} />
              Multi Tenant SaaS POS
            </div>

            <h1 className="login-title">
              <span>NexaPOSPro</span> System
            </h1>

            <p className="login-subtitle">
              One master app for restaurants. Create client logins, enable only purchased modules,
              and run every restaurant with isolated POS data, KDS, orders, tokens and receipts.
            </p>
          </div>

          <div className="login-feature-grid">
            {featureCards.map((feature) => {
              const Icon = feature.icon;

              return (
                <div className="login-feature-card" key={feature.title} style={{ background: feature.bg }}>
                  <div className="login-feature-icon">
                    <Icon size={30} />
                  </div>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="login-bottom-strip">
            <div className="login-mini-stat">
              <strong>6 Modes</strong>
              <span>Dine In, Take Away, Delivery, Drive Thru, Walk In, Kiosk</span>
            </div>
            <div className="login-mini-stat">
              <strong>Tenant Safe</strong>
              <span>Every restaurant gets separated data</span>
            </div>
            <div className="login-mini-stat">
              <strong>KDS Ready</strong>
              <span>Auto timers and delivery workflow</span>
            </div>
          </div>
        </section>

        <section className="login-card">
          <div className="login-logo">
            <ShieldCheck size={38} />
          </div>

          <h2>Secure Login</h2>
          <p className="login-card-sub">
            Login as super admin or restaurant client to access your POS command center.
          </p>

          <div className="login-mode-row">
            <button
              type="button"
              className={`login-mode-btn ${mode === "super" ? "active" : ""}`}
              onClick={useSuperDemo}
            >
              Super Admin
            </button>

            <button
              type="button"
              className={`login-mode-btn ${mode === "client" ? "active" : ""}`}
              onClick={useClientDemo}
            >
              Client Login
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <span>Username / Email</span>
              <div className="login-input-wrap">
                <User size={20} />
                <input
                  className="login-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                />
                <span />
              </div>
            </label>

            <label className="login-field">
              <span>Password</span>
              <div className="login-input-wrap">
                <Lock size={20} />
                <input
                  className="login-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  className="login-eye-btn"
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </label>

            {error ? <div className="login-error">{error}</div> : null}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login to NexaPOS"}
            </button>
          </form>

          <div className="login-hint-box">
            Keep backend running on <strong>localhost:5000</strong>. Frontend `.env` should only have
            <strong> VITE_API_URL=http://localhost:5000</strong>.
          </div>
        </section>
      </div>
    </div>
  );
}
