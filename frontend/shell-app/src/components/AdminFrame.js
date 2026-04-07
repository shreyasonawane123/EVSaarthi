// frontend/shell-app/src/components/AdminFrame.js
// Loads admin-app in an iframe if user is an admin
// Passes token, name, and role as URL params so the iframe app knows the admin's role

import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

const AdminFrame = () => {
  const { currentUser, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState(null);
  const [adminRole, setAdminRole] = useState("admin");

  useEffect(() => {
    const checkAdmin = async () => {
      console.log("[AdminFrame] Checking access for user:", currentUser?.uid);

      if (!currentUser) {
        console.log("[AdminFrame] No current user, denying access.");
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      try {
        const adminDoc = await getDoc(
          doc(db, "adminUsers", currentUser.uid)
        );
        console.log("[AdminFrame] Admin doc exists?", adminDoc.exists());

        setIsAdmin(adminDoc.exists());

        if (adminDoc.exists()) {
          const idToken = await currentUser.getIdToken(true); // force refresh token
          setToken(idToken);
          const role = adminDoc.data()?.role || "admin";
          setAdminRole(role);
        }
      } catch (error) {
        console.error("[AdminFrame] Error checking admin status:", error);
        setIsAdmin(false);
      }

      setChecking(false);
    };

    if (!loading) {
      checkAdmin();
    }
  }, [currentUser, loading]);

  // Show loading while checking auth or admin status
  if (loading || checking) {
    return (
      <div style={{
        height: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F5F5F5",
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "16px" }}>⚡</div>
          <div style={{ color: "#16A34A", fontSize: "16px", fontWeight: "600" }}>
            Verifying Admin Access...
          </div>
        </div>
      </div>
    );
  }

  // Not logged in → go to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Not admin → go to dashboard
  if (!isAdmin || !token) {
    return <Navigate to="/dashboard" replace />;
  }

  // Build iframe URL with token, name, role
  const iframePath = window.location.pathname.replace("/admin", "") || "/";
  const nameParam = encodeURIComponent(currentUser.displayName || "Admin");
  const iframeUrl = `/admin${iframePath}?token=${token}&name=${nameParam}&role=${adminRole}`;

  console.log("[AdminFrame] Loading admin iframe:", iframeUrl);

  return (
    <div style={{
      width: "100%",
      height: "calc(100vh - 64px)",
      overflow: "hidden",
    }}>
      <iframe
        src={iframeUrl}
        title="EV Saarthi Admin Panel"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
      />
    </div>
  );
};

export default AdminFrame;