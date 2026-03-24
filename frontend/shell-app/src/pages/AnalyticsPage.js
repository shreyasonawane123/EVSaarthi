// frontend/shell-app/src/pages/AnalyticsPage.js
// Placeholder — Week 5 (Analytics Dashboard)

import React from "react";
import { useNavigate } from "react-router-dom";

const AnalyticsPage = () => {
  const navigate = useNavigate();
  return (
    <div style={s.page}>
      <div style={s.center}>
        <div style={s.icon}>📊</div>
        <h1 style={s.title}>Analytics Dashboard</h1>
        <p style={s.sub}>Coming in <strong style={{ color: "#EAB308" }}>Week 5</strong> — CO₂ savings, trip history, and Green Points tracking</p>
        <div style={s.badge}>🚧 Under Development</div>
        <button onClick={() => navigate("/dashboard")} style={s.btn}>← Back to Dashboard</button>
      </div>
    </div>
  );
};

const s = {
  page: { minHeight: "calc(100vh - 64px)", background: "#F5F5F5", fontFamily: "'Segoe UI', Arial, sans-serif" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 64px)", textAlign: "center", gap: "16px", padding: "40px" },
  icon: { fontSize: "72px" },
  title: { fontSize: "32px", fontWeight: "900", color: "#1A1A1A", margin: 0 },
  sub: { fontSize: "16px", color: "#666", maxWidth: "400px", lineHeight: 1.6 },
  badge: { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A", borderRadius: "20px", padding: "8px 20px", fontSize: "13px", fontWeight: "700" },
  btn: { marginTop: "8px", padding: "12px 28px", background: "#EAB308", border: "none", borderRadius: "8px", color: "#1A1A1A", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
};

export default AnalyticsPage;
