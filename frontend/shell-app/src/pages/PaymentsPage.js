// frontend/shell-app/src/pages/PaymentsPage.js
// My Payments — UPI-style payment history (like PhonePe / Paytm)

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Payment as PaymentIcon,
  EvStation as EvStationIcon,
  Receipt as ReceiptIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Stars as StarsIcon,
} from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

/* ── helpers ────────────────────────────────────────────────────────────────── */
const fmtAmount = (n) => `₹${(Number(n) || 0).toFixed(2)}`;
const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};
const fmtTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
};

/* ── Payment Detail Modal ─────────────────────────────────────────────────── */
const PaymentDetailModal = ({ payment, onClose }) => {
  const [copied, setCopied] = useState(null);

  const copy = (text, field) => {
    navigator.clipboard.writeText(text || "");
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!payment) return null;

  const statusColor = payment.status === "confirmed" ? "#16A34A" : payment.status === "completed" ? "#16A34A" : "#EAB308";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000,
      padding: 16,
    }} onClick={onClose}>
      <div
        style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 420,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #16A34A, #22c55e)",
          padding: "24px 20px", color: "#fff", position: "relative",
        }}>
          <CloseIcon
            onClick={onClose}
            style={{ position: "absolute", top: 16, right: 16, cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: 22 }}
          />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.85, marginBottom: 4 }}>Payment Successful</div>
            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>{fmtAmount(payment.amount)}</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.2)", borderRadius: 20,
              padding: "4px 14px", marginTop: 8, fontSize: 12, fontWeight: 700,
            }}>
              <CheckCircleIcon style={{ fontSize: 14 }} />
              {(payment.status || "confirmed").toUpperCase()}
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: "20px" }}>
          {/* Station */}
          <DetailRow
            icon={<EvStationIcon style={{ color: "#16A34A", fontSize: 20 }} />}
            label="Charging Station"
            value={payment.stationName || "—"}
          />

          {/* Slot */}
          <DetailRow
            icon={<CalendarIcon style={{ color: "#3B82F6", fontSize: 20 }} />}
            label="Booking Slot"
            value={`${payment.slotDate || "—"} at ${payment.slotTime || "—"}`}
          />

          {/* Duration */}
          <DetailRow
            icon={<TimeIcon style={{ color: "#8B5CF6", fontSize: 20 }} />}
            label="Duration"
            value={`${payment.duration || 0} minutes`}
          />

          {/* Points Earned */}
          {payment.pointsEarned > 0 && (
            <DetailRow
              icon={<StarsIcon style={{ color: "#EAB308", fontSize: 20 }} />}
              label="Green Points Earned"
              value={`+${payment.pointsEarned} pts`}
              valueColor="#16A34A"
            />
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "#F3F4F6", margin: "16px 0" }} />

          {/* Razorpay Payment ID */}
          <DetailRow
            icon={<ReceiptIcon style={{ color: "#6B7280", fontSize: 20 }} />}
            label="Payment ID"
            value={payment.paymentId || "—"}
            copyable
            onCopy={() => copy(payment.paymentId, "paymentId")}
            isCopied={copied === "paymentId"}
          />

          {/* Order ID */}
          <DetailRow
            icon={<ReceiptIcon style={{ color: "#6B7280", fontSize: 20 }} />}
            label="Order ID"
            value={payment.orderId || "—"}
            copyable
            onCopy={() => copy(payment.orderId, "orderId")}
            isCopied={copied === "orderId"}
          />

          {/* Booking Ref */}
          <DetailRow
            icon={<ReceiptIcon style={{ color: "#6B7280", fontSize: 20 }} />}
            label="Booking Reference"
            value={payment.bookingId || "—"}
            copyable
            onCopy={() => copy(payment.bookingId, "bookingId")}
            isCopied={copied === "bookingId"}
          />

          {/* Divider */}
          <div style={{ height: 1, background: "#F3F4F6", margin: "16px 0" }} />

          {/* Timestamp */}
          <DetailRow
            icon={<TimeIcon style={{ color: "#6B7280", fontSize: 20 }} />}
            label="Date & Time"
            value={`${fmtDate(payment.createdAt)} ${fmtTime(payment.createdAt)}`}
          />

          {/* UTC Time */}
          <DetailRow
            icon={<TimeIcon style={{ color: "#9CA3AF", fontSize: 20 }} />}
            label="UTC Time"
            value={payment.createdAtUTC || "—"}
            valueColor="#6B7280"
          />
        </div>
      </div>
    </div>
  );
};

