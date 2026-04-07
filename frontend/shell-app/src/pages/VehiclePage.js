import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  ElectricCar as ElectricCarIcon,
  Lock as LockIcon,
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { CircularProgress } from "@mui/material";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const VehiclePage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [vehicleForm, setVehicleForm] = useState({
    vehicleBrand: "",
    vehicleModel: "",
    batteryCapacity: "",
    connectorType: "",
    registrationNumber: "",
    purchaseYear: "",
  });
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savedVehicle, setSavedVehicle] = useState(false);
  const [errorVehicle, setErrorVehicle] = useState("");

  useEffect(() => {
    const fetchVehicle = async () => {
      if (!currentUser) return;
      try {
        const idToken = await currentUser.getIdToken();
        const vehicleRes = await axios
          .get(`${API}/api/vehicle/me`, { headers: { Authorization: `Bearer ${idToken}` } })
          .catch(() => null);
        if (vehicleRes?.data?.vehicle) {
          const v = vehicleRes.data.vehicle;
          setVehicleForm({
            vehicleBrand: v.vehicleBrand || "",
            vehicleModel: v.vehicleModel || "",
            batteryCapacity: v.batteryCapacity ?? "",
            connectorType: v.connectorType || "",
            registrationNumber: v.registrationNumber || "",
            purchaseYear: v.purchaseYear ?? "",
          });
        }
      } catch (err) {
        console.error("Fetch vehicle error:", err);
      }
    };
    fetchVehicle();
  }, [currentUser]);

  const handleSaveVehicle = async () => {
    setSavingVehicle(true);
    setErrorVehicle("");
    setSavedVehicle(false);
    try {
      const idToken = await currentUser.getIdToken();
      await axios.post(`${API}/api/vehicle/save`, vehicleForm, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setSavedVehicle(true);
      setTimeout(() => setSavedVehicle(false), 5000);
    } catch (err) {
      console.error("Save vehicle error:", err);
      setErrorVehicle(err.response?.data?.error || "Failed to save vehicle details. Please try again.");
    } finally {
      setSavingVehicle(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        >
          <ArrowBackIcon />
        </button>
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A]">My Vehicle</h1>
          <p className="text-sm text-gray-500 font-medium tracking-tight">
            Manage your EV vehicle details and specs
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

        {/* ── RIGHT — VEHICLE FORM ─────────────────────────────── */}
        <div 
          className="flex-1 min-w-0 mb-10"
          style={isMobile ? { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, paddingBottom: '80px', marginTop: '0px' } : {}}
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div 
              className="bg-[#16A34A] px-4 py-4 lg:px-8 lg:py-5 flex items-center gap-3 flex-shrink-0 rounded-t-2xl"
              style={{ paddingTop: '16px', paddingBottom: '16px' }}
            >
              <ElectricCarIcon className="text-white !text-2xl" />
              <div>
                <h2 className="text-xl font-black text-white">Vehicle Information</h2>
                <p className="text-sm text-white/80 font-medium">
                  Your EV vehicle details and specifications
                </p>
              </div>
            </div>
            <div className="p-4 md:p-6 lg:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup
                  label="Vehicle Brand"
                  name="vehicleBrand"
                  value={vehicleForm.vehicleBrand}
                  onChange={(e) => { setVehicleForm((prev) => ({ ...prev, vehicleBrand: e.target.value })); setSavedVehicle(false); setErrorVehicle(""); }}
                  placeholder="e.g. Tata, MG, Ather, Ola"
                />
                <InputGroup
                  label="Vehicle Model"
                  name="vehicleModel"
                  value={vehicleForm.vehicleModel}
                  onChange={(e) => { setVehicleForm((prev) => ({ ...prev, vehicleModel: e.target.value })); setSavedVehicle(false); setErrorVehicle(""); }}
                  placeholder="e.g. Nexon EV, ZS EV, S1 Pro"
                />
                <div className="space-y-2">
                  <InputGroup
                    label="Battery Capacity (kWh)"
                    name="batteryCapacity"
                    type="number"
                    value={vehicleForm.batteryCapacity}
                    onChange={(e) => { setVehicleForm((prev) => ({ ...prev, batteryCapacity: e.target.value })); setSavedVehicle(false); setErrorVehicle(""); }}
                    min="5" max="150" step="0.5" placeholder="e.g. 30.2"
                  />
                  <p className="text-[11px] text-gray-400 font-medium ml-1 leading-relaxed">
                    Found in your vehicle manual. Used to calculate charging cost.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-black text-[#555] ml-1 uppercase tracking-tight">Connector Type</label>
                  <select
                    name="connectorType"
                    value={vehicleForm.connectorType}
                    onChange={(e) => { setVehicleForm((prev) => ({ ...prev, connectorType: e.target.value })); setSavedVehicle(false); setErrorVehicle(""); }}
                    className="w-full px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:border-[#EAB308] focus:ring-4 focus:ring-[#EAB308]/10 transition-all font-medium text-sm outline-none"
                  >
                    <option value="">Select connector type</option>
                    <option value="CCS2">CCS2 — most new EVs in India</option>
                    <option value="CHAdeMO">CHAdeMO — older EVs</option>
                    <option value="Type2">Type 2 AC — European standard</option>
                    <option value="AC Slow">AC Slow — 3.3kW home charging</option>
                  </select>
                </div>
                <InputGroup
                  label="Registration Number (optional)"
                  name="registrationNumber"
                  value={vehicleForm.registrationNumber}
                  onChange={(e) => { setVehicleForm((prev) => ({ ...prev, registrationNumber: e.target.value })); setSavedVehicle(false); setErrorVehicle(""); }}
                  placeholder="e.g. MH12AB1234"
                />
                <InputGroup
                  label="Purchase Year (optional)"
                  name="purchaseYear"
                  type="number"
                  value={vehicleForm.purchaseYear}
                  onChange={(e) => { setVehicleForm((prev) => ({ ...prev, purchaseYear: e.target.value })); setSavedVehicle(false); setErrorVehicle(""); }}
                  min="2015" max="2026" placeholder="e.g. 2023"
                />
              </div>
              {errorVehicle && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-600">
                  <ErrorIcon /><span className="text-sm font-bold">{errorVehicle}</span>
                </div>
              )}
              {savedVehicle && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700">
                  <CheckCircleIcon /><span className="text-sm font-bold">Vehicle details saved successfully!</span>
                </div>
              )}
              <button
                onClick={handleSaveVehicle}
                disabled={savingVehicle}
                style={{ width: '100%', marginTop: '16px', position: 'relative' }}
                className={`py-4 rounded-xl font-black text-[15px] uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-3
                  ${savingVehicle ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#EAB308] hover:bg-[#D97706] text-[#1A1A1A] active:scale-[0.98] shadow-[#EAB308]/30"}`}
              >
                {savingVehicle ? <CircularProgress size={20} className="!text-gray-400" /> : <ElectricCarIcon />}
                {savingVehicle ? "Saving..." : "Save Vehicle Details"}
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

export default VehiclePage;
