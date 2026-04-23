import React, { useState, useRef, useEffect } from 'react';
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
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

const AdminNavbar = () => {
  const { currentUser, adminRole, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const manageRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (manageRef.current && !manageRef.current.contains(event.target)) {
        setIsManageOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/staff-login';
  };

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path || (path === '/' && location.pathname === '');
    return location.pathname.startsWith(path);
  };

  const PRIMARY_NAV = [
    { path: "/", label: "Overview", icon: <DashboardIcon fontSize="small" />, roles: ["admin", "superadmin"] },
    { path: "/stations", label: "Stations", icon: <EvStationIcon fontSize="small" /> },
    { path: "/users", label: "Users", icon: <PeopleIcon fontSize="small" />, roles: ["superadmin"] },
    { path: "/reviews", label: "Reviews", icon: <RateReviewIcon fontSize="small" />, roles: ["admin", "superadmin"] },
    { path: "/operators", label: "Operators", icon: <GroupIcon fontSize="small" />, roles: ["admin", "superadmin"] },
  ];

  const MANAGE_LINKS = [
    { path: "/tenants", label: "Tenants", icon: <BusinessIcon fontSize="small" /> },
    { path: "/team", label: "Team", icon: <GroupIcon fontSize="small" /> },
  ];

  const POINTS_LINK = adminRole === "operator" 
    ? { path: "/operator-points", label: "Green Points" }
    : { path: "/points", label: "Green Points", roles: ["admin", "superadmin"] };

  return (
    <nav className="sticky top-0 z-[100] h-16 bg-[#1A1A1A] shadow-md flex items-center justify-between px-5 md:px-12 border-b border-white/5">
      {/* LEFT - LOGO + ROLE */}
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => navigate('/')}
      >
        <div className="w-9 h-9 bg-[#EAB308] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
          <BoltIcon className="text-[#1A1A1A] !text-[20px]" />
        </div>
        <div className="flex flex-col leading-none">
            <span className="text-[17px] font-[900] text-white tracking-tight">EV Saarthi</span>
            <span className="text-[9px] font-black text-[#EAB308] uppercase tracking-[0.15em] mt-0.5">
                {adminRole === 'superadmin' ? 'Superadmin' : 'Admin Panel'}
            </span>
        </div>
      </div>

      {/* CENTER - PRIMARY LINKS */}
      {currentUser && (
        <div className="hidden md:flex items-center gap-1 h-full">
          {PRIMARY_NAV.filter(l => !l.roles || l.roles.includes(adminRole)).map((link) => (
            <div
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`px-4 flex items-center gap-2 text-[13px] font-bold h-full cursor-pointer transition-all duration-200 border-b-2 hover:text-white ${
                isActive(link.path, link.path === '/')
                  ? 'text-[#EAB308] border-[#EAB308] bg-white/5'
                  : 'text-gray-400 border-transparent hover:bg-white/5'
              }`}
            >
              <span className="flex items-center opacity-70">{link.icon}</span>
              {link.label}
            </div>
          ))}

          {/* MANAGE DROPDOWN (Superadmin only) */}
          {adminRole === "superadmin" && (
            <div className="relative h-full" ref={manageRef}>
              <div
                onClick={() => setIsManageOpen(!isManageOpen)}
                className={`px-4 flex items-center gap-2 text-[13px] font-bold h-full cursor-pointer transition-all duration-200 border-b-2 hover:text-white ${
                  isManageOpen || MANAGE_LINKS.some(l => isActive(l.path))
                    ? 'text-[#EAB308] border-[#EAB308] bg-white/5'
                    : 'text-gray-400 border-transparent hover:bg-white/5'
                }`}
              >
                Manage <ExpandMoreIcon className={`!text-sm transition-transform ${isManageOpen ? 'rotate-180' : ''}`} />
              </div>
              {isManageOpen && (
                <div className="absolute top-full left-0 w-48 bg-[#1A1A1A] border border-white/10 rounded-b-xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-1">
                  {MANAGE_LINKS.map(link => (
                    <div
                      key={link.path}
                      onClick={() => { navigate(link.path); setIsManageOpen(false); }}
                      className={`px-4 py-2.5 text-[13px] font-bold flex items-center gap-3 transition-colors ${
                        isActive(link.path) ? 'text-[#EAB308] bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {link.icon} {link.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GREEN POINTS */}
          <div
            onClick={() => navigate(POINTS_LINK.path)}
            className={`px-4 flex items-center gap-2 text-[13px] font-bold h-full cursor-pointer transition-all duration-200 border-b-2 hover:text-white ${
              isActive(POINTS_LINK.path)
                ? 'text-[#EAB308] border-[#EAB308] bg-white/5'
                : 'text-gray-400 border-transparent hover:bg-white/5'
            }`}
          >
            {POINTS_LINK.label}
          </div>
        </div>
      )}

      {/* RIGHT - USER DROPDOWN */}
      <div className="flex items-center gap-4">
        {currentUser && (
          <div className="relative" ref={userMenuRef}>
            <div 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-3 cursor-pointer group hover:bg-white/5 py-1.5 px-2 rounded-lg transition-colors"
            >
               <div className="flex flex-col items-end leading-none">
                  <span className="text-[13px] font-black text-white group-hover:text-[#EAB308] transition-colors uppercase tracking-tight">
                    {currentUser.displayName?.split(' ')[0] || 'Admin'}
                  </span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                    {adminRole}
                  </span>
               </div>
               <div className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center border border-white/10 group-hover:border-[#EAB308]/30 transition-all overflow-hidden">
                  {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                      <PersonIcon className="text-gray-500 !text-lg" />
                  )}
               </div>
            </div>

            {isUserMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-white/5 mb-1">
                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Signed in as</p>
                    <p className="text-xs font-bold text-white truncate">{currentUser.email}</p>
                </div>
                <div
                  onClick={() => { navigate('/profile'); setIsUserMenuOpen(false); }}
                  className="px-4 py-2.5 text-[13px] font-bold text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-3 cursor-pointer transition-colors"
                >
                  <PersonIcon fontSize="small" /> My Profile
                </div>
                <div
                  onClick={handleLogout}
                  className="px-4 py-2.5 text-[13px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/5 flex items-center gap-3 cursor-pointer transition-colors"
                >
                  <LogoutIcon fontSize="small" /> Logout
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* MOBILE MENU TOGGLE */}
        {currentUser && (
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-gray-400 hover:text-white transition-colors p-1"
            >
                <MenuIcon />
            </button>
        )}
      </div>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && currentUser && (
        <div className="absolute top-16 left-0 w-full bg-[#1A1A1A] border-t border-white/5 shadow-2xl md:hidden flex flex-col py-2">
          {PRIMARY_NAV.filter(l => !l.roles || l.roles.includes(adminRole)).map((link) => (
            <div
              key={link.path}
              onClick={() => { navigate(link.path); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-6 py-4 text-sm font-bold transition-colors ${
                isActive(link.path, link.path === '/') ? 'text-[#EAB308] bg-white/5' : 'text-gray-400'
              }`}
            >
              {link.icon} {link.label}
            </div>
          ))}
          {adminRole === "superadmin" && MANAGE_LINKS.map(link => (
            <div
              key={link.path}
              onClick={() => { navigate(link.path); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-6 py-4 text-sm font-bold transition-colors ${
                isActive(link.path) ? 'text-[#EAB308] bg-white/5' : 'text-gray-400'
              }`}
            >
              {link.icon} {link.label}
            </div>
          ))}
          <div
            onClick={() => { navigate(POINTS_LINK.path); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-6 py-4 text-sm font-bold transition-colors ${
                isActive(POINTS_LINK.path) ? 'text-[#EAB308] bg-white/5' : 'text-gray-400'
            }`}
          >
            {POINTS_LINK.label}
          </div>
        </div>
      )}
    </nav>
  );
};

export default AdminNavbar;
