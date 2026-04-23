// frontend/shell-app/src/pages/PointsHistoryPage.js
// Component 2: Route /points-history — UPI-style transaction list with Load More pagination

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const REASON_META = {
  session_completed:  { icon: "⚡", label: "Session Completed",    color: "#16a34a" },
  review_submitted:   { icon: "⭐", label: "Review Submitted",      color: "#16a34a" },
  onboarding:         { icon: "🎉", label: "Welcome Bonus",         color: "#16a34a" },
  referral_bonus:     { icon: "👥", label: "Referral Bonus",        color: "#16a34a" },
  referral_used:      { icon: "🔗", label: "Referral Used",         color: "#16a34a" },
  charging_discount:  { icon: "🔋", label: "Charging Discount",     color: "#dc2626" },
  accessory_purchase: { icon: "🛍️", label: "Accessory Purchase",   color: "#dc2626" },
};

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PointsHistoryPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastId, setLastId] = useState(null);
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async (startAfter = null) => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const params = { limit: 20 };
      if (startAfter) params.startAfter = startAfter;
      const res = await axios.get(`${API}/api/points/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      const newItems = res.data.history || [];
      setHistory((prev) => (startAfter ? [...prev, ...newItems] : newItems));
      setHasMore(res.data.hasMore || false);
      if (newItems.length > 0) setLastId(newItems[newItems.length - 1].id);
    } catch (err) {
      setError("Failed to load transaction history.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const loadMore = () => {
    setLoadingMore(true);
    fetchHistory(lastId);
  };

  return (
    <div style={pageWrap}>
      {/* Header */}
      <div style={header}>
        <button id="points-history-back" onClick={() => navigate(-1)} style={backBtn}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1a1a1a" }}>Points History</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280", fontWeight: 500 }}>Your Green Points transactions</p>
        </div>
      </div>

      {error && (
        <div style={errorBox}>{error}</div>
      )}

      {loading ? (
        <div style={centered}>
          <div style={spinner} />
        </div>
      ) : history.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ fontSize: 48, margin: 0 }}>🌿</p>
          <p style={{ color: "#6b7280", fontWeight: 600, marginTop: 12 }}>No transactions yet</p>
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>Complete a session or leave a review to earn your first points!</p>
        </div>
      ) : (
        <div style={listWrap}>
          {history.map((item) => {
            const meta = REASON_META[item.reason] || { icon: "GP", label: item.reason, color: "#16a34a" };
            const isEarn = item.type === "earn";
            return (
              <div key={item.id} style={rowStyle}>
                <div style={{ ...iconCircle, background: isEarn ? "#dcfce7" : "#fee2e2" }}>
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{meta.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{formatDate(item.createdAt)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: isEarn ? "#16a34a" : "#dc2626" }}>
                    {isEarn ? "+" : ""}{item.points.toLocaleString("en-IN")} pts
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>Balance: {item.balanceAfter.toLocaleString("en-IN")}</p>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button
                id="points-history-load-more"
                onClick={loadMore}
                disabled={loadingMore}
                style={loadMoreBtn}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const pageWrap = { maxWidth: 560, margin: "0 auto", padding: "24px 16px 80px" };
const header = { display: "flex", alignItems: "center", gap: 16, marginBottom: 28 };
const backBtn = { background: "#f3f4f6", border: "none", borderRadius: 12, width: 40, height: 40, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const errorBox = { background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, padding: 16, color: "#dc2626", fontSize: 14, fontWeight: 600, marginBottom: 16 };
const centered = { display: "flex", justifyContent: "center", padding: 60 };
const spinner = { width: 36, height: 36, border: "3px solid #dcfce7", borderTop: "3px solid #16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
const emptyBox = { textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 20, border: "1px solid #f3f4f6" };
const listWrap = { display: "flex", flexDirection: "column", gap: 2 };
const rowStyle = { display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6", transition: "box-shadow 0.15s" };
const iconCircle = { width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const loadMoreBtn = { background: "linear-gradient(135deg, #15803d, #22c55e)", color: "#fff", border: "none", borderRadius: 20, padding: "10px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer" };
