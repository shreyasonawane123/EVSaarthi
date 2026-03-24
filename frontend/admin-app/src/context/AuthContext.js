import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/config";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [adminRole, setAdminRole]     = useState(null); // "superadmin" | "admin" | null
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    // 1. Check URL for token, name, and role
    const params    = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    const nameParam  = params.get("name");
    const roleParam  = params.get("role");

    if (tokenParam) {
      sessionStorage.setItem("admin_token", tokenParam);
      sessionStorage.setItem("admin_name",  nameParam ? decodeURIComponent(nameParam) : "Admin");
      sessionStorage.setItem("admin_role",  roleParam || "admin");

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const savedToken = sessionStorage.getItem("admin_token");
    const savedName  = sessionStorage.getItem("admin_name");
    const savedRole  = sessionStorage.getItem("admin_role") || "admin";

    if (savedToken) {
      setCurrentUser({
        displayName: savedName,
        uid: "admin", // mock uid — real uid is encoded in the JWT, not needed here
        getIdToken: async () => savedToken,
      });
      setAdminRole(savedRole);
      setLoading(false);
    } else {
      // Not logged in
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_name");
    sessionStorage.removeItem("admin_role");
    setCurrentUser(null);
    setAdminRole(null);
  };

  const value = {
    currentUser,
    adminRole,
    loading,
    isLoggedIn: !!currentUser,
    logout,
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#F5F5F5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "16px" }}>⚡</div>
          <div style={{ color: "#16A34A", fontSize: "16px", fontWeight: "600" }}>
            Loading EV Saarthi Admin...
          </div>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
