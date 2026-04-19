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

    const fetchProfile = async (token, baseName, baseRole) => {
        try {
            const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
            const res = await fetch(`${API}/api/admin/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCurrentUser({
                    displayName: data.admin.name || baseName,
                    uid: data.admin.uid,
                    tenantId: data.admin.tenantId,
                    tenantName: data.admin.tenantName,
                    getIdToken: async () => token,
                });
                setAdminRole(data.admin.role);
                // Update session storage with latest
                sessionStorage.setItem("admin_role", data.admin.role);
                sessionStorage.setItem("admin_name", data.admin.name || baseName);
            } else {
                // Fallback to minimal user if /me fails
                setCurrentUser({
                    displayName: baseName,
                    uid: "admin",
                    getIdToken: async () => token,
                });
                setAdminRole(baseRole);
            }
        } catch (err) {
            console.error("AuthContext: Profile fetch failed", err);
            setCurrentUser({
                displayName: baseName,
                uid: "admin",
                getIdToken: async () => token,
            });
            setAdminRole(baseRole);
        } finally {
            setLoading(false);
        }
    };

    if (savedToken) {
      fetchProfile(savedToken, savedName, savedRole);
    } else {
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
