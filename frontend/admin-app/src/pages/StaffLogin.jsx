// frontend/admin-app/src/pages/StaffLogin.jsx
// ──────────────────────────────────────────────────────────────────────────────
// Staff Portal Login — self-contained, no dependency on AuthContext.
//
// THREE tabs:
//   Sign In   → signInWithEmailAndPassword → /api/admin/me → redirect via URL params
//   Register  → createUserWithEmailAndPassword → check /api/admin/me
//   Forgot PW → sendPasswordResetEmail (also works to set up password for Google users)
//
// On successful login, redirects to:
//   /?token=<idToken>&name=<name>&role=<role>
// This triggers the existing AuthContext (sessionStorage flow) and lands the user
// on the Overview page with full role-based filtering already working.
// ──────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase/config";
import "./StaffLogin.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const FIREBASE_ERRORS = {
  "auth/user-not-found":      "No account found with this email.",
  "auth/wrong-password":      "Incorrect password. Use Forgot Password to reset it.",
  "auth/invalid-credential":  "Incorrect email or password.",
  "auth/invalid-email":       "Please enter a valid email address.",
  "auth/user-disabled":       "This account has been disabled.",
  "auth/too-many-requests":   "Too many failed attempts. Please try again later.",
  "auth/email-already-in-use":"An account with this email already exists. Try signing in instead.",
  "auth/weak-password":       "Password must be at least 6 characters.",
  "auth/popup-closed-by-user":"Login popup was closed. Please try again.",
  "auth/network-request-failed": "Network error. Please check your internet connection.",
  "auth/operation-not-allowed": "Email/Password sign-in is not enabled for this project.",
};

