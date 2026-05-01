// frontend/shell-app/src/context/AuthContext.js
// Shared auth state — provides currentUser, isLoggedIn, logout to entire shell-app

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/config";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      // Update browser tab title based on login state
      if (user) {
        const name = user.displayName?.split(' ')[0] || 'User';
        document.title = `${name}'s Dashboard — EV Saarthi`;
      } else {
        document.title = 'EV Saarthi — Smart EV Companion';
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = {
    currentUser,
    loading,
    isLoggedIn: !!currentUser,
    logout,
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F5F5F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Segoe UI', Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "16px" }}>⚡</div>
          <div
            style={{
              color: "#16A34A",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            Loading EV Saarthi...
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};