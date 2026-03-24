// frontend/booking-app/src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [iframeToken, setIframeToken] = useState(null);

  useEffect(() => {
    // Check if shell-app passed a token via iframe URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    const nameParam = urlParams.get("name");
    
    if (tokenParam) {
      setIframeToken(tokenParam);
      let dName = "User";
      try { dName = decodeURIComponent(escape(atob(nameParam))); } catch(e) {}
      
      // Simulate standard user object for Axios calls
      setCurrentUser({
        getIdToken: async () => tokenParam,
        uid: "iframe-user",
        displayName: dName
      });
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5F5", fontFamily: "Segoe UI, Arial, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px" }}>⚡</div>
          <div style={{ color: "#16A34A", fontWeight: "600", marginTop: "12px" }}>Loading Auth...</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, isLoggedIn: !!currentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
