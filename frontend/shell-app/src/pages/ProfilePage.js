import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import cityData from "../data/indianCities.json";
import {
  Person as PersonIcon,
  Search as SearchIcon,
  Bolt as BoltIcon,
  Lock as LockIcon,
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { CircularProgress } from "@mui/material";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ─── City helpers ─────────────────────────────────────────────
const groupedCities = cityData.reduce((acc, item) => {
  if (!acc[item.state]) acc[item.state] = [];
  acc[item.state].push(item.city);
  return acc;
}, {});

// ─── Main Component ───────────────────────────────────────────
const ProfilePage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Personal Info state ─────────────────────────────────────
  const [infoForm, setInfoForm] = useState({
    name: "",
    city: "",
    electricityTariff: 7,
  });
  const [searchCity, setSearchCity] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [savedInfo, setSavedInfo] = useState(false);
  const [errorInfo, setErrorInfo] = useState("");

  // ── Filtered city list for search ──────────────────────────
  const filteredCities =
    searchCity.trim() === ""
      ? cityData
      : cityData.filter(
          (item) =>
            item.city.toLowerCase().includes(searchCity.toLowerCase()) ||
            item.state.toLowerCase().includes(searchCity.toLowerCase())
        );

  // ── Load on mount ───────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        const idToken = await currentUser.getIdToken();
        const profileRes = await axios
          .get(`${API}/api/user/profile`, { headers: { Authorization: `Bearer ${idToken}` } })
          .catch(() => null);

        if (profileRes?.data) {
          const p = profileRes.data.profile || profileRes.data;
          setInfoForm({
            name: p.name || currentUser.displayName || "",
            city: p.city || "",
            electricityTariff: p.electricityTariff ?? 7,
          });
        } else {
          setInfoForm((prev) => ({ ...prev, name: currentUser.displayName || "" }));
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchProfile();
  }, [currentUser]);

  // ── Save Personal Info ──────────────────────────────────────
  const handleSaveInfo = async () => {
    setSavingInfo(true);
    setErrorInfo("");
    setSavedInfo(false);
    try {
      const idToken = await currentUser.getIdToken();
      await axios.post(`${API}/api/user/profile`, infoForm, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setSavedInfo(true);
      setTimeout(() => setSavedInfo(false), 5000);
    } catch (err) {
      console.error("Save personal info error:", err);
      setErrorInfo(
        err.response?.data?.error || "Failed to save personal info. Please try again."
      );
    } finally {
      setSavingInfo(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        >
          <ArrowBackIcon />
        </button>
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A]">My Profile</h1>
          <p className="text-sm text-gray-500 font-medium tracking-tight">
            Manage your personal details and preferences
          </p>
        </div>
      </div>

      <div 
        className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start"
        style={isMobile ? { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', gap: '16px' } : {}}
      >
        {/* ── LEFT — AVATAR CARD ──────────────────────────────── */}
        <div 
          className="w-full lg:w-[280px] lg:flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 lg:p-8 lg:text-center"
          style={{
            position: 'sticky',
            top: '24px',
            alignSelf: 'flex-start',
            ...(isMobile ? { flexShrink: 0, maxHeight: '160px', overflowY: 'hidden' } : {})
          }}
        >
          <div className="flex lg:block items-center gap-3 lg:gap-4 mb-0 lg:mb-0 lg:text-center">
            <div className="relative inline-block lg:mb-6 flex-shrink-0">
              <div className="w-10 h-10 lg:w-[88px] lg:h-[88px] rounded-full p-0.5 lg:p-1 border-2 border-[#EAB308] shadow-[0_4px_14px_rgba(234,179,8,0.3)] bg-white overflow-hidden">
                <img
                  src={currentUser?.photoURL || "https://via.placeholder.com/100"}
                  alt="User"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 lg:w-5 lg:h-5 bg-[#16A34A] border-2 lg:border-4 border-white rounded-full shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm lg:text-xl font-black text-[#1A1A1A] mb-0.5 lg:mb-1 truncate">
                {currentUser?.displayName || "EV Driver"}
              </h2>
              <p className="text-[11px] lg:text-xs font-bold text-gray-400 mb-0 lg:mb-2 truncate">
                {currentUser?.email}
              </p>
              <div className="hidden lg:inline-flex bg-[#FFFBEB] border border-[#FDE68A] rounded-full py-1.5 px-4 items-center gap-2 mt-0">
                <LockIcon className="text-[#D97706] !text-sm" />
                <span className="text-[11px] font-black text-[#D97706] uppercase tracking-wider">
                  Google Account
                </span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block w-full h-px bg-gray-100 my-6" />
          
          <div className="hidden lg:block space-y-4">
            <AvatarStat label="Account Status" value="Active" color="text-[#16A34A]" />
            <AvatarStat label="Membership Plan" value="Free" color="text-[#16A34A]" />
            <AvatarStat label="Green Points" value="0 pts" color="text-[#D97706]" />
          </div>

          {/* Mobile stats (horizontal row) */}
          <div className="flex lg:hidden justify-between items-center mt-3 pt-3 border-t border-gray-100 px-2">
             <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Status</span>
                <span className="text-[11px] font-black text-[#16A34A]">Active</span>
             </div>
             <div className="w-px h-6 bg-gray-100"></div>
             <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Plan</span>
                <span className="text-[11px] font-black text-[#16A34A]">Free</span>
             </div>
             <div className="w-px h-6 bg-gray-100"></div>
             <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Points</span>
                <span className="text-[11px] font-black text-[#D97706]">0 pts</span>
             </div>
          </div>
        </div>

        {/* ── RIGHT — PERSONAL INFO FORM ───────────────────────── */}
        <div 
          className="flex-1 min-w-0 mb-10"
          style={isMobile ? { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, paddingBottom: '80px', marginTop: '0px' } : {}}
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div 
              className="bg-[#16A34A] px-4 py-4 lg:px-8 lg:py-5 flex items-center gap-3 flex-shrink-0 rounded-t-2xl"
              style={{ paddingTop: '16px', paddingBottom: '16px' }}
            >
              <PersonIcon className="text-white !text-2xl" />
              <div>
                <h2 className="text-xl font-black text-white">Personal Information</h2>
                <p className="text-sm text-white/80 font-medium">
                  Your basic profile and billing preferences
                </p>
              </div>
            </div>
            <div className="p-4 md:p-6 lg:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup
                  label="Full Name"
                  name="name"
                  value={infoForm.name}
                  onChange={(e) => {
                    setInfoForm((prev) => ({ ...prev, name: e.target.value }));
                    setSavedInfo(false);
                    setErrorInfo("");
                  }}
                  placeholder="Enter your name"
                />
                <div className="space-y-2">
                  <label className="text-[13px] font-black text-[#555] ml-1 uppercase tracking-tight">City</label>
                  <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 !text-lg" />
                    <input
                      type="text"
                      placeholder="Search city or state..."
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:border-[#EAB308] focus:ring-4 focus:ring-[#EAB308]/10 transition-all font-medium text-sm outline-none"
                    />
                  </div>
                  <select
                    name="city"
                    value={infoForm.city}
                    onChange={(e) => {
                      setInfoForm((prev) => ({ ...prev, city: e.target.value }));
                      setSavedInfo(false);
                      setErrorInfo("");
                    }}
                    className="w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:border-[#EAB308] focus:ring-4 focus:ring-[#EAB308]/10 transition-all font-medium text-sm outline-none"
                  >
                    <option value="">Select your city</option>
                    {searchCity.trim() !== ""
                      ? filteredCities.map((item) => (
                          <option key={item.id} value={item.city}>{item.city} — {item.state}</option>
                        ))
                      : Object.entries(groupedCities).sort().map(([state, cities]) => (
                          <optgroup key={state} label={state}>
                            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                          </optgroup>
                        ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <InputGroup
                    label="Electricity Tariff (₹/unit)"
                    name="electricityTariff"
                    type="number"
                    value={infoForm.electricityTariff}
                    onChange={(e) => {
                      setInfoForm((prev) => ({ ...prev, electricityTariff: e.target.value }));
                      setSavedInfo(false);
                      setErrorInfo("");
                    }}
                    min="3" max="15" step="0.5"
                  />
                  <p className="text-[11px] text-gray-400 font-medium ml-1 leading-relaxed">
                    Check your electricity bill for ₹/unit rate. Default ₹7 works for most Indian cities.
                  </p>
                </div>
              </div>
              {errorInfo && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-600">
                  <ErrorIcon /><span className="text-sm font-bold">{errorInfo}</span>
                </div>
              )}
              {savedInfo && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700">
                  <CheckCircleIcon /><span className="text-sm font-bold">Personal info saved successfully!</span>
                </div>
              )}
              <button
                onClick={handleSaveInfo}
                disabled={savingInfo}
                className={`w-full py-4 rounded-xl font-black text-[15px] uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-3
                  ${savingInfo ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#EAB308] hover:bg-[#D97706] text-[#1A1A1A] active:scale-[0.98] shadow-[#EAB308]/30"}`}
              >
                {savingInfo ? <CircularProgress size={20} className="!text-gray-400" /> : <BoltIcon />}
                {savingInfo ? "Saving..." : "Save Personal Info"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AvatarStat = ({ label, value, color }) => (
  <div className="flex justify-between items-center text-[12px] group">
    <span className="text-gray-400 font-bold">{label}</span>
    <span className={`font-black ${color}`}>{value}</span>
  </div>
);

const InputGroup = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-[13px] font-black text-[#555] ml-1 uppercase tracking-tight">{label}</label>
    <input
      className="w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:border-[#EAB308] focus:ring-4 focus:ring-[#EAB308]/10 transition-all font-medium text-sm outline-none placeholder:text-gray-300"
      {...props}
    />
  </div>
);

export default ProfilePage;
