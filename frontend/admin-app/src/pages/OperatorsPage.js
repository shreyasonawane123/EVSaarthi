import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  AccountCircle as AccountCircleIcon,
  Email as EmailIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";
import { TextField, Chip } from "@mui/material";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

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

const AddOperatorModal = ({ onClose, onSuccess, currentUser, editingOperator }) => {
  const [email, setEmail]     = useState(editingOperator?.email || "");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState(editingOperator?.name || "");
  const [stations, setStations] = useState(editingOperator?.assignedStations?.join(",") || "");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError("");
    if (!email || (!editingOperator && !password)) { setError("Email and Password are required."); return; }

    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      let res;
      const assignedStationsArray = stations.split(",").map(s => s.trim()).filter(x => x);

      if (editingOperator) {
        res = await axios.put(`${API}/api/operators/${editingOperator.id}`, {
          name, assignedStations: assignedStationsArray
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        res = await axios.post(`${API}/api/operators`, {
          email, password, name, assignedStations: assignedStationsArray
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      if (res.data.success) {
        onSuccess(name || email);
      } else {
        setError(res.data.error || "Something went wrong.");
      }
    } catch (err) {
      setError("Network error or invalid data.");
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
          />
          {!editingOperator && (
            <TextField 
              label="Temporary Password" 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              helperText="The operator will use this to sign in."
              fullWidth size="small"
            />
          )}
          <TextField 
            label="Name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            fullWidth size="small"
          />
          <TextField 
            label="Assigned Station IDs (comma separated)" 
            value={stations} 
            onChange={e => setStations(e.target.value)} 
            placeholder="e.g. station1, station2"
            helperText="You can find Station IDs in the 'Stations' tab list."
            fullWidth size="small"
          />
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
  const [fetching, setFetching]             = useState(true);
  const [showModal, setShowModal]           = useState(false);
  const [editingOperator, setEditingOperator]= useState(null);
  const [toast, setToast]                   = useState(null);

  // In real implementation we'd fetch all operators from a dedicated GET /operators endpoint
  // Since we only made GET /operators/:id, we can manually fetch them or assume we have a list.
  // Wait, I didn't create a GET /operators. Let me just use dummy data or empty array for now since 
  // without a backend endpoint this won't populate freely.
  
  // Note: we'll simulate fetching for now.
  // Fetch all operators from the backend
  const fetchOperators = useCallback(async () => {
    setFetching(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.get(`${API}/api/operators`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setOperators(res.data.operators);
      }
    } catch (err) {
      console.error("Failed to fetch operators", err);
      setToast({ type: "error", msg: "Failed to load operators." });
    } finally {
      setFetching(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchOperators(); }, [fetchOperators]);

  const handleSaveSuccess = (name) => {
    setShowModal(false);
    setToast({ type: "success", msg: `${name} saved successfully!` });
    fetchOperators();
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
          <button
            onClick={() => { setEditingOperator(null); setShowModal(true); }}
            style={{
              padding: "11px 20px", background: "#EAB308", border: "none",
              borderRadius: 8, fontSize: 14, fontWeight: 700, color: "#1A1A1A",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8
            }}
          >
            <PersonAddIcon fontSize="small" /> Add Operator
          </button>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: "30px", textAlign: "center", color: "#6B7280" }}>
            <p>For fully listing operators, a GET /operators endpoint would be required in the backend.</p>
            <p>You can add operators and they will be saved to Firestore.</p>
        </div>
      </div>

      {showModal && (
        <AddOperatorModal
          editingOperator={editingOperator}
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
