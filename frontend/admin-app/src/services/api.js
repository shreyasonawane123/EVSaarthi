// frontend/admin-app/src/services/api.js
// Central Axios instance — used for EVERY API call in the staff portal.
// Automatically attaches a fresh Firebase ID token on every request.
// On 401, force-refreshes the token and retries once.

import axios from "axios";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  timeout: 10000,
});

// ── Request interceptor ────────────────────────────────────────────────────────
// Attach a fresh Firebase ID token before every request.
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        console.warn("[api] Could not get ID token:", err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────────────────────────────
// On 401 → force-refresh token and retry once.
// If retry also 401s → sign out and redirect to /staff-login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const user = auth.currentUser;
        if (user) {
          const freshToken = await user.getIdToken(true); // force refresh
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("[api] Token refresh failed:", refreshError);
      }
      // Refresh failed or no user — sign out and redirect
      await signOut(auth);
      window.location.href = "/staff-login";
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
