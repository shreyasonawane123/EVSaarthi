// frontend/admin-app/src/contexts/AuthContext.jsx
// Role-aware auth context for the Staff Portal.
//
// Lifecycle:
//   onAuthStateChanged → if user: call /api/admin/me → set appUser
//                     → if 404: sign out (not a staff member)
//                     → if null: clear state
//
// Exposed: { firebaseUser, appUser, loading, logout }

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import api from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        try {
          // Fetch role from backend — never from Firestore directly
          const res = await api.get("/api/admin/me");
          if (res.data?.success) {
            setAppUser(res.data.admin);
          } else {
            setAppUser(null);
          }
        } catch (err) {
          if (err.response?.status === 404) {
            // Person exists in Firebase Auth but is not staff
            await signOut(auth);
            setFirebaseUser(null);
            setAppUser(null);
          } else {
            // Network or other error — keep firebaseUser, clear appUser
            setAppUser(null);
          }
        } finally {
          setLoading(false);
        }
      } else {
        // Logged out or unauthenticated
        setFirebaseUser(null);
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setAppUser(null);
  };

  const value = {
    firebaseUser,
    appUser,
    loading,
    logout,
    // Legacy compatibility fields so existing admin-app pages don't break
    currentUser: appUser
      ? {
          displayName: appUser.name,
          uid: appUser.uid,
          tenantId: appUser.tenantId,
          tenantName: appUser.tenantName,
          getIdToken: async () => {
            const u = auth.currentUser;
            return u ? await u.getIdToken() : null;
          },
        }
      : null,
    adminRole: appUser?.role ?? null,
    isLoggedIn: !!appUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
