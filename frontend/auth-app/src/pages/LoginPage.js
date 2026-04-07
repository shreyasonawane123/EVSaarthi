import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { 
  Bolt as BoltIcon, 
  EvStation as EvStationIcon, 
  CalendarMonth as CalendarMonthIcon, 
  EmojiEvents as EmojiEventsIcon, 
  Savings as SavingsIcon,
  Lock as LockIcon,
  Nature as NatureIcon
} from '@mui/icons-material';

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) navigate("/dashboard");
  }, [isLoggedIn, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      await axios.post(`${API}/api/auth/session`, { idToken });

      await axios.post(
        `${API}/api/user/profile`,
        {
          name: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
        },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F5F5F5] font-sans">
      {/* LEFT COLUMN */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] bg-[#16A34A] p-12 flex-col justify-between text-white border-r">
        {/* Top Logo */}
        <div className="flex items-center gap-2">
          <BoltIcon className="!text-3xl" />
          <span className="text-2xl font-black">EV Saarthi</span>
        </div>

        {/* Hero Section */}
        <div className="max-w-md">
          <h1 className="text-[48px] font-extrabold leading-tight mb-4">
            Drive Green.<br />
            <span className="text-[#EAB308]">Save More.</span><br />
            Earn Points.
          </h1>
          <p className="text-base opacity-85 mb-10 leading-relaxed">
            India's smartest EV companion — find stations, book slots, track savings, and earn Green Points.
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4">
            <FeatureCard 
              icon={<EvStationIcon className="text-[#16A34A] !text-[28px]" />} 
              title="Find Stations" 
              desc="Locate nearby EV chargers on map" 
            />
            <FeatureCard 
              icon={<CalendarMonthIcon className="text-[#3B82F6] !text-[28px]" />} 
              title="Book Slots" 
              desc="Reserve charging slot in advance" 
            />
            <FeatureCard 
              icon={<EmojiEventsIcon className="text-[#EAB308] !text-[28px]" />} 
              title="Green Points" 
              desc="Earn rewards on every trip" 
            />
            <FeatureCard 
              icon={<SavingsIcon className="text-[#A855F7] !text-[28px]" />} 
              title="Track Savings" 
              desc="Compare cost vs petrol" 
            />
          </div>
        </div>

        {/* Bottom Stats Strip */}
        <div className="bg-white border-2 border-white/20 rounded-xl p-5 flex justify-between items-center text-[#1A1A1A] max-w-lg shadow-xl">
          <Stat text="500+ Stations" />
          <div className="w-px h-6 bg-gray-200" />
          <Stat text="2,000+ Users" />
          <div className="w-px h-6 bg-gray-200" />
          <Stat text="₹0 Always Free" />
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex-1 md:flex-none md:w-1/2 lg:w-[45%] flex flex-col items-center justify-center p-4 md:p-6 lg:p-12">
        <div className="flex md:hidden items-center justify-center gap-2 mb-6">
          <BoltIcon className="text-[#16A34A] !text-3xl" />
          <span className="text-2xl font-black text-[#1A1A1A]">EV Saarthi</span>
        </div>

        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100">
          <div className="bg-[#16A34A] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <BoltIcon className="!text-xl" />
              <span className="font-bold">EV Saarthi</span>
            </div>
            <div className="bg-white/20 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-white/20">
              Free Platform
            </div>
          </div>

          <div className="p-4 md:p-6 lg:p-10 text-center">
            <h2 className="text-2xl font-extrabold text-[#1A1A1A] mb-1">Sign In to Your Account</h2>
            <p className="text-sm text-gray-500 mb-8 font-medium">Access your EV dashboard</p>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">{error}</div>}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full relative py-3.5 bg-[#EAB308] hover:bg-[#D97706] text-[#1A1A1A] font-bold rounded-xl transition-all duration-300 shadow-[0_4px_14px_rgba(234,179,8,0.3)] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              <GoogleIcon />
              {loading ? "Signing you in..." : "Continue with Google"}
            </button>

            <div className="flex items-center gap-3 my-8">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider font-bold">trusted & secure</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 mb-8 text-center">
              <TrustBadge icon={<LockIcon fontSize="small" />} text="Secure" />
              <TrustBadge icon={<BoltIcon fontSize="small" />} text="Instant" />
              <TrustBadge icon={<NatureIcon fontSize="small" />} text="Eco-friendly" />
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
              By signing in, you agree to our Terms of Service & Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="bg-white rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
    <div className="mb-3">{icon}</div>
    <div className="text-sm font-bold text-[#1A1A1A] mb-1">{title}</div>
    <div className="text-[11px] text-gray-400 leading-tight leading-relaxed">{desc}</div>
  </div>
);

const Stat = ({ text }) => (
  <span className="text-[13px] font-extrabold uppercase tracking-tight">{text}</span>
);

const TrustBadge = ({ icon, text }) => (
  <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-3 rounded-xl flex flex-col items-center gap-1.5 transition-transform hover:scale-105">
    <div className="text-[#16A34A]">{icon}</div>
    <span className="text-[10px] font-bold text-[#16A34A] uppercase tracking-wide">{text}</span>
  </div>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default LoginPage;
