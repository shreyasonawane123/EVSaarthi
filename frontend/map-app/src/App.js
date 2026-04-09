import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MapPage from "./pages/MapPage";
import "./index.css";

function App() {
  return (
    <BrowserRouter basename="/app-map">
      <div className="App">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
