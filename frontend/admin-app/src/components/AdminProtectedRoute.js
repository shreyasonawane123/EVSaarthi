// frontend/admin-app/src/components/AdminProtectedRoute.js
// Protects all admin routes. If no session token, sends user to /staff-login
// instead of showing an error message.

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    // AuthContext already renders a full-screen loading state while loading===true,
    // but in case children mount first, return null to be safe.
    return null;
  }

  if (!isLoggedIn) {
    // Redirect directly to Staff Portal login — clean UX instead of error message
    return <Navigate to="/staff-login" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
