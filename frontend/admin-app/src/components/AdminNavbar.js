import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bolt as BoltIcon,
  Dashboard as DashboardIcon,
  EvStation as EvStationIcon,
  People as PeopleIcon,
  Group as GroupIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  RateReview as RateReviewIcon,
} from '@mui/icons-material';

const AdminNavbar = () => {
  const { currentUser, adminRole, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const NAV_LINKS = [
    { path: "/", label: "Overview", icon: <DashboardIcon fontSize="small" />, exact: true },
    { path: "/stations", label: "Stations", icon: <EvStationIcon fontSize="small" />, exact: false },
    { path: "/users", label: "Users", icon: <PeopleIcon fontSize="small" />, exact: false },
    { path: "/reviews", label: "Reviews", icon: <RateReviewIcon fontSize="small" />, exact: false },
    { path: "/operators", label: "Operators", icon: <GroupIcon fontSize="small" />, exact: false },
    { path: "/team", label: "Team", icon: <GroupIcon fontSize="small" />, exact: false, role: "superadmin" },
  ];

  const navLinks = NAV_LINKS.filter(link => !link.role || link.role === adminRole);

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path || location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-[100] h-16 bg-[#1A1A1A] shadow-md flex items-center justify-between px-5 md:px-12">
      {/* LEFT - LOGO */}
      <div
        className="flex items-center gap-2.5 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <div className="w-9 h-9 bg-[#EAB308] rounded-lg flex items-center justify-center">
          <BoltIcon className="text-[#1A1A1A] !text-[20px]" />
        </div>
        <span className="text-[18px] font-[800] text-white">EV Saarthi</span>
        <span className="bg-[#EAB308] text-[#1A1A1A] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-1">
          Admin
        </span>
      </div>

      {/* CENTER - LINKS */}
      {currentUser && (
        <div className="hidden md:flex items-center gap-6 h-full">
          {navLinks.map((link) => (
            <div
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`flex items-center gap-1.5 text-sm font-medium h-full cursor-pointer transition-all duration-200 border-b-2 hover:text-white ${
                isActive(link.path, link.exact)
                  ? 'text-[#EAB308] border-[#EAB308]'
                  : 'text-gray-400 border-transparent'
              }`}
            >
              <span className="flex items-center">{link.icon}</span>
              {link.label}
            </div>
          ))}
        </div>
      )}

      {/* RIGHT - USER / LOGOUT */}
      <div className="flex items-center gap-4">
        {currentUser && (
          <div className="flex items-center gap-3">
            {/* Role badge */}
            {adminRole && (
              <span className="hidden sm:inline-block" style={{
                background: adminRole === 'superadmin' ? '#F5F3FF' : '#F0FDF4',
                color:      adminRole === 'superadmin' ? '#7C3AED'  : '#16A34A',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 10px',
                borderRadius: '20px',
              }}>
                {adminRole === 'superadmin' ? 'Superadmin' : 'Admin'}
              </span>
            )}
            <span className="hidden sm:block text-[13px] font-semibold text-white">
              {currentUser.displayName || 'Admin User'}
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors ml-1"
              title="Logout"
            >
              <LogoutIcon fontSize="small" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-gray-400 hover:text-white transition-colors ml-2"
              title="Menu"
            >
              <MenuIcon />
            </button>
          </div>
        )}
      </div>

      {/* MOBILE DROPDOWN MENU */}
      {isMobileMenuOpen && currentUser && (
        <div className="absolute top-16 left-0 w-full bg-[#1A1A1A] border-t border-gray-800 shadow-xl md:hidden flex flex-col">
          {navLinks.map((link) => (
            <div
              key={link.path}
              onClick={() => {
                navigate(link.path);
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 p-4 border-b border-gray-800 text-sm font-medium cursor-pointer transition-colors ${
                isActive(link.path, link.exact)
                  ? 'text-[#EAB308] bg-white/5'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center">{link.icon}</span>
              {link.label}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
};

export default AdminNavbar;
