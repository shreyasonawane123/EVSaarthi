// frontend/booking-app/src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import BookingPage from "./pages/BookingPage";
import "./index.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route 
            path="/booking" 
            element={
              <ProtectedRoute>
                <BookingPage />
              </ProtectedRoute>
            } 
          />
          {/* Default Route */}
          <Route path="*" element={<Navigate to="/booking" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
