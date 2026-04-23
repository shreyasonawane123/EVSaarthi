// frontend/shell-app/src/components/PointsRedemptionToggle.js
// Component 5: Points redemption toggle on the booking payment screen.
// Only shows if user has enough points. Never blocks payment.

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function PointsRedemptionToggle({ baseCost, onRedemptionChange }) {
  const { currentUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [minPoints, setMinPoints] = useState(500);
  const [pointValue, setPointValue] = useState(0.10);
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const token = await currentUser.getIdToken();
        const [balRes, cfgRes] = await Promise.all([
          axios.get(`${API}/api/points/balance`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/api/points/config`),
        ]);
        const bal = balRes.data.balance || 0;
        const min = cfgRes.data.minRedemptionPoints || 500;
        const pv  = cfgRes.data.pointValueInRupees || 0.10;
        setBalance(bal);
        setMinPoints(min);
        setPointValue(pv);
        if (bal >= min) setVisible(true);
      } catch {
        // Points service down — hide component entirely, never block payment
        setVisible(false);
      }
    };
    load();
  }, [currentUser]);

  const discount = parseFloat((balance * pointValue).toFixed(2));
  const newTotal = Math.max(0, baseCost - discount).toFixed(2);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (onRedemptionChange) {
      onRedemptionChange(next ? balance : 0, next ? discount : 0);
    }
  };

  if (!visible) return null;

  return (
    <div style={{ ...wrapStyle, border: enabled ? "2px solid #22c55e" : "2px solid #e5e7eb" }}>
      <div style={rowStyle}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#16a34a", background: "#dcfce7", padding: "4px 8px", borderRadius: 8 }}>GP</span>
            <div>
              <p style={titleStyle}>
                Use {balance.toLocaleString("en-IN")} Green Points for ₹{discount} off
              </p>
              <p style={subStyle}>
                {enabled
                  ? `New total: ₹${newTotal} (saves ₹${discount})`
                  : `You have ${balance.toLocaleString("en-IN")} pts = ₹${discount} discount`}
              </p>
            </div>
          </div>
        </div>
        {/* Toggle switch */}
        <button
          id="points-redemption-toggle"
          onClick={toggle}
          style={{ ...toggleBtn, background: enabled ? "#22c55e" : "#d1d5db" }}
          aria-pressed={enabled}
        >
          <div style={{ ...toggleKnob, transform: enabled ? "translateX(20px)" : "translateX(0)" }} />
        </button>
      </div>

      {enabled && (
        <div style={savingBadge}>
          🎉 You're saving ₹{discount} with Green Points!
        </div>
      )}
    </div>
  );
}

const wrapStyle = {
  borderRadius: 16,
  padding: "14px 18px",
  background: "#f0fdf4",
  transition: "border 0.2s",
  marginBottom: 12,
};
const rowStyle = { display: "flex", alignItems: "center", gap: 12 };
const titleStyle = { margin: 0, fontWeight: 700, fontSize: 14, color: "#1a1a1a" };
const subStyle = { margin: "2px 0 0", fontSize: 12, color: "#6b7280" };
const toggleBtn = {
  width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
  position: "relative", flexShrink: 0, transition: "background 0.25s",
};
const toggleKnob = {
  position: "absolute", top: 3, left: 3,
  width: 20, height: 20, borderRadius: "50%",
  background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
  transition: "transform 0.25s",
};
const savingBadge = {
  marginTop: 10,
  background: "#dcfce7",
  borderRadius: 10,
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 700,
  color: "#15803d",
};
