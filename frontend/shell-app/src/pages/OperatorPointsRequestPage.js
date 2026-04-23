// frontend/shell-app/src/pages/OperatorPointsRequestPage.js
// Component 7: Route /operator/points-program
// Operators can view their station's current approved pts/hr and submit new requests.

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const STATUS_STYLES = {
  pending:  { bg: "#fffbeb", color: "#d97706", icon: "⏳" },
  approved: { bg: "#f0fdf4", color: "#16a34a", icon: "✅" },
  rejected: { bg: "#fef2f2", color: "#dc2626", icon: "❌" },
};

export default function OperatorPointsRequestPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pointsPerHour, setPointsPerHour] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "" });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 4000);
  };

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        // Get operator profile for stationId
        const meRes = await axios.get(`${API}/api/admin/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const operatorData = meRes.data.admin;
        const stId = operatorData?.stationId;
        if (stId) {
          const stRes = await axios.get(`${API}/api/stations/${stId}`);
          setStation(stRes.data.station);
        }
        // Load existing requests
        const reqRes = await axios.get(`${API}/api/admin/points/station-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRequests(reqRes.data.requests || []);
      } catch (err) {
        console.error("Failed to load operator data:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!station || !pointsPerHour) return;
    setSubmitting(true);
    try {
      const token = await currentUser.getIdToken();
      await axios.post(
        `${API}/api/operators/points-request`,
        { stationId: station.id, pointsPerHour: Number(pointsPerHour) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("✅ Request submitted! An admin will review it shortly.", "success");
      setPointsPerHour("");
      // Refresh requests
      const reqRes = await axios.get(`${API}/api/admin/points/station-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(reqRes.data.requests || []);
    } catch (err) {
      showToast("❌ " + (err.response?.data?.error || "Failed to submit request."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const latestRequest = requests[0];

  return (
    <div style={pageWrap}>
      {/* Header */}
      <div style={header}>
        <button id="op-points-back" onClick={() => navigate(-1)} style={backBtn}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1a1a1a" }}>Points Program</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Earn points for your station's customers</p>
        </div>
      </div>

      {toast.msg && (
        <div style={{ ...toastStyle, background: toast.type === "success" ? "#dcfce7" : "#fee2e2", color: toast.type === "success" ? "#15803d" : "#dc2626" }}>
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div style={centered}><div style={spinner} /></div>
      ) : (
        <>
          {/* Current Status Card */}
          {station && (
            <div style={statusCard}>
              <h2 style={sectionTitle}>📍 {station.name || "Your Station"}</h2>
              <div style={statRow}>
                <span style={statLabel}>Approved Points/Hour</span>
                <span style={{ fontWeight: 900, fontSize: 28, color: station.approvedPointsPerHour > 0 ? "#16a34a" : "#9ca3af" }}>
                  {station.approvedPointsPerHour > 0 ? `${station.approvedPointsPerHour} pts/hr` : "Not approved yet"}
                </span>
              </div>
            </div>
          )}

          {/* Latest Request Status */}
          {latestRequest && (
            <div style={{ ...requestCard, background: STATUS_STYLES[latestRequest.status]?.bg || "#f9fafb" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{STATUS_STYLES[latestRequest.status]?.icon}</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: STATUS_STYLES[latestRequest.status]?.color }}>
                    Latest Request: {latestRequest.status.charAt(0).toUpperCase() + latestRequest.status.slice(1)}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                    {latestRequest.pointsPerHour} pts/hr requested
                    {latestRequest.createdAt ? ` · ${new Date(latestRequest.createdAt).toLocaleDateString("en-IN")}` : ""}
                  </p>
                </div>
              </div>
              {latestRequest.adminNote && (
                <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: "8px 12px", fontSize: 13, color: "#374151" }}>
                  <strong>Admin Note:</strong> {latestRequest.adminNote}
                </div>
              )}
            </div>
          )}

          {/* Submit New Request */}
          <div style={formCard}>
            <h2 style={sectionTitle}>📋 Submit New Request</h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280" }}>
              Request a points-per-hour reward for customers who charge at your station.
            </p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={inputLabel}>Points per Hour</label>
                <input
                  id="op-points-per-hour"
                  type="number"
                  min={5}
                  max={200}
                  value={pointsPerHour}
                  onChange={(e) => setPointsPerHour(e.target.value)}
                  placeholder="e.g. 30"
                  required
                  style={inputStyle}
                />
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>
                  Typical range: 10–50 pts/hr. Higher values require admin justification.
                </p>
              </div>
              {!station && (
                <p style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
                  ⚠️ You must be assigned to a station before submitting a request.
                </p>
              )}
              <button
                id="op-submit-request-btn"
                type="submit"
                disabled={submitting || !station}
                style={{
                  ...submitBtn,
                  opacity: (!station || submitting) ? 0.6 : 1,
                  cursor: (!station || submitting) ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </div>

          {/* Request History */}
          {requests.length > 1 && (
            <div style={formCard}>
              <h2 style={sectionTitle}>📜 Request History</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {requests.slice(1).map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{r.pointsPerHour} pts/hr</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : ""}</p>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: STATUS_STYLES[r.status]?.color }}>
                      {STATUS_STYLES[r.status]?.icon} {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const pageWrap = { maxWidth: 560, margin: "0 auto", padding: "24px 16px 80px" };
const header = { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 };
const backBtn = { background: "#f3f4f6", border: "none", borderRadius: 12, width: 40, height: 40, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const toastStyle = { borderRadius: 14, padding: "12px 18px", fontSize: 14, fontWeight: 700, marginBottom: 16 };
const centered = { display: "flex", justifyContent: "center", padding: 60 };
const spinner = { width: 36, height: 36, border: "3px solid #dcfce7", borderTop: "3px solid #16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
const statusCard = { background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: "20px 24px", marginBottom: 16 };
const requestCard = { borderRadius: 20, border: "1px solid #e5e7eb", padding: "16px 20px", marginBottom: 16 };
const formCard = { background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: "20px 24px", marginBottom: 16 };
const sectionTitle = { margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#1a1a1a" };
const statRow = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const statLabel = { fontSize: 13, color: "#6b7280", fontWeight: 600 };
const inputLabel = { display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" };
const inputStyle = { width: "100%", padding: "12px 16px", borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 16, fontWeight: 600, outline: "none", boxSizing: "border-box" };
const submitBtn = { background: "linear-gradient(135deg,#15803d,#22c55e)", color: "#fff", border: "none", borderRadius: 14, padding: "14px", fontWeight: 800, fontSize: 15, width: "100%", transition: "opacity 0.2s" };
