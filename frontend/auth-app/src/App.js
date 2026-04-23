// frontend/auth-app/src/App.js
// Standalone auth-app — Login page only (port 3001)

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";

// StaffLogin is served by admin-app, but we declare this route here so that
// the "Staff Portal Login →" button's navigate("/staff-login") works when
// auth-app is the active micro-frontend. It simply redirects to the admin-app
// origin where the real StaffLogin lives.
const StaffLoginRedirect = () => {
  const adminAppOrigin =
    process.env.REACT_APP_ADMIN_URL || "http://localhost:3002";
  React.useEffect(() => {
    window.location.href = `${adminAppOrigin}/staff-login`;
  }, []);
  return null;
};

function App() {
  return (
    <AuthProvider>
      <Router basename="/app-auth">
        <Routes>
          <Route path="/"             element={<LoginPage />} />
          <Route path="/login"        element={<LoginPage />} />
          <Route path="/staff-login"  element={<StaffLoginRedirect />} />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
