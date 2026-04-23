// frontend/admin-app/src/pages/dashboards/SuperAdminDashboard.jsx
// Skeleton dashboard for the Superadmin role.
// Shows user info from AuthContext, working logout, and sidebar nav.
// No real data fetching — shell only.

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./dashboard.css";

const NAV_LINKS = [
  { path: "/superadmin/dashboard", label: "Dashboard",  icon: "⬛" },
  { path: "/superadmin/tenants",   label: "Tenants",    icon: "🏢" },
  { path: "/superadmin/team",      label: "Team",       icon: "👥" },
  { path: "/superadmin/stations",  label: "Stations",   icon: "⚡" },
  { path: "/superadmin/users",     label: "All Users",  icon: "👤" },
  { path: "/superadmin/reviews",   label: "Reviews",    icon: "⭐" },
];

const SuperAdminDashboard = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { appUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/staff-login", { replace: true });
  };

  const initials = appUser?.name
    ? appUser.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "SA";

  return (
    <div className="dash-root">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">
          <div className="dash-logo-icon">⚡</div>
          <div>
            <div className="dash-logo-name">EV Saarthi</div>
            <span className="dash-logo-badge superadmin">Superadmin</span>
          </div>
        </div>

        <nav className="dash-nav">
          {NAV_LINKS.map((link) => (
            <button
              key={link.path}
              className={`dash-nav-link ${location.pathname === link.path ? "active" : ""}`}
              onClick={() => navigate(link.path)}
            >
              <span className="nav-icon">{link.icon}</span>
              {link.label}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <button className="dash-logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="dash-main">
        {/* Top bar */}
        <header className="dash-topbar">
          <span className="dash-topbar-title">Superadmin Dashboard</span>
          <div className="dash-user-info">
            <span className="dash-role-badge superadmin">Superadmin</span>
            <div>
              <div className="dash-user-name">{appUser?.name || "Superadmin"}</div>
              <div className="dash-user-email">{appUser?.email || ""}</div>
            </div>
            <div className="dash-avatar superadmin">{initials}</div>
          </div>
        </header>

        {/* Content */}
        <div className="dash-content">
          {/* Welcome */}
          <div className="dash-welcome">
            <div className="dash-welcome-text">
              <h2>Welcome back, {appUser?.name?.split(" ")[0] || "Superadmin"} 👋</h2>
              <p>You have full platform access. Manage tenants, teams, stations, and more.</p>
            </div>
            <div className="dash-welcome-icon">🛡️</div>
          </div>

          {/* User info cards */}
          <div className="dash-info-grid">
            <div className="dash-info-card">
              <div className="dash-info-card-label">Logged in as</div>
              <div className="dash-info-card-value">{appUser?.name || "—"}</div>
            </div>
            <div className="dash-info-card">
              <div className="dash-info-card-label">Email</div>
              <div className="dash-info-card-value" style={{ fontSize: 13 }}>{appUser?.email || "—"}</div>
            </div>
            <div className="dash-info-card">
              <div className="dash-info-card-label">Role</div>
              <div className="dash-info-card-value">
                <span className="dash-role-badge superadmin">Superadmin</span>
              </div>
            </div>
            <div className="dash-info-card">
              <div className="dash-info-card-label">Tenant</div>
              <div className="dash-info-card-value">{appUser?.tenantName || "Platform-wide"}</div>
            </div>
          </div>

          {/* Placeholder */}
          <div className="dash-placeholder">
            <div className="dash-placeholder-icon">🏗️</div>
            <h3>Full Dashboard Coming Soon</h3>
            <p>Stats, charts, and platform metrics will appear here. Navigate using the sidebar.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
