// frontend/shell-app/src/components/ReferralSection.js
// Component 3: Displays the user's referral code with copy-to-clipboard and share.
// Placed on the user profile page.

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function ReferralSection() {
  const { currentUser } = useAuth();
  const [code, setCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetch = async () => {
      try {
        const token = await currentUser.getIdToken();
        const res = await axios.get(`${API}/api/points/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCode(res.data.referralCode || null);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [currentUser]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleShare = () => {
    if (!code) return;
    if (navigator.share) {
      navigator.share({
        title: "EV Saarthi — Join with my referral code!",
        text: `Use my code ${code} when setting up your EV Saarthi profile and get 100 bonus Green Points!`,
        url: window.location.origin,
      });
    } else {
      handleCopy();
    }
  };

  if (loading) return null;
  if (!code) return null;

  return (
    <div style={wrapStyle}>
      <div style={headerRow}>
        <span style={{ fontSize: 24 }}>🤝</span>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>Refer a Friend</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Earn 200 points for every friend who joins</p>
        </div>
      </div>

      <div style={codeBox}>
        <span style={codeText}>{code}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            id="referral-copy-btn"
            onClick={handleCopy}
            style={{ ...actionBtn, background: copied ? "#dcfce7" : "#f3f4f6", color: copied ? "#16a34a" : "#374151" }}
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
          <button
            id="referral-share-btn"
            onClick={handleShare}
            style={{ ...actionBtn, background: "linear-gradient(135deg, #15803d, #22c55e)", color: "#fff" }}
          >
            Share
          </button>
        </div>
      </div>

      <p style={rewardNote}>
        🎁 Your friend gets <strong>100 pts</strong> on signup. You get <strong>200 pts</strong> when they join!
      </p>
    </div>
  );
}

const wrapStyle = {
  background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
  border: "1px solid #bbf7d0",
  borderRadius: 20,
  padding: "20px 24px",
};
const headerRow = { display: "flex", alignItems: "center", gap: 14, marginBottom: 16 };
const codeBox = { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 14, padding: "12px 18px", border: "2px dashed #86efac", gap: 12, flexWrap: "wrap" };
const codeText = { fontFamily: "monospace", fontWeight: 900, fontSize: 20, letterSpacing: "0.15em", color: "#15803d" };
const actionBtn = { border: "none", borderRadius: 10, padding: "7px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" };
const rewardNote = { margin: "12px 0 0", fontSize: 13, color: "#15803d", fontWeight: 500 };
