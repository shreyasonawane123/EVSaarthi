// frontend/admin-app/src/components/guards/RequireAuth.jsx
// Layout-route guard — ensures user is authenticated.
// Used as a parent <Route element={<RequireAuth />}> wrapper in React Router v6.
//
// If loading  → spinner (never render children during auth resolution)
// If no user  → redirect to /staff-login
// If authed   → render <Outlet />

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const spinnerStyle = {
  display: "inline-block",
  width: 40,
  height: 40,
  border: "4px solid #E5E7EB",
  borderTopColor: "#16A34A",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const RequireAuth = () => {
  const { loading, firebaseUser } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5F5F5",
          flexDirection: "column",
          gap: 16,
          fontFamily: "'Segoe UI', Arial, sans-serif",
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={spinnerStyle} />
        <span style={{ color: "#6B7280", fontSize: 14, fontWeight: 600 }}>
          Loading...
        </span>
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/staff-login" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
