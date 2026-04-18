import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminNavbar from "./components/AdminNavbar";

import OverviewPage from "./pages/OverviewPage";
import StationsPage from "./pages/StationsPage";
import UsersPage from "./pages/UsersPage";
import TeamPage from "./pages/TeamPage";
import ReviewsPage from "./pages/ReviewsPage";
import OperatorsPage from "./pages/OperatorsPage";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen bg-[#F5F5F5] font-sans">
          <AdminNavbar />
          <main className="flex-grow pb-16">
            <Routes>
              {/* Protected Admin Routes */}
              <Route path="/" element={<AdminProtectedRoute><OverviewPage /></AdminProtectedRoute>} />
              <Route path="/stations" element={<AdminProtectedRoute><StationsPage /></AdminProtectedRoute>} />
              <Route path="/users" element={<AdminProtectedRoute><UsersPage /></AdminProtectedRoute>} />
              <Route path="/team" element={<AdminProtectedRoute><TeamPage /></AdminProtectedRoute>} />
              <Route path="/operators" element={<AdminProtectedRoute><OperatorsPage /></AdminProtectedRoute>} />
              <Route path="/reviews" element={<AdminProtectedRoute><ReviewsPage /></AdminProtectedRoute>} />

              {/* Default catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
