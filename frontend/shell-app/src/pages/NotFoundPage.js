// frontend/shell-app/src/pages/NotFoundPage.js

import React from "react";
import { useNavigate } from "react-router-dom";

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div style={s.page}>
      <div style={s.center}>
        <div style={s.code}>404</div>
        <h1 style={s.title}>Page Not Found</h1>
        <p style={s.sub}>The page you're looking for doesn't exist.</p>
        <button onClick={() => navigate("/dashboard")} style={s.btn}>← Go to Dashboard</button>
      </div>
    </div>
  );
};

const s = {
  page: { minHeight: "100vh", background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', Arial, sans-serif" },
  center: { textAlign: "center", padding: "40px" },
  code: { fontSize: "96px", fontWeight: "900", color: "#EAB308", lineHeight: 1 },
  title: { fontSize: "28px", fontWeight: "800", color: "#1A1A1A", margin: "16px 0 8px" },
  sub: { fontSize: "15px", color: "#888", marginBottom: "32px" },
  btn: { padding: "12px 28px", background: "#EAB308", border: "none", borderRadius: "8px", color: "#1A1A1A", fontSize: "14px", fontWeight: "700", cursor: "pointer" },
};

export default NotFoundPage;
