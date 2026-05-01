// frontend/admin-app/src/pages/AdminPointsManagement.js
// Component 8: Route /admin/points — admin panel for Green Points
// Sections: Configuration, Buy Points (Wallet), Station Requests, Accessories

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const STATUS_COLOR = { pending: "#d97706", approved: "#16a34a", rejected: "#dc2626", paid: "#16a34a", failed: "#dc2626" };

export default function AdminPointsManagement({ token }) {
  const { adminRole } = useAuth();
  const [tab, setTab] = useState(adminRole === "admin" ? "wallet" : "config");

  const tabs = [
    { key: "config", label: "⚙️ Configuration", roles: ["superadmin"] },
    { key: "wallet", label: "💰 Buy Points" },
    { key: "requests", label: "📋 Station Requests", roles: ["admin"] },
    { key: "accessories", label: "🛍️ Accessories" },
  ].filter(t => !t.roles || t.roles.includes(adminRole));

  return (
    <div style={pageWrap}>
      <div style={titleRow}>
        <h1 style={pageTitle}>💚 Green Points Management</h1>
        <p style={pageSub}>Configure rewards, purchase points, manage requests, and accessories</p>
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
      {tab === "wallet" && <WalletSection token={token} />}
      {tab === "requests" && <RequestsSection token={token} />}
      {tab === "accessories" && <AccessoriesSection token={token} />}
    </div>
  );
}

// ── Config Section ─────────────────────────────────────────────
function ConfigSection({ token }) {
  const [cfg, setCfg] = useState({ pointValueInRupees: "", minRedemptionPoints: "", purchasePricePerPoint: "", minPointsPurchase: "", pointsExpiryDays: "365" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    axios.get(`${API}/api/admin/points/config`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        const c = r.data.config;
        setCfg({ pointValueInRupees: c.pointValueInRupees, minRedemptionPoints: c.minRedemptionPoints, purchasePricePerPoint: c.purchasePricePerPoint || 0.50, minPointsPurchase: c.minPointsPurchase || 1000, pointsExpiryDays: c.pointsExpiryDays || 365 });
      })
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
      <p style={sectionSub}>Changes apply to all new redemptions and purchases immediately.</p>
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
        <div>
          <label style={inputLabel}>Purchase Price (₹ per point)</label>
          <input id="cfg-purchase-price" type="number" step="0.01" min="0.01" value={cfg.purchasePricePerPoint}
            onChange={(e) => setCfg((p) => ({ ...p, purchasePricePerPoint: e.target.value }))} style={inputStyle} />
          <p style={hint}>Admin pays ₹{cfg.purchasePricePerPoint} to buy 1 Green Point</p>
        </div>
        <div>
          <label style={inputLabel}>Minimum Purchase (points)</label>
          <input id="cfg-min-purchase" type="number" min="100" value={cfg.minPointsPurchase}
            onChange={(e) => setCfg((p) => ({ ...p, minPointsPurchase: e.target.value }))} style={inputStyle} />
          <p style={hint}>Admin must buy at least {cfg.minPointsPurchase} pts per order</p>
        </div>
        <div>
          <label style={inputLabel}>Points Expiry (days)</label>
          <input id="cfg-expiry-days" type="number" min="30" max="3650" value={cfg.pointsExpiryDays}
            onChange={(e) => setCfg((p) => ({ ...p, pointsExpiryDays: e.target.value }))} style={inputStyle} />
          <p style={hint}>Points expire {cfg.pointsExpiryDays} days after being earned (~{Math.round(cfg.pointsExpiryDays / 365 * 10) / 10} year{cfg.pointsExpiryDays > 365 ? 's' : ''})</p>
        </div>
      </div>
      <button id="cfg-save-btn" onClick={save} disabled={saving} style={{ ...saveBtn, marginTop: 24 }}>
        {saving ? "Saving..." : "Save Configuration"}
      </button>
    </div>
  );
}

