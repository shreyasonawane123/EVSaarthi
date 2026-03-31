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
} from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";

const API = process.env.REACT_APP_API_GATEWAY_URL || "http://localhost:5000";

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
// Receives currentUser so it can call getIdToken() asynchronously
const AddAdminModal = ({ onClose, onSuccess, currentUser }) => {
  const [email, setEmail]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Please enter an email address."); return; }

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res   = await fetch(`${API}/api/admin/team/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(data.admin?.name || trimmed);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Network error. Is the admin service running?");
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
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PersonAddIcon style={{ color: "#EAB308", fontSize: 26 }} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1A1A1A" }}>
              Add New Admin
            </h2>
          </div>
          <CloseIcon onClick={onClose} style={{ cursor: "pointer", color: "#9CA3AF", fontSize: 22 }} />
        </div>

        {/* Description */}
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
          The person must have logged in to EV Saarthi at least once before being added as admin.
        </p>

        {/* Email input */}
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
              fontFamily: "'Segoe UI', Arial, sans-serif",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#EAB308"; }}
            onBlur={(e)  => { e.target.style.borderColor = error ? "#FECACA" : "#E5E7EB"; }}
            autoFocus
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
            padding: "10px 14px", marginBottom: 16,
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <ErrorOutlineIcon style={{ color: "#DC2626", fontSize: 18, marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#DC2626", lineHeight: 1.5 }}>
              {error}
              {error.toLowerCase().includes("not found") && (
                <><br /><strong>→ They should open localhost:3000 and sign in with Google first.</strong></>
              )}
            </span>
          </div>
        )}

        {/* Submit */}
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
            transition: "background 0.2s",
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
  const [fetching, setFetching]           = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [removeTarget, setRemoveTarget]   = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [toast, setToast]                 = useState(null);

  // Access guard — only superadmin
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
      const res   = await fetch(`${API}/api/admin/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAdmins(data.admins);
      else setToast({ type: "error", msg: data.error || "Failed to load team." });
    } catch {
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
      const res   = await fetch(`${API}/api/admin/team/${removeTarget.uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ type: "success", msg: `${removeTarget.name} removed as admin.` });
        fetchAdmins();
      } else {
        setToast({ type: "error", msg: data.error || "Failed to remove admin." });
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

        {/* ── Header ── */}
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
              transition: "background 0.2s",
              width: window.innerWidth < 1024 ? "100%" : "auto"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#D97706"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#EAB308"}
          >
            <PersonAddIcon fontSize="small" />
            Add New Admin
          </button>
        </div>

        {/* ── Table card ── */}
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
          ) : admins.filter(a => a.role !== "superadmin").length === 0 ? (
            <div style={{ padding: 64, textAlign: "center" }}>
              <GroupIcon style={{ fontSize: 64, color: "#D1D5DB", marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>
                No admins found
              </p>
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
                Add teammates as admins using the button above.
              </p>
            </div>
          ) : (
            <table style={{ width: "100%", minWidth: "800px", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
                  {["Member", "Email", "Role", "Added On", "Actions"].map((h) => (
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
                {admins
                  .filter(a => a.role !== "superadmin")
                  .map((a, i, filtered) => {
                  // "You" detection: match by display name (best heuristic available in iframe context)
                  const isYou = a.name === currentUser?.displayName;
                  return (
                    <tr
                      key={a.uid}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F3F4F6" : "none" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#FAFAFA"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Avatar + Name */}
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

                      {/* Email */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 13, color: "#374151" }}>{a.email}</span>
                      </td>

                      {/* Role */}
                      <td style={{ padding: "14px 16px" }}>
                        <RoleBadge role={a.role} />
                      </td>

                      {/* Added On */}
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 13, color: "#6B7280" }}>{fmtDate(a.createdAt)}</span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px" }}>
                        {a.role === "admin" && !isYou ? (
                          <button
                            onClick={() => setRemoveTarget(a)}
                            title={`Remove ${a.name}`}
                            style={{
                              display: "flex", alignItems: "center", gap: 4,
                              padding: "7px 12px", border: "1.5px solid #FECACA",
                              borderRadius: 8, background: "#FEF2F2",
                              color: "#DC2626", fontSize: 12, fontWeight: 700,
                              cursor: "pointer", transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#DC2626";
                              e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#FEF2F2";
                              e.currentTarget.style.color = "#DC2626";
                            }}
                          >
                            <PersonRemoveIcon fontSize="small" />
                            Remove
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: "#D1D5DB" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          </div>
        </div>

        {/* Count */}
        {!fetching && admins.filter(a => a.role !== "superadmin").length > 0 && (
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 10, textAlign: "right" }}>
            {admins.filter(a => a.role !== "superadmin").length} admin{admins.filter(a => a.role !== "superadmin").length !== 1 ? "s" : ""} total
          </p>
        )}
      </div>

      {/* Add Admin Modal */}
      {showModal && (
        <AddAdminModal
          onClose={() => setShowModal(false)}
          onSuccess={handleAddSuccess}
          currentUser={currentUser}
        />
      )}

      {/* Confirm Remove Dialog */}
      {removeTarget && (
        <ConfirmDialog
          admin={removeTarget}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={handleRemove}
          loading={removeLoading}
        />
      )}

      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default TeamPage;