/* ── Small icon components ───────────────────────────────────────────────── */
const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const AlertIcon = () => (
  <svg style={{flexShrink:0,marginTop:1}} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const CheckIcon = () => (
  <svg style={{flexShrink:0,marginTop:1}} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

/* ── Main component ──────────────────────────────────────────────────────── */
const StaffLogin = () => {
  const [tab,         setTab]         = useState("login"); // "login" | "register" | "forgot"
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [name,        setName]        = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

  const reset = () => { setError(""); setSuccess(""); };
  const switchTab = (t) => { setTab(t); reset(); };

  /* ── SIGN IN ──────────────────────────────────────────────────────────── */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
    reset(); setLoading(true);

    try {
      const result  = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await result.user.getIdToken();

      const res  = await fetch(`${API}/api/admin/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();

      if (data.success) {
        // ✅ Redirect via URL params — triggers existing AuthContext sessionStorage flow
        const adminName = encodeURIComponent(data.admin.name || email.trim());
        window.location.href = `/?token=${idToken}&name=${adminName}&role=${data.admin.role}`;
      } else if (res.status === 404) {
        await signOut(auth);
        setError("You are not authorized to access the Staff Portal. Contact your platform administrator.");
      } else {
        await signOut(auth);
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError(FIREBASE_ERRORS[err.code] ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── FORGOT / SET UP PASSWORD ─────────────────────────────────────────── */
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    reset(); setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(
        "Email sent! Check your inbox for a link to set up or reset your password. " +
        "This also works if you previously used Google login — you can add a password to your account."
      );
    } catch (err) {
      console.error("[StaffLogin] ForgotPassword Error:", err);
      const msg = FIREBASE_ERRORS[err.code] || err.message || "Could not send email.";
      setError(msg + " Please check the address and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────── */
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

        {/* Tab switcher */}
        <div style={{display:"flex",gap:4,background:"rgba(255,255,255,0.06)",borderRadius:12,padding:4,marginBottom:28}}>
          {[
            { key:"login",    label:"Sign In"         },
            { key:"forgot",   label:"Forgot Password" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              style={{
                flex:1, padding:"8px 4px",
                background: tab === t.key ? "rgba(22,163,74,0.25)" : "transparent",
                border: tab === t.key ? "1px solid rgba(22,163,74,0.4)" : "1px solid transparent",
                borderRadius:9, fontSize:12, fontWeight:700,
                color: tab === t.key ? "#4ade80" : "rgba(255,255,255,0.35)",
                cursor:"pointer", transition:"all 0.2s", fontFamily:"inherit",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <h1 className="sl-title" style={{fontSize:22,marginBottom:4}}>
          {tab === "login"    && "Staff Sign In"}
          {tab === "forgot"   && "Set Up Password"}
        </h1>
        <p className="sl-subtitle">
          {tab === "login"    && "Sign in to access your admin dashboard"}
          {tab === "forgot"   && "Send a password setup link to your email"}
        </p>

        {/* Error */}
        {error && (
          <div className="sl-error" role="alert">
            <AlertIcon /><span>{error}</span>
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{
            background:"rgba(22,163,74,0.12)", border:"1px solid rgba(22,163,74,0.3)",
            borderRadius:10, padding:"11px 14px", fontSize:13, fontWeight:600,
            color:"#86efac", marginBottom:20, display:"flex", alignItems:"flex-start", gap:8,
          }}>
            <CheckIcon /><span>{success}</span>
          </div>
        )}

        {/* ── SIGN IN FORM ──────────────────────────────────────────────── */}
        {tab === "login" && (
          <form className="sl-form" onSubmit={handleLogin} noValidate>
            <div className="sl-field">
              <label className="sl-label" htmlFor="sl-email">Email Address</label>
              <input id="sl-email" type="email" className="sl-input"
                placeholder="admin@evcharging.com"
                value={email} onChange={e => { setEmail(e.target.value); reset(); }}
                disabled={loading} autoComplete="username" autoFocus />
            </div>
            <div className="sl-field">
              <label className="sl-label" htmlFor="sl-password">Password</label>
              <div className="sl-input-wrap">
                <input id="sl-password" type={showPw ? "text" : "password"}
                  className="sl-input has-toggle"
                  placeholder="••••••••"
                  value={password} onChange={e => { setPassword(e.target.value); reset(); }}
                  disabled={loading} autoComplete="current-password" />
                <button type="button" className="sl-toggle-btn"
                  onClick={() => setShowPw(v => !v)} tabIndex={-1}
                  aria-label={showPw ? "Hide password" : "Show password"}>
                  {showPw ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>
            <button type="button" onClick={() => switchTab("forgot")}
              style={{
                background:"none",border:"none",color:"rgba(22,163,74,0.7)",
                fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left",
                padding:"0 0 4px",fontFamily:"inherit",
              }}>
              Forgot password or need to set one up?
            </button>
            <button id="sl-submit" type="submit" className="sl-submit-btn" disabled={loading}>
              {loading ? <><span className="sl-spinner" /> Signing in...</> : "Sign In to Staff Portal"}
            </button>
          </form>
        )}

        {/* ── FORGOT PASSWORD FORM ───────────────────────────────────────── */}
        {tab === "forgot" && !success && (
          <form className="sl-form" onSubmit={handleForgotPassword} noValidate>
            <div style={{
              background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",
              borderRadius:10,padding:"10px 14px",fontSize:12,color:"#93c5fd",marginBottom:4,
            }}>
              💡 If you previously signed in with Google, you can use this to <strong>add a password</strong> to your account for Staff Portal access.
            </div>
            <div className="sl-field">
              <label className="sl-label" htmlFor="sl-forgot-email">Your Email Address</label>
              <input id="sl-forgot-email" type="email" className="sl-input"
                placeholder="your@email.com"
                value={email} onChange={e => { setEmail(e.target.value); reset(); }}
                disabled={loading} autoFocus />
            </div>
            <button id="sl-forgot-submit" type="submit" className="sl-submit-btn" disabled={loading}>
              {loading ? <><span className="sl-spinner" /> Sending...</> : "Send Password Setup Email"}
            </button>
          </form>
        )}

        {/* Role badges */}
        <div className="sl-divider" style={{marginTop:24}}>
          <div className="sl-divider-line" />
          <span className="sl-divider-text">Authorized roles</span>
          <div className="sl-divider-line" />
        </div>
        <div className="sl-roles">
          <span className="sl-role-pill superadmin">Superadmin</span>
          <span className="sl-role-pill admin">Admin</span>
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