// ── Wallet / Buy Points Section ────────────────────────────────
function WalletSection({ token }) {
  const { adminRole } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [allTenants, setAllTenants] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [visiblePurchases, setVisiblePurchases] = useState(10);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pointsInput, setPointsInput] = useState("");
  const [manualPoints, setManualPoints] = useState("");
  const [manualTenantId, setManualTenantId] = useState("");
  const [buying, setBuying] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const h = { headers: { Authorization: `Bearer ${token}` } };
      const [walletRes, histRes, cfgRes] = await Promise.all([
        axios.get(`${API}/api/admin/points/wallet`, h),
        axios.get(`${API}/api/admin/points/purchase/history`, h),
        axios.get(`${API}/api/admin/points/config`, h),
      ]);
      if (adminRole === "superadmin") {
        const tRes = await axios.get(`${API}/api/admin/tenants`, h);
        setAllTenants(tRes.data.tenants || []);
        setWallets(walletRes.data.wallets || []);
      } else {
        setWallet(walletRes.data.wallet || { availablePoints: 0, totalPurchased: 0, totalDistributed: 0 });
      }
      setPurchases(histRes.data.purchases || []);
      setConfig(cfgRes.data.config || {});
    } catch (e) { console.error("Wallet load error:", e); }
    finally { setLoading(false); }
  }, [token, adminRole]);

  useEffect(() => { load(); }, [load]);

  const loadRazorpayScript = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handleBuy = async () => {
    const pts = Number(pointsInput);
    if (!pts || pts <= 0) return;
    setBuying(true);
    try {
      const h = { headers: { Authorization: `Bearer ${token}` } };
      const orderRes = await axios.post(`${API}/api/admin/points/purchase/order`, { pointsRequested: pts }, h);
      const { orderId, amount, currency, purchaseDocId } = orderRes.data;

      const loaded = await loadRazorpayScript();
      if (!loaded) { setToast("❌ Razorpay SDK failed to load"); setBuying(false); return; }

      const options = {
        key: "rzp_test_SXwCfEf5EfAy8k",
        amount, currency,
        order_id: orderId,
        name: "EV Saarthi",
        description: `Purchase ${pts} Green Points`,
        handler: async (response) => {
          try {
            await axios.post(`${API}/api/admin/points/purchase/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              purchaseDocId,
            }, h);
            setToast(`✅ ${pts} Green Points purchased successfully!`);
            setPointsInput("");
            load();
          } catch (e) {
            setToast("❌ Payment verification failed: " + (e.response?.data?.error || e.message));
          }
          setBuying(false);
        },
        modal: { ondismiss: () => setBuying(false) },
        theme: { color: "#16a34a" },
      };
      new window.Razorpay(options).open();
    } catch (e) {
      setToast("❌ " + (e.response?.data?.error || "Failed to create order"));
      setBuying(false);
    }
    setTimeout(() => setToast(""), 5000);
  };

  const handleManualCredit = async () => {
    if (!manualTenantId || !manualPoints) return;
    if (!window.confirm(`Credit ${manualPoints} points manually?`)) return;
    setBuying(true);
    try {
      const h = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API}/api/admin/points/manual-credit`, {
        tenantId: manualTenantId,
        pointsToCredit: Number(manualPoints)
      }, h);
      setToast(`✅ ${manualPoints} Green Points credited manually!`);
      setManualPoints("");
      setManualTenantId("");
      load();
    } catch (e) {
      setToast("❌ " + (e.response?.data?.error || "Failed to credit points manually"));
    } finally {
      setBuying(false);
    }
    setTimeout(() => setToast(""), 5000);
  };

  if (loading) return <div style={centered}><div style={spinner} /></div>;

  const pricePerPt = config?.purchasePricePerPoint || 0.50;
  const minPurchase = config?.minPointsPurchase || 1000;
  const calcTotal = pointsInput ? (Number(pointsInput) * pricePerPt).toFixed(2) : "0.00";

  return (
    <div>
      {toast && <div style={{ ...toastStyle, background: toast.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: toast.startsWith("✅") ? "#15803d" : "#dc2626" }}>{toast}</div>}

      {/* Wallet Balance */}
      {adminRole === "superadmin" ? (
        <>
          <div style={sectionCard}>
            <h2 style={sectionH2}>🏦 All Tenant Wallets</h2>
            <p style={sectionSub}>Overview of all tenant point balances</p>
            {wallets.length === 0 ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: 30, fontWeight: 600 }}>No tenants have purchased points yet</p>
            ) : (
              <div style={{ overflowX: "auto", marginTop: 16 }}>
                <table style={tableStyle}><thead><tr>
                  {["Tenant", "Available", "Purchased", "Distributed"].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr></thead><tbody>
                    {wallets.map(w => (
                      <tr key={w.tenantId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={tdStyle}><strong>{w.tenantName}</strong></td>
                        <td style={{ ...tdStyle, fontWeight: 800, color: w.availablePoints > 0 ? "#16a34a" : "#dc2626" }}>{(w.availablePoints || 0).toLocaleString("en-IN")} pts</td>
                        <td style={tdStyle}>{(w.totalPurchased || 0).toLocaleString("en-IN")} pts</td>
                        <td style={tdStyle}>{(w.totalDistributed || 0).toLocaleString("en-IN")} pts</td>
                      </tr>
                    ))}
                  </tbody></table>
              </div>
            )}
          </div>

          {/* Manual Credit Form for Superadmin */}
          <div style={{ ...sectionCard, marginTop: 16 }}>
            <h2 style={sectionH2}>⚡ Manual Point Credit</h2>
            <p style={sectionSub}>Directly add points to an admin's wallet (offline payment / manual override).</p>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={inputLabel}>Select Tenant</label>
                <select id="wallet-tenant-select" value={manualTenantId} onChange={e => setManualTenantId(e.target.value)} style={inputStyle}>
                  <option value="">-- Choose Tenant --</option>
                  {allTenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={inputLabel}>Points to Credit</label>
                <input id="wallet-manual-pts" type="number" min="1" value={manualPoints} onChange={e => setManualPoints(e.target.value)} placeholder="e.g. 1000" style={inputStyle} />
              </div>
              <button id="wallet-manual-btn" onClick={handleManualCredit} disabled={buying || !manualTenantId || !manualPoints || Number(manualPoints) < 1}
                style={{ ...saveBtn, background: "linear-gradient(135deg, #d97706, #f59e0b)", opacity: (!manualTenantId || !manualPoints || Number(manualPoints) < 1 || buying) ? 0.5 : 1, padding: "11px 24px" }}>
                {buying ? "Processing..." : "⚡ Add Points"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ ...sectionCard, background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1.5px solid #bbf7d0" }}>
          <h2 style={{ ...sectionH2, color: "#15803d" }}>🏦 Your Green Points Wallet</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 16, marginTop: 16 }}>
            <div style={walletStat}><p style={walletLabel}>Available</p><p style={{ ...walletValue, color: (wallet?.availablePoints || 0) > 0 ? "#15803d" : "#dc2626" }}>{(wallet?.availablePoints || 0).toLocaleString("en-IN")}</p></div>
            <div style={walletStat}><p style={walletLabel}>Total Purchased</p><p style={walletValue}>{(wallet?.totalPurchased || 0).toLocaleString("en-IN")}</p></div>
            <div style={walletStat}><p style={walletLabel}>Distributed</p><p style={walletValue}>{(wallet?.totalDistributed || 0).toLocaleString("en-IN")}</p></div>
          </div>
        </div>
      )}

      {/* Purchase Form (Hidden for superadmin) */}
      {adminRole !== "superadmin" && (
        <div style={{ ...sectionCard, marginTop: 16 }}>
          <h2 style={sectionH2}>🛒 Buy Green Points</h2>
          <p style={sectionSub}>Purchase points to distribute to your customers. Rate: ₹{pricePerPt}/point · Min: {minPurchase.toLocaleString("en-IN")} pts</p>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={inputLabel}>Points to Buy</label>
              <input id="wallet-pts-input" type="number" min={minPurchase} value={pointsInput} onChange={e => setPointsInput(e.target.value)} placeholder={`Min ${minPurchase}`} style={inputStyle} />
            </div>
            <div style={{ minWidth: 140, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Total Cost</p>
              <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 900, color: "#1a1a1a" }}>₹{calcTotal}</p>
            </div>
            <button id="wallet-buy-btn" onClick={handleBuy} disabled={buying || !pointsInput || Number(pointsInput) < minPurchase}
              style={{ ...saveBtn, opacity: (!pointsInput || Number(pointsInput) < minPurchase || buying) ? 0.5 : 1, padding: "14px 32px", flex: 1, minWidth: "140px" }}>
              {buying ? "Processing..." : "💳 Pay & Buy"}
            </button>
          </div>
        </div>
      )}

      {/* Purchase History */}
      <div style={{ ...sectionCard, marginTop: 16 }}>
        <h2 style={sectionH2}>📜 Purchase History</h2>
        {adminRole === "superadmin" && (
          <p style={{ ...sectionSub, marginTop: 4 }}>
            💡 Pending orders where payment was made can be fixed using the <strong>Fix</strong> button.
          </p>
        )}
        {purchases.length === 0 ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: 30, fontWeight: 600 }}>No purchases yet</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={tableStyle}><thead><tr>
              {adminRole === "superadmin" && <th style={thStyle}>Tenant</th>}
              {["Points", "Amount", "Status", "Date"].map(h => <th key={h} style={thStyle}>{h}</th>)}
              {adminRole === "superadmin" && <th style={thStyle}>Action</th>}
            </tr></thead><tbody>
                {purchases.slice(0, visiblePurchases).map(p => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    {adminRole === "superadmin" && <td style={tdStyle}><strong>{p.tenantName || "Unknown"}</strong></td>}
                    <td style={tdStyle}><strong>{(p.pointsRequested || 0).toLocaleString("en-IN")} pts</strong></td>
                    <td style={tdStyle}>₹{(p.totalAmount || 0).toLocaleString("en-IN")}</td>
                    <td style={tdStyle}><span style={{ fontWeight: 700, color: STATUS_COLOR[p.status] || "#374151" }}>{p.status}</span></td>
                    <td style={tdStyle}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                    {adminRole === "superadmin" && (
                      <td style={tdStyle}>
                        {p.status === "pending" ? (
                          <FixButton purchaseDocId={p.id} token={token} onFixed={load} />
                        ) : (
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody></table>
            {purchases.length > visiblePurchases && (
              <div style={{ textAlign: "center", padding: "16px", borderTop: "1px solid #f3f4f6", background: "#f9fafb" }}>
                <button
                  onClick={() => setVisiblePurchases(v => v + 10)}
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
        )}
      </div>
    </div>
  );
}
// ── Fix Button (Superadmin: fix stuck-pending orders) ─────────
function FixButton({ purchaseDocId, token, onFixed }) {
  const [fixing, setFixing] = useState(false);
  const [done, setDone] = useState(false);

  const handleFix = async () => {
    if (!window.confirm("Mark this order as paid and credit the wallet?")) return;
    setFixing(true);
    try {
      await axios.post(`${API}/api/admin/points/purchase/fix`,
        { purchaseDocId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDone(true);
      onFixed();
    } catch (e) {
      alert("Fix failed: " + (e.response?.data?.error || e.message));
    } finally {
      setFixing(false);
    }
  };

  if (done) return <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>✅ Fixed</span>;
  return (
    <button onClick={handleFix} disabled={fixing}
      style={{ background: "#fff7ed", color: "#d97706", border: "1px solid #fde68a", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
      {fixing ? "..." : "⚡ Fix"}
    </button>
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
const walletStat = { background: "rgba(255,255,255,0.7)", borderRadius: 14, padding: "16px 20px", textAlign: "center", border: "1px solid #bbf7d0" };
const walletLabel = { margin: 0, fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" };
const walletValue = { margin: "6px 0 0", fontSize: 28, fontWeight: 900, color: "#1a1a1a" };
