// frontend/shell-app/src/App.js
// Main container — routing for all EV Saarthi pages

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import VehiclePage from "./pages/VehiclePage";
import MapPage from "./pages/MapPage";
import BookingPage from "./pages/BookingPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminFrame from "./components/AdminFrame";
import PointsHistoryPage from "./pages/PointsHistoryPage";
import RewardsTab from "./pages/RewardsTab";
import OperatorPointsRequestPage from "./pages/OperatorPointsRequestPage";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Protected */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/vehicle" element={<ProtectedRoute><VehiclePage /></ProtectedRoute>} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/booking" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/points-history" element={<ProtectedRoute><PointsHistoryPage /></ProtectedRoute>} />
              <Route path="/rewards" element={<ProtectedRoute><RewardsTab /></ProtectedRoute>} />
              <Route path="/operator/points-program" element={<ProtectedRoute><OperatorPointsRequestPage /></ProtectedRoute>} />

              {/* Admin Panel (Standalone App) */}
              <Route path="/admin/*" element={<AdminFrame />} />

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
