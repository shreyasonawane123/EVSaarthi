// frontend/admin-app/src/pages/AdminPointsManagement.js
// Component 8: Route /admin/points — three-section admin panel for Green Points
// Sections: Configuration, Station Requests, Accessories Management

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const STATUS_COLOR = { pending: "#d97706", approved: "#16a34a", rejected: "#dc2626" };

export default function AdminPointsManagement({ token }) {
  const { adminRole } = useAuth();
  const [tab, setTab] = useState("config");

  const tabs = [
    { key: "config", label: "⚙️ Configuration" },
    { key: "requests", label: "📋 Station Requests", roles: ["admin"] },
    { key: "accessories", label: "🛍️ Accessories" },
  ].filter(t => !t.roles || t.roles.includes(adminRole));

  return (
    <div style={pageWrap}>
      <div style={titleRow}>
        <h1 style={pageTitle}>💚 Green Points Management</h1>
        <p style={pageSub}>Configure rewards, manage station requests, and the accessories catalog</p>
      </div>

      {/* Tab navigation */}
      <div style={tabBar}>
        {tabs.map((t) => (
          <button
            key={t.key}
            id={`admin-points-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            style={{ ...tabBtn, ...(tab === t.key ? tabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "config" && <ConfigSection token={token} />}
      {tab === "requests" && <RequestsSection token={token} />}
      {tab === "accessories" && <AccessoriesSection token={token} />}
    </div>
  );
}

// ── Config Section ─────────────────────────────────────────────
function ConfigSection({ token }) {
  const [cfg, setCfg] = useState({ pointValueInRupees: "", minRedemptionPoints: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    axios.get(`${API}/api/admin/points/config`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setCfg({ pointValueInRupees: r.data.config.pointValueInRupees, minRedemptionPoints: r.data.config.minRedemptionPoints }))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [token]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/admin/points/config`, cfg, { headers: { Authorization: `Bearer ${token}` } });
      setToast("✅ Configuration saved!");
      setTimeout(() => setToast(""), 3000);
    } catch (e) {
      setToast("❌ " + (e.response?.data?.error || "Failed to save"));
      setTimeout(() => setToast(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={centered}><div style={spinner} /></div>;

  return (
    <div style={sectionCard}>
      <h2 style={sectionH2}>Points Configuration</h2>
      <p style={sectionSub}>Changes apply to all new redemptions immediately.</p>
      {toast && <div style={{ ...toastStyle, background: toast.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: toast.startsWith("✅") ? "#15803d" : "#dc2626" }}>{toast}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
        <div>
          <label style={inputLabel}>Point Value (₹ per point)</label>
          <input id="cfg-point-value" type="number" step="0.01" min="0.01" value={cfg.pointValueInRupees}
            onChange={(e) => setCfg((p) => ({ ...p, pointValueInRupees: e.target.value }))} style={inputStyle} />
          <p style={hint}>Current: 1 pt = ₹{cfg.pointValueInRupees}</p>
        </div>
        <div>
          <label style={inputLabel}>Minimum Redemption (points)</label>
          <input id="cfg-min-redemption" type="number" min="100" value={cfg.minRedemptionPoints}
            onChange={(e) => setCfg((p) => ({ ...p, minRedemptionPoints: e.target.value }))} style={inputStyle} />
          <p style={hint}>Min {cfg.minRedemptionPoints} pts = ₹{(cfg.minRedemptionPoints * cfg.pointValueInRupees).toFixed(0)} discount</p>
        </div>
      </div>
      <button id="cfg-save-btn" onClick={save} disabled={saving} style={{ ...saveBtn, marginTop: 24 }}>
        {saving ? "Saving..." : "Save Configuration"}
      </button>
    </div>
  );
}

// ── Requests Section ───────────────────────────────────────────
function RequestsSection({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [acting, setActing] = useState(null);
  const [toast, setToast] = useState("");

  const load = () => {
    axios.get(`${API}/api/admin/points/station-requests`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setRequests(r.data.requests || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const act = async (id, status) => {
    setActing(id + status);
    try {
      await axios.patch(`${API}/api/admin/points/station-requests/${id}`, { status, adminNote: notes[id] || "" }, { headers: { Authorization: `Bearer ${token}` } });
      setToast(`✅ Request ${status}!`);
      setTimeout(() => setToast(""), 3000);
      load();
    } catch (e) {
      setToast("❌ " + (e.response?.data?.error || "Action failed"));
      setTimeout(() => setToast(""), 3000);
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div style={centered}><div style={spinner} /></div>;

  return (
    <div style={sectionCard}>
      <h2 style={sectionH2}>Station Points Requests</h2>
      <p style={sectionSub}>Review and approve operator requests for station-based point rewards.</p>
      {toast && <div style={{ ...toastStyle, background: toast.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: toast.startsWith("✅") ? "#15803d" : "#dc2626" }}>{toast}</div>}
      {requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontWeight: 600 }}>No pending requests</div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Station", "Operator", "Pts/Hr", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}><strong>{r.stationName || r.stationId}</strong></td>
                  <td style={tdStyle}>{r.operatorId?.slice(0, 8)}…</td>
                  <td style={tdStyle}><strong>{r.pointsPerHour}</strong></td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: STATUS_COLOR[r.status] || "#374151" }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={tdStyle}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                  <td style={tdStyle}>
                    {r.status === "pending" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          id={`approve-req-${r.id}`}
                          onClick={() => act(r.id, "approved")}
                          disabled={acting === r.id + "approved"}
                          style={{ ...approveBtn }}
                        >✓ Approve</button>
                        <button
                          id={`reject-req-${r.id}`}
                          onClick={() => act(r.id, "rejected")}
                          disabled={acting === r.id + "rejected"}
                          style={{ ...rejectBtn }}
                        >✗ Reject</button>
                      </div>
                    )}
                    {r.status !== "pending" && <span style={{ color: "#9ca3af", fontSize: 12 }}>Done</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Accessories Section ────────────────────────────────────────
function AccessoriesSection({ token }) {
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", imageUrl: "", pointsRequired: "", stockCount: "-1" });
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");

  const load = () => {
    axios.get(`${API}/api/points/accessories`)
      .then((r) => setAccessories(r.data.accessories || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await axios.post(`${API}/api/points/accessories`, { ...form, pointsRequired: Number(form.pointsRequired), stockCount: Number(form.stockCount) }, { headers: { Authorization: `Bearer ${token}` } });
      setToast("✅ Accessory added!");
      setTimeout(() => setToast(""), 3000);
      setForm({ name: "", description: "", imageUrl: "", pointsRequired: "", stockCount: "-1" });
      load();
    } catch (e) {
      setToast("❌ " + (e.response?.data?.error || "Failed to add"));
      setTimeout(() => setToast(""), 3000);
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (acc) => {
    try {
      await axios.put(`${API}/api/points/accessories/${acc.id}`, { isActive: !acc.isActive }, { headers: { Authorization: `Bearer ${token}` } });
      load();
    } catch { }
  };

  if (loading) return <div style={centered}><div style={spinner} /></div>;

  return (
    <div>
      {/* Add New */}
      <div style={sectionCard}>
        <h2 style={sectionH2}>Add New Accessory</h2>
        {toast && <div style={{ ...toastStyle, background: toast.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: toast.startsWith("✅") ? "#15803d" : "#dc2626" }}>{toast}</div>}
        <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={inputLabel}>Name *</label>
            <input id="acc-name" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Type-2 Charging Cable" style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={inputLabel}>Description</label>
            <input id="acc-desc" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Short description" style={inputStyle} />
          </div>
          <div>
            <label style={inputLabel}>Image URL</label>
            <input id="acc-img" value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." style={inputStyle} />
          </div>
          <div>
            <label style={inputLabel}>Points Required *</label>
            <input id="acc-pts" type="number" required min="1" value={form.pointsRequired} onChange={(e) => setForm((p) => ({ ...p, pointsRequired: e.target.value }))} placeholder="e.g. 1000" style={inputStyle} />
          </div>
          <div>
            <label style={inputLabel}>Stock Count (-1 = unlimited)</label>
            <input id="acc-stock" type="number" value={form.stockCount} onChange={(e) => setForm((p) => ({ ...p, stockCount: e.target.value }))} placeholder="-1" style={inputStyle} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button id="acc-add-btn" type="submit" disabled={adding} style={{ ...saveBtn, width: "100%" }}>
              {adding ? "Adding..." : "➕ Add Accessory"}
            </button>
          </div>
        </form>
      </div>

      {/* Existing accessories table */}
      <div style={{ ...sectionCard, marginTop: 16 }}>
        <h2 style={sectionH2}>Existing Accessories ({accessories.length})</h2>
        {accessories.length === 0 ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>No accessories yet</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {["Name", "Points", "Stock", "Active", "Action"].map((h) => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {accessories.map((acc) => (
                  <tr key={acc.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: acc.isActive ? 1 : 0.5 }}>
                    <td style={tdStyle}><strong>{acc.name}</strong></td>
                    <td style={tdStyle}>{(acc.pointsRequired || acc.pointsCost || 0).toLocaleString("en-IN")} pts</td>
                    <td style={tdStyle}>{acc.stockCount === -1 ? "∞" : acc.stockCount}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, color: acc.isActive ? "#16a34a" : "#9ca3af" }}>
                        {acc.isActive ? "Yes" : "No"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        id={`toggle-acc-${acc.id}`}
                        onClick={() => toggleActive(acc)}
                        style={{ ...rejectBtn, background: acc.isActive ? "#fee2e2" : "#dcfce7", color: acc.isActive ? "#dc2626" : "#15803d" }}
                      >
                        {acc.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────
const pageWrap = { padding: "24px 20px 80px", maxWidth: 900, margin: "0 auto" };
const titleRow = { marginBottom: 24 };
const pageTitle = { margin: "0 0 4px", fontSize: 24, fontWeight: 900, color: "#1a1a1a" };
const pageSub = { margin: 0, fontSize: 14, color: "#6b7280" };
const tabBar = { display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" };
const tabBtn = { background: "#f3f4f6", border: "none", borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s" };
const tabActive = { background: "#15803d", color: "#fff" };
const sectionCard = { background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", padding: "24px 28px" };
const sectionH2 = { margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: "#1a1a1a" };
const sectionSub = { margin: "0 0 0", fontSize: 13, color: "#6b7280" };
const toastStyle = { borderRadius: 12, padding: "10px 16px", fontSize: 14, fontWeight: 700, marginBottom: 16 };
const inputLabel = { display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, fontWeight: 500, outline: "none", boxSizing: "border-box" };
const hint = { margin: "4px 0 0", fontSize: 12, color: "#9ca3af" };
const saveBtn = { background: "linear-gradient(135deg,#15803d,#22c55e)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 800, fontSize: 14, cursor: "pointer" };
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = { textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #f3f4f6", whiteSpace: "nowrap" };
const tdStyle = { padding: "12px 12px", fontSize: 14, verticalAlign: "middle" };
const approveBtn = { background: "#dcfce7", color: "#15803d", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const rejectBtn = { background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const centered = { display: "flex", justifyContent: "center", padding: 60 };
const spinner = { width: 36, height: 36, border: "3px solid #dcfce7", borderTop: "3px solid #16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite" };
