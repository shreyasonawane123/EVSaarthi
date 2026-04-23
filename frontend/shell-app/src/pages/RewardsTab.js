// frontend/shell-app/src/pages/RewardsTab.js
// Component 6: Route /rewards — accessories catalog with purchase dialog

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function RewardsTab() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [accessories, setAccessories] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [confirm, setConfirm] = useState(null); // accessory to confirm
  const [toast, setToast] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [accRes] = await Promise.all([
          axios.get(`${API}/api/points/accessories`),
        ]);
        setAccessories(accRes.data.accessories || []);
        if (currentUser) {
          const token = await currentUser.getIdToken();
          const balRes = await axios.get(`${API}/api/points/balance`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setBalance(balRes.data.balance || 0);
        }
      } catch (err) {
        console.error("Failed to load rewards:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const handlePurchase = async (acc) => {
    setConfirm(null);
    setPurchasing(acc.id);
    try {
      const token = await currentUser.getIdToken();
      await axios.post(
        `${API}/api/points/accessories/purchase`,
        { accessoryId: acc.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const ptsReq = acc.pointsRequired || acc.pointsCost || 0;
      setBalance((prev) => prev - ptsReq);
      setToast(`✅ ${acc.name} redeemed successfully!`);
      setTimeout(() => setToast(""), 4000);
    } catch (err) {
      const msg = err.response?.data?.error || "Redemption failed. Please try again.";
      setToast(`❌ ${msg}`);
      setTimeout(() => setToast(""), 4000);
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div style={pageWrap}>
      {/* Header */}
      <div style={header}>
        <button id="rewards-back-btn" onClick={() => navigate(-1)} style={backBtn}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1a1a1a" }}>Rewards Store</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#16a34a", fontWeight: 700 }}>
            Your balance: {balance.toLocaleString("en-IN")} pts
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ ...toastStyle, background: toast.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: toast.startsWith("✅") ? "#15803d" : "#dc2626" }}>
          {toast}
        </div>
      )}

      {loading ? (
        <div style={centered}><div style={spinner} /></div>
      ) : accessories.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ fontSize: 48, margin: 0 }}>🛍️</p>
          <p style={{ color: "#6b7280", fontWeight: 600, marginTop: 12 }}>No rewards available yet</p>
          <p style={{ color: "#9ca3af", fontSize: 13 }}>Check back soon for exciting accessories!</p>
        </div>
      ) : (
        <div style={grid}>
          {accessories.map((acc) => {
            const ptsReq = acc.pointsRequired || acc.pointsCost || 0;
            const canAfford = balance >= ptsReq;
            const isLoading = purchasing === acc.id;
            return (
              <div key={acc.id} style={card}>
                <div style={imgWrap}>
                  {acc.imageUrl ? (
                    <img src={acc.imageUrl} alt={acc.name} style={imgStyle} onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <div style={imgPlaceholder}>🔌</div>
                  )}
                </div>
                <div style={cardBody}>
                  <h3 style={cardTitle}>{acc.name}</h3>
                  {acc.description && <p style={cardDesc}>{acc.description}</p>}
                  <div style={cardFooter}>
                    <div style={pointsBadge}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#16a34a", background: "#dcfce7", padding: "2px 6px", borderRadius: 6 }}>GP</span> {ptsReq.toLocaleString("en-IN")} pts
                    </div>
                    <button
                      id={`redeem-acc-${acc.id}`}
                      onClick={() => setConfirm(acc)}
                      disabled={!canAfford || isLoading || !currentUser}
                      style={{
                        ...redeemBtn,
                        background: canAfford ? "linear-gradient(135deg,#15803d,#22c55e)" : "#e5e7eb",
                        color: canAfford ? "#fff" : "#9ca3af",
                        cursor: canAfford ? "pointer" : "not-allowed",
                      }}
                    >
                      {isLoading ? "..." : canAfford ? "Redeem" : "Need more pts"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirm && (
        <div style={overlay}>
          <div style={dialog}>
            <p style={{ fontSize: 36, margin: "0 0 8px" }}>🎁</p>
            <h3 style={{ margin: "0 0 8px", fontWeight: 800 }}>Confirm Redemption</h3>
            <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px" }}>
              Redeem <strong>{(confirm.pointsRequired || confirm.pointsCost || 0).toLocaleString("en-IN")} pts</strong> for <strong>{confirm.name}</strong>?
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button id="confirm-redeem-cancel" onClick={() => setConfirm(null)} style={cancelBtn}>Cancel</button>
              <button id="confirm-redeem-ok" onClick={() => handlePurchase(confirm)} style={confirmBtn}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const pageWrap = { maxWidth: 720, margin: "0 auto", padding: "24px 16px 80px" };
const header = { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 };
const backBtn = { background: "#f3f4f6", border: "none", borderRadius: 12, width: 40, height: 40, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const toastStyle = { borderRadius: 14, padding: "12px 18px", fontSize: 14, fontWeight: 700, marginBottom: 16 };
const centered = { display: "flex", justifyContent: "center", padding: 60 };
const spinner = { width: 36, height: 36, border: "3px solid #dcfce7", borderTop: "3px solid #16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
const emptyBox = { textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 20, border: "1px solid #f3f4f6" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 };
const card = { background: "#fff", borderRadius: 20, border: "1px solid #f3f4f6", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", transition: "transform 0.2s, box-shadow 0.2s" };
const imgWrap = { height: 160, overflow: "hidden", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" };
const imgStyle = { width: "100%", height: "100%", objectFit: "cover" };
const imgPlaceholder = { fontSize: 64 };
const cardBody = { padding: "14px 16px 16px" };
const cardTitle = { margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#1a1a1a" };
const cardDesc = { margin: "0 0 12px", fontSize: 13, color: "#6b7280", lineHeight: 1.4 };
const cardFooter = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" };
const pointsBadge = { fontSize: 13, fontWeight: 700, color: "#15803d", background: "#dcfce7", borderRadius: 10, padding: "4px 10px" };
const redeemBtn = { border: "none", borderRadius: 10, padding: "7px 16px", fontSize: 13, fontWeight: 700, transition: "opacity 0.2s" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const dialog = { background: "#fff", borderRadius: 24, padding: "32px 28px", maxWidth: 360, width: "90%", textAlign: "center" };
const cancelBtn = { flex: 1, background: "#f3f4f6", border: "none", borderRadius: 12, padding: "12px", fontWeight: 700, cursor: "pointer" };
const confirmBtn = { flex: 1, background: "linear-gradient(135deg,#15803d,#22c55e)", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontWeight: 700, cursor: "pointer" };
