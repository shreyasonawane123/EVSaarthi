import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MapPage from "./pages/MapPage";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/map" element={<MapPage />} />
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
