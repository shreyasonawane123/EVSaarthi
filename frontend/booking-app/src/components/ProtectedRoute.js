// frontend/booking-app/src/components/ProtectedRoute.js
import React from "react";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();

  if (loading) return null;

  // If not logged in, we inform the shell app to redirect or simply show an error
  if (!isLoggedIn) {
    return (
      <div style={{ textAlign: "center", padding: "50px", fontFamily: "sans-serif" }}>
        <h2>Authentication Required</h2>
        <p>Please log in to EV Saarthi to book a slot.</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
