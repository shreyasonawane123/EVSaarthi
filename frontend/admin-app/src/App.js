// frontend/admin-app/src/App.js
// RESTORED to original structure + /staff-login route added at the top.
// All existing pages (OverviewPage, StationsPage, etc.) continue to work exactly
// as before via AdminProtectedRoute + the sessionStorage/URL-param AuthContext.

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminNavbar from "./components/AdminNavbar";

// Staff Portal login (new — standalone, no AdminNavbar)
import StaffLogin from "./pages/StaffLogin";

// Existing admin pages (untouched)
import OverviewPage  from "./pages/OverviewPage";
import StationsPage  from "./pages/StationsPage";
import UsersPage     from "./pages/UsersPage";
import TeamPage      from "./pages/TeamPage";
import ReviewsPage   from "./pages/ReviewsPage";
import OperatorsPage from "./pages/OperatorsPage";
import TenantsPage   from "./pages/TenantsPage";
import AdminPointsManagement from "./pages/AdminPointsManagement";
import OperatorPointsRequestPage from "./pages/OperatorPointsRequestPage";
import ProfilePage from "./pages/ProfilePage";

// Wrapper reads admin token from sessionStorage (matching admin-app auth pattern)
const AdminPointsManagementWrapper = () => {
  const token = sessionStorage.getItem("admin_token") || "";
  return <AdminPointsManagement token={token} />;
};


// Layout wrapper — AdminNavbar + content, used for all existing admin routes
const AdminLayout = () => (
  <div className="flex flex-col min-h-screen bg-[#F5F5F5] font-sans">
    <AdminNavbar />
    <main className="flex-grow pb-16">
      <Outlet />
    </main>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* ── PUBLIC: Staff Portal Login ─────────────────────────────────
              Standalone page, no AdminNavbar, no auth guard.
              Entry point for all staff (superadmin, admin, operator). */}
          <Route path="/staff-login" element={<StaffLogin />} />

          {/* ── PROTECTED: All existing admin routes with AdminNavbar ──────
              AdminProtectedRoute checks sessionStorage for a valid token.
              If missing → redirects to /staff-login (instead of error). */}
          <Route element={<AdminLayout />}>
            <Route path="/"         element={<AdminProtectedRoute><OverviewPage  /></AdminProtectedRoute>} />
            <Route path="/stations" element={<AdminProtectedRoute><StationsPage  /></AdminProtectedRoute>} />
            <Route path="/users"    element={<AdminProtectedRoute><UsersPage     /></AdminProtectedRoute>} />
            <Route path="/team"     element={<AdminProtectedRoute><TeamPage      /></AdminProtectedRoute>} />
            <Route path="/tenants"  element={<AdminProtectedRoute><TenantsPage   /></AdminProtectedRoute>} />
            <Route path="/operators"element={<AdminProtectedRoute><OperatorsPage /></AdminProtectedRoute>} />
            <Route path="/reviews"  element={<AdminProtectedRoute><ReviewsPage   /></AdminProtectedRoute>} />
            <Route path="/points"   element={<AdminProtectedRoute><AdminPointsManagementWrapper /></AdminProtectedRoute>} />
            <Route path="/operator-points" element={<AdminProtectedRoute><OperatorPointsRequestPage /></AdminProtectedRoute>} />
            <Route path="/profile"  element={<AdminProtectedRoute><ProfilePage /></AdminProtectedRoute>} />

            {/* Catch-all: redirect unknown paths to overview */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
