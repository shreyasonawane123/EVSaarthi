// frontend/profile-app/src/App.js
// Standalone profile-app — Profile page only (port 3006)

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ProfilePage from "./pages/ProfilePage";
import VehiclePage from "./pages/VehiclePage";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/vehicle" element={<ProtectedRoute><VehiclePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/profile" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
