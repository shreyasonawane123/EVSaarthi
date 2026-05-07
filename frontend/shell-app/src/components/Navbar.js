import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Bolt as BoltIcon, 
  EvStation as EvStationIcon, 
  CalendarMonth as CalendarMonthIcon, 
  BarChart as BarChartIcon, 
  EmojiEvents as EmojiEventsIcon, 
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Person as PersonIcon,
  DirectionsCar as DirectionsCarIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { 
  Avatar, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton
} from '@mui/material';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const open = Boolean(anchorEl);
  
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname.startsWith('/admin')) return null;

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon fontSize="small" /> },
    { label: 'Stations', path: '/map', icon: <EvStationIcon fontSize="small" /> },
    { label: 'Bookings', path: '/booking', icon: <CalendarMonthIcon fontSize="small" /> },
    { label: 'Redeem Points', path: '/rewards', icon: <EmojiEventsIcon fontSize="small" /> },
    { label: 'Rewards', path: '/points-history', icon: <EmojiEventsIcon fontSize="small" /> },
    { label: 'Payments', path: '/payments', icon: <PaymentIcon fontSize="small" /> },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-[100] h-16 bg-white border-b-[3px] border-[#EAB308] shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-between px-5 md:px-12">
      {/* LEFT - LOGO */}
      <div 
        className="flex items-center gap-2.5 cursor-pointer" 
        onClick={() => navigate('/dashboard')}
      >
        <div className="w-9 h-9 bg-[#EAB308] rounded-lg flex items-center justify-center">
          <BoltIcon className="text-white !text-[20px]" />
        </div>
        <span className="text-[18px] font-[800] text-[#1A1A1A]">EV Saarthi</span>
      </div>

      {/* CENTER - LINKS (Desktop) */}
      {currentUser && (
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <div
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`flex items-center gap-1.5 text-sm font-medium py-2 px-1 cursor-pointer transition-all duration-200 border-b-2 hover:text-[#16A34A] ${
                isActive(link.path) 
                  ? 'text-[#EAB308] border-[#EAB308]' 
                  : 'text-[#444444] border-transparent'
              }`}
            >
              <span className="flex items-center">{link.icon}</span>
              {link.label}
            </div>
          ))}
        </div>
      )}

      {/* RIGHT - USER / SIGN IN */}
      <div className="flex items-center gap-4">
        {currentUser ? (
          <>
            <div 
              className="flex items-center gap-2 cursor-pointer group"
              onClick={handleMenuOpen}
            >
              <Avatar 
                src={currentUser.photoURL} 
                className="!w-[34px] !h-[34px] border-2 border-[#EAB308]"
              />
              <span className="hidden sm:block text-[13px] font-semibold text-[#555]">
                {currentUser.displayName?.split(' ')[0]}
              </span>
              <KeyboardArrowDownIcon className="text-[#555] !text-lg" />
            </div>

            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.12))',
                  mt: 1.5,
                  borderRadius: '12px',
                  minWidth: 180,
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 14 }}>My Profile</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); navigate('/vehicle'); }}>
                <ListItemIcon><DirectionsCarIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 14 }}>My Vehicle</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} className="!text-[#DC2626]">
                <ListItemIcon><LogoutIcon fontSize="small" className="text-[#DC2626]" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 14 }}>Logout</ListItemText>
              </MenuItem>
            </Menu>

            {/* Mobile Menu Icon */}
            <div className="md:hidden">
              <IconButton onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            </div>
          </>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            className="bg-[#EAB308] text-[#1A1A1A] px-5 py-2 rounded-lg font-bold text-sm transition-all duration-200 hover:bg-[#D97706]"
          >
            Sign In
          </button>
        )}
      </div>

      {/* MOBILE DRAWER */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        <div className="p-5 flex justify-between items-center border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#EAB308] rounded flex items-center justify-center">
              <BoltIcon className="text-white !text-lg" />
            </div>
            <span className="font-bold">EV Saarthi</span>
          </div>
          <IconButton onClick={() => setMobileOpen(false)}>
            <CloseIcon />
          </IconButton>
        </div>
        <List>
          {navLinks.map((link) => (
            <ListItem key={link.path} disablePadding>
              <ListItemButton 
                onClick={() => { navigate(link.path); setMobileOpen(false); }}
                sx={{
                  color: isActive(link.path) ? '#EAB308' : '#444',
                  py: 1.5
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{link.icon}</ListItemIcon>
                <ListItemText primary={link.label} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
          ))}
          <Divider sx={{ my: 1 }} />
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout} sx={{ color: '#DC2626' }}>
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><LogoutIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </nav>
  );
};

export default Navbar;
