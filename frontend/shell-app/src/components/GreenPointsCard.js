// frontend/shell-app/src/components/GreenPointsCard.js
// Component 1: Green Points balance card for the user dashboard home screen.
// Calls GET /api/points/balance. Shows balance, tier badge, View History link.
// Shows skeleton loader while fetching. Never blocks page render.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const TIER_STYLES = {
  gold: {
    bg: "linear-gradient(135deg, #92400e 0%, #d97706 50%, #fbbf24 100%)",
    badge: "#fbbf24",
    badgeText: "#78350f",
    glow: "0 8px 32px rgba(217,119,6,0.45)",
    label: "🥇 Gold",
  },
  silver: {
    bg: "linear-gradient(135deg, #374151 0%, #6b7280 50%, #d1d5db 100%)",
    badge: "#d1d5db",
    badgeText: "#1f2937",
    glow: "0 8px 32px rgba(107,114,128,0.45)",
    label: "🥈 Silver",
  },
  bronze: {
    bg: "linear-gradient(135deg, #1a1a1a 0%, #15803d 50%, #22c55e 100%)",
    badge: "#22c55e",
    badgeText: "#14532d",
    glow: "0 8px 32px rgba(34,197,94,0.35)",
    label: "🥉 Bronze",
  },
};

export default function GreenPointsCard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetch = async () => {
      try {
        const token = await currentUser.getIdToken();
        const res = await axios.get(`${API}/api/points/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch {
        // Points service down — silently hide card
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [currentUser]);

  if (loading) {
    return (
      <div style={skeletonStyle}>
        <div style={skeletonInner} />
      </div>
    );
  }

  if (!data) return null;

  const tier = data.tier || "bronze";
  const style = TIER_STYLES[tier] || TIER_STYLES.bronze;

  return (
    <div style={{ ...cardStyle, background: style.bg, boxShadow: style.glow }}>
      {/* Decorative circles */}
      <div style={circle1} />
      <div style={circle2} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={labelStyle}>Green Points</p>
            <p style={balanceStyle}>{(data.balance || 0).toLocaleString("en-IN")}</p>
            <p style={subStyle}>Lifetime: {(data.lifetimePoints || 0).toLocaleString("en-IN")} pts</p>
          </div>
          <div style={{ ...tierBadge, background: style.badge, color: style.badgeText }}>
            {style.label}
          </div>
        </div>

        {/* Footer row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, margin: 0 }}>
            1 pt = ₹0.10 • Min 500 pts to redeem
          </p>
          <button
            id="green-points-history-btn"
            onClick={() => navigate("/points-history")}
            style={historyBtn}
          >
            View History →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const cardStyle = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 20,
  padding: "24px 28px",
  color: "#fff",
  cursor: "default",
  transition: "transform 0.2s",
};

const circle1 = {
  position: "absolute",
  top: -40,
  right: -40,
  width: 140,
  height: 140,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.08)",
  pointerEvents: "none",
};

const circle2 = {
  position: "absolute",
  bottom: -30,
  left: -30,
  width: 100,
  height: 100,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.05)",
  pointerEvents: "none",
};

const labelStyle = {
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "rgba(255,255,255,0.7)",
};

const balanceStyle = {
  margin: "4px 0 2px",
  fontSize: 42,
  fontWeight: 900,
  lineHeight: 1,
  letterSpacing: "-1px",
};

const subStyle = {
  margin: 0,
  fontSize: 12,
  color: "rgba(255,255,255,0.55)",
  fontWeight: 500,
};

const tierBadge = {
  borderRadius: 20,
  padding: "4px 14px",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const historyBtn = {
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 20,
  color: "#fff",
  padding: "6px 16px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  backdropFilter: "blur(8px)",
};

const skeletonStyle = {
  borderRadius: 20,
  padding: "24px 28px",
  background: "linear-gradient(135deg, #1a2e1a 0%, #15803d 100%)",
  minHeight: 128,
  display: "flex",
  alignItems: "center",
};

const skeletonInner = {
  width: "100%",
  height: 80,
  borderRadius: 12,
  background: "rgba(255,255,255,0.08)",
  animation: "pulse 1.5s ease-in-out infinite",
};
