// frontend/shell-app/src/components/ReferralCodeInput.js
// Component 4: Optional referral code input for first-time profile setup.
// Only renders when the user profile does NOT yet exist (isNewUser prop = true).

import React from "react";

export default function ReferralCodeInput({ value, onChange, isNewUser }) {
  if (!isNewUser) return null;

  return (
    <div style={wrapStyle}>
      <label style={labelStyle} htmlFor="referral-code-input">
        Have a referral code? <span style={{ fontWeight: 500, color: "#9ca3af" }}>(Optional)</span>
      </label>
      <div style={inputWrap}>
        <span style={prefixIcon}>🎁</span>
        <input
          id="referral-code-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="e.g. EV-X7K2P9"
          maxLength={9}
          style={inputStyle}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <p style={hintStyle}>Enter a friend's referral code to earn 100 bonus Green Points!</p>
    </div>
  );
}

const wrapStyle = {
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: 16,
  padding: "16px 20px",
};
const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "#92400e",
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
const inputWrap = { position: "relative" };
const prefixIcon = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: 18,
  pointerEvents: "none",
};
const inputStyle = {
  width: "100%",
  paddingLeft: 44,
  paddingRight: 16,
  paddingTop: 12,
  paddingBottom: 12,
  background: "#fff",
  border: "1px solid #fde68a",
  borderRadius: 12,
  fontFamily: "monospace",
  fontWeight: 700,
  fontSize: 16,
  letterSpacing: "0.1em",
  color: "#92400e",
  outline: "none",
  boxSizing: "border-box",
};
const hintStyle = {
  margin: "8px 0 0",
  fontSize: 12,
  color: "#d97706",
  fontWeight: 500,
};
