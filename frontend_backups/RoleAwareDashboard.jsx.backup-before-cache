import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import ClientDashboard from "./ClientDashboard";

export default function RoleAwareDashboard({ token, session, onOpenModule, onRoleContext }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadContext() {
    setLoading(true);

    try {
      const res = await api(token).get("/api/role-access/context");
      setContext(res.data);
      onRoleContext?.(res.data);
    } catch (error) {
      console.warn("Role context failed:", error.response?.data?.message || error.message);
      setContext(null);
      onRoleContext?.(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContext();
  }, []);

  if (loading) {
    return (
      <div className="nexa-epos-dashboard chrome-browser-mode">
        <div
          style={{
            minHeight: "60vh",
            display: "grid",
            placeItems: "center",
            color: "white",
            textAlign: "center"
          }}
        >
          <div
            style={{
              padding: 28,
              borderRadius: 28,
              background: "rgba(15,23,42,.72)",
              border: "1px solid rgba(255,255,255,.12)",
              boxShadow: "0 24px 70px rgba(0,0,0,.28)"
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 8 }}>◆</div>
            <h2 style={{ margin: 0, fontWeight: 1000 }}>Loading NexaPOS Access</h2>
            <p style={{ color: "#cbd5e1", marginBottom: 0 }}>
              Checking branch, role and permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientDashboard
      token={token}
      session={{
        ...session,
        roleContext: context
      }}
      roleContext={context}
      onOpenModule={onOpenModule}
    />
  );
}

