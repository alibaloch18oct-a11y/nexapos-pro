import React from "react";
import { LogOut, Sparkles } from "lucide-react";

export default function TopBar({ session, onLogout }) {
  return (
    <div className="nexa-topbar">
      <div className="nexa-topbar-inner">
        <div className="nexa-brand">
          <div className="nexa-brand-icon">
            <Sparkles />
          </div>
          <div>
            <h1 className="nexa-brand-title">NexaPOS Pro</h1>
            <p className="nexa-brand-sub">
              {session?.user?.role === "super_admin"
                ? "Super Admin Control Center"
                : session?.tenant?.restaurantName || "Restaurant Dashboard"}
            </p>
          </div>
        </div>

        <div className="nexa-top-actions">
          <div className="nexa-pill">Connected</div>
          <div className="nexa-pill">{new Date().toLocaleTimeString()}</div>
          <button className="nexa-logout" onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}




