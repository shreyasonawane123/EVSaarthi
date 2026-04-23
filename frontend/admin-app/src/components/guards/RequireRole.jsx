// frontend/admin-app/src/components/guards/RequireRole.jsx
// Layout-route guard — ensures the authenticated user has one of the allowed roles.
// Used nested inside <RequireAuth>:
//
//   <Route element={<RequireAuth />}>
//     <Route element={<RequireRole allowedRoles={["superadmin"]} />}>
//       <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
//     </Route>
//   </Route>
//
// Role redirect map:
//   superadmin → /superadmin/dashboard
//   admin      → /admin/dashboard
//   operator   → /operator/dashboard
//   (default)  → /staff-login

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

const ROLE_DASHBOARDS = {
  superadmin: "/superadmin/dashboard",
  admin: "/admin/dashboard",
  operator: "/operator/dashboard",
};

const RequireRole = ({ allowedRoles }) => {
  const { loading, appUser } = useAuth();

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
          Checking permissions...
        </span>
      </div>
    );
  }

  if (!appUser) {
    return <Navigate to="/staff-login" replace />;
  }

  if (!allowedRoles.includes(appUser.role)) {
    const redirect = ROLE_DASHBOARDS[appUser.role] ?? "/staff-login";
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
};

export default RequireRole;
