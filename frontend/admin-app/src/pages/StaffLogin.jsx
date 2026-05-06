// frontend/admin-app/src/pages/StaffLogin.jsx
// ──────────────────────────────────────────────────────────────────────────────
// Staff Portal Login — Email-only + Google Sign-In (fully passwordless)
//
// Email flow:
//   1. User types email → POST /api/admin/email-login
//   2. Backend checks adminUsers / operators / pendingAdmins
//   3. If found → backend issues a Firebase Custom Token
//   4. Frontend calls signInWithCustomToken → signed in automatically
//   5. GET /api/admin/me → role detected → redirect
//
// Google flow:
//   1. signInWithPopup → GET /api/admin/me → role detected → redirect
// ──────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import {
  signInWithCustomToken,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase/config";
import "./StaffLogin.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const FIREBASE_ERRORS = {
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/popup-closed-by-user": "Login popup was closed. Please try again.",
};

/* ── Icon helpers ────────────────────────────────────────────────────────── */
const AlertIcon = () => (
  <svg style={{ flexShrink: 0, marginTop: 1 }} width="15" height="15" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

/* ── Main component ─────────────────────────────────────────────────────── */
const StaffLogin = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => setError("");

  /* ── Helper: call /api/admin/me and redirect based on role ─────────────── */
  const verifyAndRedirect = async (user) => {
    const idToken = await user.getIdToken();
    const res = await fetch(`${API}/api/admin/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();

    if (data.success) {
      const adminName = encodeURIComponent(data.admin.name || user.email);
      window.location.href = `/?token=${idToken}&name=${adminName}&role=${data.admin.role}`;
    } else if (res.status === 404) {
      await signOut(auth);
      setError("Your email is not registered as staff. Contact your platform administrator.");
    } else {
      await signOut(auth);
      setError("Login failed. Please try again.");
    }
  };

  /* ── EMAIL LOGIN — backend checks email, issues custom token ───────────── */
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setError("Please enter your email address."); return; }
    reset();
    setLoading(true);

    try {
      // Step 1: ask backend if this email is a registered staff member
      const res = await fetch(`${API}/api/admin/email-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();

      if (!res.ok || !data.customToken) {
        setError(data.error || "Email not recognized as staff.");
        return;
      }

      // Step 2: sign in with the custom token Firebase gave us
      const result = await signInWithCustomToken(auth, data.customToken);

      // Step 3: get role and redirect
      await verifyAndRedirect(result.user);
    } catch (err) {
      setError(FIREBASE_ERRORS[err.code] ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── CONTINUE WITH GOOGLE ───────────────────────────────────────────────── */
  const handleGoogleSignIn = async () => {
    reset();
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await verifyAndRedirect(result.user);
    } catch (err) {
      setError(FIREBASE_ERRORS[err.code] ?? "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <div className="staff-login-page">
      <div className="staff-login-card">

        {/* Logo */}
        <div className="sl-logo">
          <div className="sl-logo-icon">⚡</div>
          <div className="sl-logo-text">
            <span className="sl-logo-name">EV Saarthi</span>
            <span className="sl-logo-tag">Staff Portal</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="sl-title" style={{ fontSize: 22, marginBottom: 4 }}>Staff Sign In</h1>
        <p className="sl-subtitle">Enter your registered email — no password needed</p>

        {/* Error */}
        {error && (
          <div className="sl-error" role="alert">
            <AlertIcon /><span>{error}</span>
          </div>
        )}

        {/* ── GOOGLE SIGN IN ─────────────────────────────────────────────── */}
        <button
          id="staff-google-btn"
          onClick={handleGoogleSignIn}
          disabled={busy}
          style={{
            width: "100%", padding: "13px 0", marginBottom: 16,
            background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 8,
            fontSize: 14, fontWeight: 700, color: "#374151",
            cursor: busy ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
          onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = "#F9FAFB"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
        >
          {googleLoading
            ? <><span className="sl-spinner" /> Signing in...</>
            : <><GoogleIcon /> Continue with Google</>
          }
        </button>

        {/* Divider */}
        <div className="sl-divider" style={{ marginBottom: 16 }}>
          <div className="sl-divider-line" />
          <span className="sl-divider-text">or sign in with email</span>
          <div className="sl-divider-line" />
        </div>

        {/* ── EMAIL FORM ─────────────────────────────────────────────────── */}
        <form className="sl-form" onSubmit={handleEmailLogin} noValidate>
          <div className="sl-field">
            <label className="sl-label" htmlFor="sl-email">Work Email Address</label>
            <input
              id="sl-email"
              type="email"
              className="sl-input"
              placeholder="admin@evcharging.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); reset(); }}
              disabled={busy}
              autoComplete="email"
              autoFocus
            />
          </div>

          <button
            id="sl-submit"
            type="submit"
            className="sl-submit-btn"
            disabled={busy}
            style={{ marginTop: 20 }}
          >
            {loading
              ? <><span className="sl-spinner" /> Signing in...</>
              : <><MailIcon /> &nbsp;Sign In with Email</>
            }
          </button>
        </form>

        {/* Role badges */}
        <div className="sl-divider" style={{ marginTop: 28 }}>
          <div className="sl-divider-line" />
          <span className="sl-divider-text">Authorized roles</span>
          <div className="sl-divider-line" />
        </div>
        <div className="sl-roles">
          <span className="sl-role-pill superadmin">Superadmin</span>
          <span className="sl-role-pill admin">Admin / Tenant</span>
          <span className="sl-role-pill operator">Operator</span>
        </div>

        {/* Back link */}
        <button type="button" className="sl-back-link"
          onClick={() => { window.location.href = "http://localhost:3000/login"; }}>
          ← Back to User Login
        </button>

      </div>
    </div>
  );
};

export default StaffLogin;