/* ── Detail Row Component ─────────────────────────────────────────────────── */
const DetailRow = ({ icon, label, value, copyable, onCopy, isCopied, valueColor }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 0", gap: 12,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
      {icon}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: valueColor || "#1A1A1A",
          wordBreak: "break-all",
        }}>{value}</div>
      </div>
    </div>
    {copyable && (
      <button
        onClick={onCopy}
        style={{
          border: "none", background: isCopied ? "#F0FDF4" : "#F9FAFB",
          borderRadius: 6, padding: "6px 8px", cursor: "pointer",
          color: isCopied ? "#16A34A" : "#9CA3AF", fontSize: 11, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
        }}
      >
        {isCopied ? <><CheckCircleIcon style={{ fontSize: 14 }} /> Copied</> : <><CopyIcon style={{ fontSize: 14 }} /> Copy</>}
      </button>
    )}
  </div>
);

/* ── Main Payments Page ───────────────────────────────────────────────────── */
const PaymentsPage = () => {
  const { currentUser } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.get(`${API}/api/bookings/my-payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setPayments(res.data.payments);
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // Summary
  const totalSpent = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPoints = payments.reduce((s, p) => s + (Number(p.pointsEarned) || 0), 0);

  return (
    <div style={{
      minHeight: "calc(100vh - 64px)", background: "#F5F5F5",
      padding: window.innerWidth < 768 ? "16px" : "32px 24px",
      fontFamily: "'Segoe UI', Inter, Arial, sans-serif",
    }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 24,
        }}>
          <button
            onClick={() => window.history.back()}
            style={{
              border: "none", background: "#fff", borderRadius: 10, width: 40, height: 40,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <ArrowBackIcon style={{ fontSize: 20, color: "#374151" }} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#1A1A1A" }}>
              My Payments
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6B7280" }}>
              Your complete payment history
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{
            background: "linear-gradient(135deg, #16A34A, #22c55e)", borderRadius: 16,
            padding: "20px 16px", color: "#fff",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Spent</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4, letterSpacing: -0.5 }}>{fmtAmount(totalSpent)}</div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #3B82F6, #60a5fa)", borderRadius: 16,
            padding: "20px 16px", color: "#fff",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Transactions</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{payments.length}</div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, #EAB308, #facc15)", borderRadius: 16,
            padding: "20px 16px", color: "#1A1A1A",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" }}>Points Earned</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{totalPoints}</div>
          </div>
        </div>

        {/* Payment List */}
        <div style={{
          background: "#fff", borderRadius: 16,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 20px", borderBottom: "1px solid #F3F4F6",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <PaymentIcon style={{ color: "#16A34A", fontSize: 22 }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: "#1A1A1A" }}>Payment History</span>
          </div>

          {loading ? (
            <div style={{ padding: 64, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <CircularProgress style={{ color: "#16A34A" }} size={28} />
              <span style={{ color: "#6B7280", fontSize: 14 }}>Loading payments...</span>
            </div>
          ) : payments.length === 0 ? (
            <div style={{ padding: 64, textAlign: "center" }}>
              <PaymentIcon style={{ fontSize: 56, color: "#D1D5DB", marginBottom: 12 }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>
                No payments yet
              </p>
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
                Your payment history will appear here after your first booking.
              </p>
            </div>
          ) : (
            <div>
              {payments.map((p, i) => (
                <div
                  key={p.bookingId || i}
                  onClick={() => setSelected(p)}
                  style={{
                    padding: "16px 20px",
                    borderBottom: i < payments.length - 1 ? "1px solid #F9FAFB" : "none",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#FAFAFA"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                    {/* Icon */}
                    <div style={{
                      width: 44, height: 44,
                      background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)",
                      borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <EvStationIcon style={{ color: "#16A34A", fontSize: 22 }} />
                    </div>
                    {/* Info */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.stationName || "Charging Session"}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                        {fmtDate(p.createdAt)} • {p.slotTime || fmtTime(p.createdAt)}
                      </div>
                      {p.paymentId && (
                        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, fontFamily: "monospace" }}>
                          {p.paymentId}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Amount */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#DC2626" }}>
                      -{fmtAmount(p.amount)}
                    </div>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 10, fontWeight: 700, marginTop: 4,
                      color: p.status === "confirmed" || p.status === "completed" ? "#16A34A" : "#EAB308",
                      background: p.status === "confirmed" || p.status === "completed" ? "#F0FDF4" : "#FFFBEB",
                      padding: "2px 8px", borderRadius: 10,
                    }}>
                      <CheckCircleIcon style={{ fontSize: 10 }} />
                      {(p.status || "confirmed").toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <PaymentDetailModal payment={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
};

export default PaymentsPage;
