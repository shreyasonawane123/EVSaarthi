import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  AccountCircle as AccountCircleIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";
import { TextField, MenuItem, Select, InputLabel, FormControl } from "@mui/material";
import { Business as BusinessIcon } from "@mui/icons-material";

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

const AddOperatorModal = ({ onClose, onSuccess, currentUser, editingOperator, availableStations }) => {
  const [email, setEmail]     = useState(editingOperator?.email || "");
  const [name, setName]       = useState(editingOperator?.name || "");
  const [stationId, setStationId] = useState(editingOperator?.stationId || "");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError("");
    if (!email) { setError("Email is required."); return; }
    if (!stationId) { setError("Please assign a station to this operator."); return; }

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      let res;
      
      const payload = {
        name,
        email,
        stationId
      };

      if (editingOperator) {
        res = await axios.put(`${API}/api/operators/${editingOperator.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        res = await axios.post(`${API}/api/operators`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (res.data.success) {
        onSuccess(name || email);
      } else {
        setError(res.data.error || "Something went wrong.");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Network error. Please check if the services are running.";
      setError(msg);
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
              {editingOperator ? "Edit Operator" : "Add Operator"}
            </h2>
          </div>
          <CloseIcon onClick={onClose} style={{ cursor: "pointer", color: "#9CA3AF", fontSize: 22 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          <TextField 
            label="Email" 
            type="email"
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            disabled={!!editingOperator}
            fullWidth size="small"
            helperText="Operator will sign in via Google with this email."
          />
          <TextField 
            label="Name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            fullWidth size="small"
          />
          
          <FormControl fullWidth size="small">
            <InputLabel id="station-select-label">Assigned Station</InputLabel>
            <Select
              labelId="station-select-label"
              value={stationId}
              label="Assigned Station"
              onChange={e => setStationId(e.target.value)}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {availableStations.map(station => (
                <MenuItem key={station.id} value={station.id}>
                  {station.name} ({station.city})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Role info badge */}
          <div style={{
            background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8,
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 12, color: "#15803D", fontWeight: 600 }}>
              🔐 Role: <strong>Operator</strong> — No password needed. They sign in via Google.
            </span>
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
            background: loading ? "#FDE68A" : "#EAB308",
            border: "none", borderRadius: 8,
            fontSize: 14, fontWeight: 700, color: "#1A1A1A",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background 0.2s",
          }}
        >
          {loading
            ? <><CircularProgress size={16} style={{ color: "#1A1A1A" }} /> Saving...</>
            : <>Save Operator</>}
        </button>
      </div>
    </div>
  );
};

const OperatorsPage = () => {
  const { currentUser, adminRole } = useAuth();
  
  const [operators, setOperators]           = useState([]);
  const [availableStations, setAvailableStations] = useState([]);
  const [tenants, setTenants]               = useState([]);
  const [fetching, setFetching]             = useState(true);
  const [visibleCount, setVisibleCount]     = useState(10);
  const [showModal, setShowModal]           = useState(false);
  const [editingOperator, setEditingOperator]= useState(null);
  const [toast, setToast]                   = useState(null);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const token = await currentUser.getIdToken();
      
      const reqs = [
        axios.get(`${API}/api/operators`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/api/admin/stations`, { headers: { Authorization: `Bearer ${token}` } })
      ];

      if (adminRole === 'superadmin') {
        reqs.push(axios.get(`${API}/api/admin/tenants`, { headers: { Authorization: `Bearer ${token}` } }));
      }

      const results = await Promise.all(reqs);
      
      if (results[0].data.success) setOperators(results[0].data.operators);
      if (results[1].data.success) setAvailableStations(results[1].data.stations);
      if (results[2] && results[2].data.success) setTenants(results[2].data.tenants);

    } catch (err) {
      console.error("Failed to fetch data", err);
      setToast({ type: "error", msg: "Failed to load operators." });
    } finally {
      setFetching(false);
    }
  }, [currentUser, adminRole]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveSuccess = (opName) => {
    setShowModal(false);
    fetchData();
    setToast({ type: "success", msg: `Operator ${opName} saved!` });
  };
  
  const handleDelete = async (operator) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.delete(`${API}/api/operators/${operator.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setToast({ type: "success", msg: "Operator deleted successfully" });
        fetchData();
      } else {
        setToast({ type: "error", msg: res.data.error || "Failed to delete operator" });
      }
    } catch (err) {
      setToast({ type: "error", msg: "Delete failed. Check your connection." });
    }
  };

  const getStationName = (stationId) => {
    const station = availableStations.find(s => s.id === stationId);
    return station ? station.name : "Unknown / Unassigned (" + stationId + ")";
  };

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
                Operators
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>
                Manage station operators
              </p>
            </div>
          </div>
          {adminRole !== "superadmin" && (
            <button
              onClick={() => { setEditingOperator(null); setShowModal(true); }}
              style={{
                padding: "11px 20px", background: "#EAB308", border: "none",
                borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#1A1A1A",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: window.innerWidth < 1024 ? "100%" : "auto"
              }}
            >
              <PersonAddIcon fontSize="small" /> Add Operator
            </button>
          )}
        </div>

        <div style={{
          background: "#fff", borderRadius: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden",
        }}>
          <div style={{ overflowX: "auto", width: "100%" }}>
            {fetching ? (
              <div style={{ padding: 64, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <CircularProgress style={{ color: "#EAB308" }} size={28} />
                <span style={{ color: "#6B7280", fontSize: 14 }}>Loading operators...</span>
              </div>
            ) : operators.length === 0 ? (
              <div style={{ padding: 64, textAlign: "center" }}>
                <GroupIcon style={{ fontSize: 64, color: "#D1D5DB", marginBottom: 16 }} />
                <p style={{ fontSize: 16, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>
                  No operators found
                </p>
                <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
                  Add a new operator to assign them to a station.
                </p>
              </div>
            ) : (
              <table style={{ width: "100%", minWidth: "800px", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
                    {["Operator", "Email", "Assigned Station", adminRole === "superadmin" ? "Tenant" : null, "Actions"].filter(Boolean).map((h) => (
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
                  {operators.slice(0, visibleCount).map((op, i) => (
                    <tr
                      key={op.id}
                      style={{ borderBottom: i < operators.length - 1 ? "1px solid #F3F4F6" : "none" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#FAFAFA"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <AccountCircleIcon style={{ fontSize: 38, color: "#D1D5DB" }} />
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>
                            {op.name || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>
                        {op.email}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#16A34A", fontWeight: 600 }}>
                        {op.stationId ? getStationName(op.stationId) : "None"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#16A34A", fontWeight: 600 }}>
                        {op.stationId ? getStationName(op.stationId) : "None"}
                      </td>
                      {adminRole === "superadmin" && (
                         <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151", fontWeight: 700 }}>
                            {tenants.find(t => t.id === op.tenantId)?.name || "—"}
                         </td>
                      )}
                      <td style={{ padding: "14px 16px", display: "flex", gap: 12 }}>
                        {adminRole !== "superadmin" && (
                          <button
                            onClick={() => { setEditingOperator(op); setShowModal(true); }}
                            style={{
                              background: "transparent", border: "none", cursor: "pointer",
                              color: "#9CA3AF"
                            }}
                            title="Edit Operator"
                          >
                            <EditIcon fontSize="small" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(op)}
                          style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            color: "#EF4444"
                          }}
                          title="Delete Operator"
                        >
                          <DeleteIcon fontSize="small" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!fetching && operators.length > visibleCount && (
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
        <AddOperatorModal
          editingOperator={editingOperator}
          availableStations={availableStations}
          onClose={() => setShowModal(false)}
          onSuccess={handleSaveSuccess}
          currentUser={currentUser}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default OperatorsPage;
