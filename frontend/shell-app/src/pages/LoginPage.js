import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
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
import ReCAPTCHA from "react-google-recaptcha";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  
  // Referral System State
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [newUserData, setNewUserData] = useState(null); // { user, token }
  const [referralCode, setReferralCode] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState('');
  const [checkingProfile, setCheckingProfile] = useState(false);

  // CAPTCHA state
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = React.useRef(null);
  
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleRedirect = async (user) => {
    try {
      const idToken = await user.getIdToken();
      // Check if user is an admin or operator
      let adminDoc = await getDoc(doc(db, "adminUsers", user.uid));
      let role = "admin";
      let name = "";
      
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        role = data.role || "admin";
        name = data.name || user.displayName || "Staff";
      } else {
        // Not in adminUsers, check operators collection
        const operatorDoc = await getDoc(doc(db, "operators", user.uid));
        if (operatorDoc.exists()) {
          const oData = operatorDoc.data();
          role = "operator";
          name = oData.name || user.displayName || "Operator";
        } else {
          // Standard consumer
          navigate("/dashboard");
          return;
        }
      }

      // If we found a staff role, redirect to admin portal
      const nameParam = encodeURIComponent(name);
      window.location.href = `/admin?token=${idToken}&name=${nameParam}&role=${role}`;
    } catch (err) {
      console.error("Redirection error:", err);
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    // Only auto-navigate if:
    // 1. User is logged in
    // 2. We are NOT currently checking if they are a new user
    // 3. We are NOT showing the referral modal
    if (isLoggedIn && !checkingProfile && !showReferralModal && !newUserData) {
      navigate("/dashboard");
    }
  }, [isLoggedIn, navigate, showReferralModal, newUserData, checkingProfile]);

  const syncProfile = async (user, token, refCode) => {
    try {
      await axios.post(`${API}/api/user/profile`, {
        name: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        referralCode: refCode.trim().toUpperCase()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Profile sync error:", e);
    }
  };

  const handleGoogleLogin = async () => {
    if (!recaptchaToken) {
      setError("Please complete the reCAPTCHA security check.");
      return;
    }
    setLoading(true);
    setCheckingProfile(true); // START CHECKING
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();

      // Check if user is new or existing
      try {
        const profileRes = await axios.get(`${API}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (profileRes.status === 200) {
          // EXISTING USER → sync profile silently, go to dashboard
          await syncProfile(user, token, '');
          await handleRedirect(user);
          setCheckingProfile(false); // FINISHED
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // NEW USER → show referral modal
          setNewUserData({ user, token });
          setShowReferralModal(true);
          setLoading(false); 
          setCheckingProfile(false); // FINISHED (modal will handle the rest)
          return;
        } else {
          setCheckingProfile(false);
          throw err;
        }
      }
    } catch (err) {
      console.error("Google Login error:", err);
      setError("Google login failed. Please try again.");
      setLoading(false);
      setCheckingProfile(false);
    }
  };

  const handleReferralContinue = async () => {
    setReferralLoading(true);
    setReferralError('');
    try {
      const { user, token } = newUserData;
      await syncProfile(user, token, referralCode);
      setShowReferralModal(false);
      await handleRedirect(user);
    } catch (err) {
      setReferralError('Something went wrong. Please try again.');
    } finally {
      setReferralLoading(false);
    }
  };

  const handleReferralSkip = async () => {
    setReferralCode('');
    setReferralLoading(true);
    try {
      const { user, token } = newUserData;
      await syncProfile(user, token, '');
      setShowReferralModal(false);
      await handleRedirect(user);
    } catch (err) {
      setReferralError('Something went wrong. Please try again.');
    } finally {
      setReferralLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleRedirect(result.user);
    } catch (err) {
      console.error("Email Login error:", err.message);
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F5F5F5] font-sans">
      {/* LEFT COLUMN */}
      <div className="hidden lg:flex w-[55%] bg-[#16A34A] p-12 flex-col justify-between text-white">
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
            India's smartest EV companion — find stations, book slots,
            track savings, and earn Green Points.
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
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

        {/* Bottom Stats Strip — clearly separated */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "20px 28px",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            border: "3px solid #EAB308",
            maxWidth: "480px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "24px",
              fontWeight: "900",
              color: "#EAB308",
              letterSpacing: "-0.5px",
            }}>500+</div>
            <div style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginTop: "2px",
            }}>Stations</div>
          </div>

          <div style={{
            width: "1px",
            height: "40px",
            background: "#E5E7EB",
          }} />

          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "24px",
              fontWeight: "900",
              color: "#EAB308",
              letterSpacing: "-0.5px",
            }}>2,000+</div>
            <div style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginTop: "2px",
            }}>Users</div>
          </div>

          <div style={{
            width: "1px",
            height: "40px",
            background: "#E5E7EB",
          }} />

          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "24px",
              fontWeight: "900",
              color: "#16A34A",
              letterSpacing: "-0.5px",
            }}>₹0</div>
            <div style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginTop: "2px",
            }}>Always Free</div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="lg:hidden mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BoltIcon className="text-[#16A34A] !text-4xl" />
            <span className="text-3xl font-black text-[#1A1A1A]">EV Saarthi</span>
          </div>
          <p className="text-gray-500 font-medium">India's smartest EV companion</p>
        </div>

        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100">
          {/* Card Header */}
          <div className="bg-[#16A34A] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <BoltIcon className="!text-xl" />
              <span className="font-bold">EV Saarthi</span>
            </div>
            <div className="bg-white/20 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-white/20">
              Free Platform
            </div>
          </div>

          {/* Card Body */}
          <div className="p-10 text-center">
            <h2 className="text-2xl font-extrabold text-[#1A1A1A] mb-1">
              {showStaffLogin ? "Staff Portal" : "Get Started"}
            </h2>
            <p className="text-sm text-gray-500 mb-8 font-medium">
              {showStaffLogin ? "Access operator & admin tools" : "India's smartest EV companion"}
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs mb-4 border border-red-100 font-bold animate-shake text-left">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* ReCAPTCHA */}
              <div className="flex justify-center mb-4">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                  onChange={(token) => {
                    setRecaptchaToken(token);
                    if (token) setError("");
                  }}
                />
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent transition-all"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent transition-all"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold rounded-xl transition-all shadow-lg shadow-green-100 disabled:opacity-70 disabled:cursor-not-allowed mt-1"
                >
                  {loading ? "Please wait..." : "Sign In with Email"}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-[#9CA3AF] uppercase tracking-widest font-black">
                  or
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Google Button */}
              <button
                onClick={handleGoogleLogin}
                type="button"
                disabled={loading}
                className="w-full relative py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-extrabold rounded-xl transition-all border border-gray-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-[#9CA3AF] uppercase tracking-widest font-black">
                  or
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Guest Find Stations Button */}
              <button
                onClick={() => navigate('/map')}
                className="w-full py-3.5 bg-white hover:bg-gray-50 text-[#16A34A] font-extrabold rounded-xl transition-all duration-300 border-2 border-[#16A34A] flex items-center justify-center gap-2 shadow-sm"
              >
                <EvStationIcon className="!text-xl" />
                Find Stations
              </button>
            </div>

            {/* Trust Badges Section - Common to both */}
            <div className="mt-8">
              <div className="flex items-center gap-3 my-8">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider font-bold">
                  trusted & secure
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-8 text-center">
                <TrustBadge icon={<LockIcon fontSize="small" />} text="Secure" />
                <TrustBadge icon={<BoltIcon fontSize="small" />} text="Instant" />
                <TrustBadge icon={<NatureIcon fontSize="small" />} text="Eco-friendly" />
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
              By signing in, you agree to our Terms of Service & Privacy Policy.
            </p>

            {/* ── Staff Portal button ── */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  const adminUrl = process.env.REACT_APP_ADMIN_URL || "http://localhost:3007";
                  window.location.href = `${adminUrl}/staff-login`;
                }}
                className="w-full py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:text-[#16A34A] hover:border-[#16A34A] transition-all duration-200 flex items-center justify-center gap-2"
              >
                Staff Portal Login →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* REFERRAL MODAL */}
      {showReferralModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '24px', padding: '32px',
            width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            textAlign: 'center'
          }}>
            {/* Header */}
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎁</div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#111', marginBottom: '8px' }}>
              You're Almost In!
            </h2>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px', lineHeight: '1.6' }}>
              Got a referral code from a friend?<br />
              <strong style={{ color: '#16a34a' }}>They'll earn 200 Green Points</strong> when you join!
            </p>

            {/* Input */}
            <input
              type="text"
              placeholder="e.g. EV-ABC123"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              maxLength={12}
              style={{
                width: '100%', padding: '14px 16px', fontSize: '18px', letterSpacing: '2px',
                border: '2px solid #DCFCE7', borderRadius: '14px', outline: 'none',
                textAlign: 'center', fontWeight: '800', color: '#16a34a',
                boxSizing: 'border-box', marginBottom: '12px',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#16a34a'}
              onBlur={(e) => e.target.style.borderColor = '#DCFCE7'}
            />

            {/* Info text */}
            <p style={{ color: '#999', fontSize: '13px', marginBottom: '24px' }}>
              You'll earn <strong>100 Green Points</strong> just for joining — no code needed!
            </p>

            {/* Error */}
            {referralError && (
              <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px', fontWeight: '700' }}>
                {referralError}
              </p>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleReferralSkip}
                disabled={referralLoading}
                style={{
                  flex: 1, padding: '14px', borderRadius: '14px', border: '2px solid #F3F4F6',
                  backgroundColor: '#fff', color: '#6B7280', fontSize: '15px',
                  fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Skip
              </button>
              <button
                onClick={handleReferralContinue}
                disabled={referralLoading}
                style={{
                  flex: 2, padding: '14px', borderRadius: '14px', border: 'none',
                  backgroundColor: '#16a34a', color: '#fff', fontSize: '15px',
                  fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 10px 15px -3px rgba(22, 163, 74, 0.2)',
                  opacity: referralLoading ? 0.7 : 1
                }}
              >
                {referralLoading ? 'Setting up...' : 'Continue →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="bg-white rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
    <div className="mb-3">{icon}</div>
    <div className="text-sm font-bold text-[#1A1A1A] mb-1">{title}</div>
    <div className="text-[11px] text-gray-400 leading-relaxed">{desc}</div>
  </div>
);

const TrustBadge = ({ icon, text }) => (
  <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-3 rounded-xl flex flex-col items-center gap-1.5 transition-transform hover:scale-105">
    <div className="text-[#16A34A]">{icon}</div>
    <span className="text-[10px] font-bold text-[#16A34A] uppercase tracking-wide">
      {text}
    </span>
  </div>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default LoginPage;