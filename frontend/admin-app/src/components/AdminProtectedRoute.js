import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

const AdminProtectedRoute = ({ children }) => {
  const { currentUser, isLoggedIn, loading } = useAuth();
  if (loading) return null; // or a spinner

  if (!isLoggedIn) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Session Expired or Missing.</h2>
        <p>Please refresh the parent page to re-authenticate.</p>
      </div>
    );
  }

  // We are in iframe, AdminFrame already did the permission check.
  // We can just render children.
  return children;
};

export default AdminProtectedRoute;
