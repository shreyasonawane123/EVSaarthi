// frontend/admin-app/src/pages/TeamPage.js
// Admin Team Management — superadmin only
// Add / remove admins by email without touching Firebase Console

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  AccountCircle as AccountCircleIcon,
  Email as EmailIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import { TextField, MenuItem } from "@mui/material";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

// ─── Toast ───────────────────────────────────────────────────────────────────
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

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
const ConfirmDialog = ({ admin, onCancel, onConfirm, loading }) => (
  <div style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000,
  }}>
    <div style={{
      background: "#fff", borderRadius: 16, padding: 32,
      width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <PersonRemoveIcon style={{ color: "#DC2626", fontSize: 28 }} />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1A1A1A" }}>
          Remove Admin?
        </h2>
      </div>
      <p style={{ margin: "0 0 6px", fontSize: 15, color: "#374151" }}>
        Remove <strong>{admin.name}</strong> as admin?
      </p>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "#6B7280" }}>
        They will lose all admin access immediately.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onCancel} disabled={loading} style={{
          flex: 1, padding: "10px 0", borderRadius: 8, border: "1.5px solid #E5E7EB",
          background: "#F9FAFB", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#374151",
        }}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} style={{
          flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
          background: "#DC2626", cursor: loading ? "not-allowed" : "pointer",
          fontSize: 14, fontWeight: 700, color: "#fff", opacity: loading ? 0.7 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          {loading && <CircularProgress size={14} style={{ color: "#fff" }} />}
          Remove
        </button>
      </div>
    </div>
  </div>
);

// ─── Add Admin Modal ──────────────────────────────────────────────────────────
const AddAdminModal = ({ onClose, onSuccess, currentUser, tenants }) => {
  const [email, setEmail]     = useState("");
  const [tenantId, setTenantId]= useState("none");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Please enter an email address."); return; }
    if (tenants.length > 0 && tenantId === "none") {
      setError("Please select a tenant organization."); return;
    }

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const payload = { email: trimmed };
      if (tenantId !== "none" && tenantId) {
        payload.tenantId = tenantId;
      }

      const res = await axios.post(`${API}/api/admin/team/add`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        onSuccess(res.data.admin?.name || trimmed);
      } else {
        setError(res.data.error || "Something went wrong.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Network error. Is the admin service running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "24px 20px",
        width: "95vw", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PersonAddIcon style={{ color: "#EAB308", fontSize: 26 }} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1A1A1A" }}>
              Add New Admin
            </h2>
          </div>
          <CloseIcon onClick={onClose} style={{ cursor: "pointer", color: "#9CA3AF", fontSize: 22 }} />
        </div>

        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
          The person must have logged in to EV Saarthi at least once before being added as admin.
        </p>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <EmailIcon style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "#9CA3AF", fontSize: 20, pointerEvents: "none",
          }} />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Enter their email address"
            style={{
              width: "100%", padding: "12px 12px 12px 42px",
              border: `1.5px solid ${error ? "#FECACA" : "#E5E7EB"}`,
              borderRadius: 8, fontSize: 14, color: "#1A1A1A",
              outline: "none", boxSizing: "border-box",
            }}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <TextField
            select
            fullWidth
            label="Assign to Tenant"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            size="small"
          >
            <MenuItem value="none">
              <em>-- Select Tenant --</em>
            </MenuItem>
            {tenants.map(t => (
              <MenuItem key={t.id} value={t.id}>
                <BusinessIcon style={{ fontSize: 18, color: '#9CA3AF', marginRight: 8 }} />
                {t.name}
              </MenuItem>
            ))}
          </TextField>
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
          onClick={handleAdd}
          disabled={loading}
          style={{
            width: "100%", padding: "13px 0",
            background: loading ? "#FDE68A" : "#EAB308",
            border: "none", borderRadius: 8,
            fontSize: 14, fontWeight: 700, color: "#1A1A1A",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {loading
            ? <><CircularProgress size={16} style={{ color: "#1A1A1A" }} /> Adding...</>
            : <><PersonAddIcon fontSize="small" /> Add Admin</>}
        </button>
      </div>
    </div>
  );
};

// ─── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => (
  <span style={{
    background: role === "superadmin" ? "#F5F3FF" : "#F0FDF4",
    color:      role === "superadmin" ? "#7C3AED"  : "#16A34A",
    fontSize: 11, fontWeight: 700,
    padding: "3px 10px", borderRadius: 20,
  }}>
    {role === "superadmin" ? "Superadmin" : "Admin"}
  </span>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const TeamPage = () => {
  const { currentUser, adminRole } = useAuth();
  const navigate = useNavigate();

  const [admins, setAdmins]               = useState([]);
  const [tenants, setTenants]             = useState([]);
  const [fetching, setFetching]           = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [removeTarget, setRemoveTarget]   = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [toast, setToast]                 = useState(null);

  useEffect(() => {
    if (adminRole && adminRole !== "superadmin") {
      navigate("/admin", { replace: true });
    }
  }, [adminRole, navigate]);

  const getToken = useCallback(async () => {
    if (!currentUser) return null;
    return await currentUser.getIdToken();
  }, [currentUser]);

  const fetchAdmins = useCallback(async () => {
    setFetching(true);
    try {
      const token = await getToken();
      
      const [adminsRes, tenantsRes] = await Promise.all([
        axios.get(`${API}/api/admin/team`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/api/admin/tenants`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (adminsRes.data.success) {
        setAdmins(adminsRes.data.admins);
      } else {
        setToast({ type: "error", msg: adminsRes.data.error || "Failed to load team." });
      }

      if (tenantsRes.data.success) {
        setTenants(tenantsRes.data.tenants);
      }

    } catch (err) {
      console.error("Failed to fetch team data", err);
      setToast({ type: "error", msg: "Network error. Is admin-service running?" });
    } finally {
      setFetching(false);
    }
  }, [getToken]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleAddSuccess = (name) => {
    setShowModal(false);
    setToast({ type: "success", msg: `${name} added as admin!` });
    fetchAdmins();
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoveLoading(true);
    try {
      const token = await getToken();
      const res = await axios.delete(`${API}/api/admin/team/${removeTarget.uid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setToast({ type: "success", msg: `${removeTarget.name} removed as admin.` });
        fetchAdmins();
      } else {
        setToast({ type: "error", msg: res.data.error || "Failed to remove admin." });
      }
    } catch {
      setToast({ type: "error", msg: "Network error." });
    } finally {
      setRemoveLoading(false);
      setRemoveTarget(null);
    }
  };

  if (adminRole && adminRole !== "superadmin") return null;

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
              width: 44, height: 44, background: "#EAB308",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <GroupIcon style={{ color: "#1A1A1A", fontSize: 24 }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1A1A1A" }}>
                Admin Team
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>
                Manage who has admin access to EV Saarthi
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "11px 20px", background: "#EAB308", border: "none",
              borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#1A1A1A",
              cursor: "pointer", boxShadow: "0 2px 8px rgba(234,179,8,0.3)",
              width: window.innerWidth < 1024 ? "100%" : "auto"
            }}
          >
            <PersonAddIcon fontSize="small" />
            Add New Admin
          </button>
        </div>

        <div style={{
          background: "#fff", borderRadius: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden",
        }}>
          <div style={{ overflowX: "auto", width: "100%" }}>
          {fetching ? (
            <div style={{ padding: 64, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <CircularProgress style={{ color: "#EAB308" }} size={28} />
              <span style={{ color: "#6B7280", fontSize: 14 }}>Loading team...</span>
            </div>
          ) : (
            <table style={{ width: "100%", minWidth: "800px", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
                  {["Member", "Email", "Tenant", "Role", "Added On", "Actions"].map((h) => (
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
                {admins.map((a, i) => {
                  const isYou = a.name === currentUser?.displayName;
                  return (
                    <tr
                      key={a.uid}
                      style={{ borderBottom: i < admins.length - 1 ? "1px solid #F3F4F6" : "none" }}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <AccountCircleIcon style={{ fontSize: 38, color: "#D1D5DB" }} />
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>
                              {a.name || "Unknown"}
                            </span>
                            {isYou && (
                              <span style={{
                                background: "#EFF6FF", color: "#2563EB",
                                fontSize: 10, fontWeight: 700,
                                padding: "1px 8px", borderRadius: 20,
                              }}>
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>{a.email}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: a.tenantId ? "#1A1A1A" : "#D1D5DB" }}>
                        {a.tenantId ? (tenants.find(t => t.id === a.tenantId)?.name || "Unknown") : "—"}
                      </td>
                      <td style={{ padding: "14px 16px" }}><RoleBadge role={a.role} /></td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#6B7280" }}>{fmtDate(a.createdAt)}</td>
                      <td style={{ padding: "14px 16px" }}>
                        {a.role === "admin" && !isYou ? (
                          <button
                            onClick={() => setRemoveTarget(a)}
                            style={{
                              padding: "7px 12px", border: "1.5px solid #FECACA",
                              borderRadius: 8, background: "#FEF2F2",
                              color: "#DC2626", fontSize: 12, fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <PersonRemoveIcon fontSize="small" /> Remove
                          </button>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          </div>
        </div>
      </div>

      {showModal && (
        <AddAdminModal
          onClose={() => setShowModal(false)}
          onSuccess={handleAddSuccess}
          currentUser={currentUser}
          tenants={tenants}
        />
      )}

      {removeTarget && (
        <ConfirmDialog
          admin={removeTarget}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={handleRemove}
          loading={removeLoading}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default TeamPage;
