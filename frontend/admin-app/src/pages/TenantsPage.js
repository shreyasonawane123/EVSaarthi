import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Business as BusinessIcon,
  AddBusiness as AddBusinessIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";
import { TextField } from "@mui/material";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const isSuccess = toast.type === "success";
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 9999,
      background: isSuccess ? "#F0FDF4" : "#FEF2F2",
      border: `1px solid ${isSuccess ? "#BBF7D0" : "#FECACA"}`,
      borderRadius: 12, padding: "14px 20px",
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      fontSize: 14, fontWeight: 600,
      color: isSuccess ? "#15803D" : "#DC2626",
      maxWidth: 360,
    }}>
      {isSuccess
        ? <CheckCircleIcon style={{ color: "#16A34A", fontSize: 20 }} />
        : <ErrorOutlineIcon style={{ color: "#DC2626", fontSize: 20 }} />}
      <span style={{ flex: 1 }}>{toast.msg}</span>
      <CloseIcon
        style={{ fontSize: 16, cursor: "pointer", opacity: 0.6 }}
        onClick={onClose}
      />
    </div>
  );
};

const TenantModal = ({ onClose, onSuccess, currentUser, editingTenant }) => {
  const [name, setName] = useState(editingTenant?.name || "");
  const [contactEmail, setContactEmail] = useState(editingTenant?.contactEmail || "");
  const [contactPerson, setContactPerson] = useState(editingTenant?.contactPerson || "");
  const [contactPhone, setContactPhone] = useState(editingTenant?.contactPhone || "");
  const [password, setPassword] = useState(editingTenant?.password || "");
  const [greenPointsEnabled, setGreenPointsEnabled] = useState(editingTenant?.greenPointsEnabled !== false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError("");
    if (!name) { setError("Tenant Name is required."); return; }

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      let res;

      const payload = { name, contactEmail, contactPerson, contactPhone, password, greenPointsEnabled };

      if (editingTenant) {
        res = await axios.put(`${API}/api/admin/tenants/${editingTenant.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        res = await axios.post(`${API}/api/admin/tenants`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (res.data.success) {
        onSuccess(name);
      } else {
        setError(res.data.error || "Something went wrong.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Network error or invalid data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "24px 20px",
        width: "95vw", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AddBusinessIcon style={{ color: "#3B82F6", fontSize: 26 }} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1A1A1A" }}>
              {editingTenant ? "Edit Tenant" : "Create Tenant"}
            </h2>
          </div>
          <CloseIcon onClick={onClose} style={{ cursor: "pointer", color: "#9CA3AF", fontSize: 22 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          <TextField
            label="Company / Tenant Name *"
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth size="small"
          />
          <TextField
            label="Contact Email"
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            fullWidth size="small"
          />
          <TextField
            label="Contact Person Name"
            value={contactPerson}
            onChange={e => setContactPerson(e.target.value)}
            fullWidth size="small"
          />
          <TextField
            label="Phone Number"
            type="tel"
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            fullWidth size="small"
            placeholder="e.g. +91 98765 43210"
            helperText="Contact phone number for this tenant."
          />
          <TextField
            label="Tenant Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            fullWidth size="small"
            placeholder="Enter password for tenant"
            helperText="Used if tenant needs to log in directly."
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>Green Points</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Allow users to earn Green Points at this tenant's stations</div>
            </div>
            <div
              onClick={() => setGreenPointsEnabled(!greenPointsEnabled)}
              style={{
                width: 48, height: 26, borderRadius: 13, cursor: 'pointer',
                background: greenPointsEnabled ? '#16A34A' : '#D1D5DB',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2,
                left: greenPointsEnabled ? 24 : 2,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
            padding: "10px 14px", marginBottom: 16,
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <ErrorOutlineIcon style={{ color: "#DC2626", fontSize: 18, marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#DC2626", lineHeight: 1.5 }}>{error}</span>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            width: "100%", padding: "13px 0",
            background: loading ? "#DBEAFE" : "#3B82F6",
            border: "none", borderRadius: 8,
            fontSize: 14, fontWeight: 700, color: loading ? "#1E3A8A" : "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background 0.2s",
          }}
        >
          {loading
            ? <><CircularProgress size={16} style={{ color: "#1E3A8A" }} /> Saving...</>
            : <>Save Tenant</>}
        </button>
      </div>
    </div>
  );
};

const TenantsPage = () => {
  const { currentUser, adminRole } = useAuth();

  const [tenants, setTenants] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.get(`${API}/api/admin/tenants`, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setTenants(res.data.tenants);
      }
    } catch (err) {
      console.error("Failed to fetch tenants", err);
      const serverError = err.response?.data?.error || err.message || "Failed to load tenants.";
      setToast({ type: "error", msg: serverError });
    } finally {
      setFetching(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveSuccess = (name) => {
    setShowModal(false);
    setToast({ type: "success", msg: `${name} saved successfully!` });
    fetchData();
  };

  const handleDelete = async (tenant) => {
    if (!window.confirm(`Are you sure you want to delete ${tenant.name}? This will NOT delete associated admins or stations, but they will become unlinked.`)) return;

    try {
      const token = await currentUser.getIdToken();
      const res = await axios.delete(`${API}/api/admin/tenants/${tenant.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setToast({ type: "success", msg: "Tenant deleted successfully" });
        fetchData();
      } else {
        setToast({ type: "error", msg: res.data.error || "Failed to delete tenant" });
      }
    } catch (err) {
      setToast({ type: "error", msg: "Failed to delete tenant" });
    }
  };

  if (adminRole !== "superadmin") {
    return (
      <div style={{ padding: "32px", textAlign: "center", marginTop: 40 }}>
        <h2>Access Denied</h2>
        <p>Only Platform Super Admins can manage Tenants.</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "calc(100vh - 64px)", background: "#F5F5F5",
      padding: window.innerWidth < 1024 ? "16px" : "32px 24px", fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 28,
          flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, background: "#3B82F6",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BusinessIcon style={{ color: "#fff", fontSize: 24 }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1A1A1A" }}>
                Tenants
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>
                Manage Platform Organizations
              </p>
            </div>
          </div>
          <button
            onClick={() => { setEditingTenant(null); setShowModal(true); }}
            style={{
              padding: "11px 20px", background: "#3B82F6", border: "none",
              borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#fff",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: window.innerWidth < 1024 ? "100%" : "auto"
            }}
          >
            <AddBusinessIcon fontSize="small" /> Create Tenant
          </button>
        </div>

        <div style={{
          background: "#fff", borderRadius: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden",
        }}>
          <div style={{ overflowX: "auto", width: "100%" }}>
            {fetching ? (
              <div style={{ padding: 64, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <CircularProgress style={{ color: "#3B82F6" }} size={28} />
                <span style={{ color: "#6B7280", fontSize: 14 }}>Loading tenants...</span>
              </div>
            ) : tenants.length === 0 ? (
              <div style={{ padding: 64, textAlign: "center" }}>
                <BusinessIcon style={{ fontSize: 64, color: "#D1D5DB", marginBottom: 16 }} />
                <p style={{ fontSize: 16, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>
                  No tenants found
                </p>
                <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
                  Create an organization to assign admins and stations.
                </p>
              </div>
            ) : (
              <table style={{ width: "100%", minWidth: "800px", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
                    {["Tenant Name", "Contact Email", "Contact Person", "Phone", "Green Points", "Actions"].map((h) => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: "left",
                        fontSize: 11, fontWeight: 700, color: "#6B7280",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.slice(0, visibleCount).map((t, i) => (
                    <tr
                      key={t.id}
                      style={{ borderBottom: i < tenants.length - 1 ? "1px solid #F3F4F6" : "none" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#FAFAFA"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>
                          {t.name}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>
                        {t.contactEmail || "-"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>
                        {t.contactPerson || "-"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>
                        {t.contactPhone || "-"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          background: t.greenPointsEnabled !== false ? '#F0FDF4' : '#FEF2F2',
                          color: t.greenPointsEnabled !== false ? '#16A34A' : '#DC2626',
                        }}>
                          {t.greenPointsEnabled !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <button
                            onClick={() => { setEditingTenant(t); setShowModal(true); }}
                            style={{
                              background: "transparent", border: "none", cursor: "pointer",
                              color: "#9CA3AF"
                            }}
                            title="Edit Tenant"
                          >
                            <EditIcon fontSize="small" />
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            style={{
                              background: "transparent", border: "none", cursor: "pointer",
                              color: "#FECACA"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#DC2626"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "#FECACA"}
                            title="Delete Tenant"
                          >
                            <DeleteIcon fontSize="small" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!fetching && tenants.length > visibleCount && (
            <div style={{ padding: "16px", textAlign: "center", borderTop: "1px solid #F3F4F6", background: "#F9FAFB" }}>
              <button
                onClick={() => setVisibleCount(v => v + 10)}
                style={{
                  padding: "8px 24px", background: "#fff", border: "1px solid #E5E7EB",
                  borderRadius: "20px", fontSize: "13px", fontWeight: "600",
                  color: "#374151", cursor: "pointer", transition: "all 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
              >
                Load More
              </button>
            </div>
          )}
        </div>

      </div>

      {showModal && (
        <TenantModal
          editingTenant={editingTenant}
          onClose={() => setShowModal(false)}
          onSuccess={handleSaveSuccess}
          currentUser={currentUser}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default TenantsPage;
