import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  EmojiEvents as EmojiEventsIcon,
  Bolt as BoltIcon,
  Cloud as CloudIcon,
  Savings as SavingsIcon,
  EvStation as EvStationIcon,
  CalendarMonth as CalendarMonthIcon,
  BarChart as BarChartIcon,
  Person as PersonIcon,
  ArrowForward as ArrowForwardIcon,
  History as HistoryIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const stats = [
    { label: "Green Points", value: "0", icon: <EmojiEventsIcon className="text-[#16A34A] !text-[32px]" />, bg: "bg-[#F0FDF4]", border: "border-[#BBF7D0]", textColor: "text-[#16A34A]" },
    { label: "Charging Sessions", value: "0", icon: <BoltIcon className="text-[#D97706] !text-[32px]" />, bg: "bg-[#FFFBEB]", border: "border-[#FDE68A]", textColor: "text-[#D97706]" },
    { label: "CO2 Saved", value: "0 kg", icon: <CloudIcon className="text-[#0284C7] !text-[32px]" />, bg: "bg-[#F0F9FF]", border: "border-[#BAE6FD]", textColor: "text-[#0284C7]" },
    { label: "Money Saved", value: "₹0", icon: <SavingsIcon className="text-[#7C3AED] !text-[32px]" />, bg: "bg-[#F5F3FF]", border: "border-[#DDD6FE]", textColor: "text-[#7C3AED]" },
  ];

  const features = [
    {
      label: "Find Stations",
      desc: "Locate nearby EV charging stations",
      icon: <EvStationIcon className="text-[#1A1A1A] !text-[36px]" />,
      tag: "Ready ✓",    // ← CHANGED from "Week 3"
      path: "/map",
      ready: true        // ← CHANGED to true
    },
    {
      label: "Book a Slot",
      desc: "Reserve your charging slot",
      icon: <CalendarMonthIcon className="text-[#1A1A1A] !text-[36px]" />,
      tag: "Week 4",
      path: "/booking",
      ready: false
    },
    {
      label: "Analytics",
      desc: "View trip stats and CO2 saved",
      icon: <BarChartIcon className="text-[#1A1A1A] !text-[36px]" />,
      tag: "Week 5",
      path: "/analytics",
      ready: false
    },
    {
      label: "My Profile",
      desc: "Edit your personal details",
      icon: <PersonIcon className="text-[#1A1A1A] !text-[36px]" />,
      tag: "Ready ✓",
      path: "/profile",
      ready: true
    },
  ];

  const firstName = currentUser?.displayName?.split(' ')[0] || "Driver";
  const memberSince = currentUser?.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : "March 2026";

  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto space-y-10">

      {/* SECTION 1 - WELCOME BANNER */}
      <div className="bg-[#16A34A] rounded-3xl p-8 md:p-12 flex flex-col lg:flex-row justify-between items-center gap-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />

        <div className="flex-1 space-y-6 z-10 text-center lg:text-left">
          <div className="inline-flex items-center px-4 py-1.5 bg-white/20 rounded-full text-white text-sm font-semibold border border-white/20">
            🌱 Green Mobility Dashboard
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
              Welcome back, <br className="md:hidden" /> {firstName}!
            </h1>
            <p className="text-lg text-white/85 font-medium">
              Your EV journey is tracked here.
            </p>
          </div>
          <button
            onClick={() => navigate('/map')}
            className="bg-white text-[#16A34A] px-8 py-3.5 rounded-lg font-bold hover:bg-[#F0FDF4] transition-all flex items-center gap-2 shadow-lg mx-auto lg:mx-0 group"
          >
            Find Charging Stations
            <ArrowForwardIcon className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Member Card */}
        <div className="w-full max-w-[340px] bg-white/15 border-2 border-white/30 rounded-2xl p-8 backdrop-blur-md text-center text-white z-10 shadow-2xl">
          <EmojiEventsIcon className="!text-[56px] mb-4 opacity-90" />
          <h3 className="text-xl font-bold mb-1">Green Member</h3>
          <div className="text-4xl font-black mb-4">
            0 <span className="text-lg font-bold opacity-70">Points</span>
          </div>
          <div className="bg-white/20 inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            Active Since {memberSince}
          </div>
        </div>
      </div>

      {/* SECTION 2 - STATS GRID */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-[#1A1A1A] px-1">Performance Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`${stat.bg} ${stat.border} border-2 rounded-2xl p-8 text-center transition-all hover:-translate-y-1 hover:shadow-lg group`}
            >
              <div className="mb-4 transform group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
              <div className={`text-3xl font-black ${stat.textColor} mb-1`}>
                {stat.value}
              </div>
              <div className="text-[14px] font-bold text-[#555] mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3 - FEATURE CARDS */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-[#1A1A1A] px-1">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feat, i) => (
            <div
              key={i}
              onClick={() => feat.ready && navigate(feat.path)}
              className={`bg-[#EAB308] p-8 rounded-2xl transition-all shadow-md group 
                ${feat.ready
                  ? 'cursor-pointer hover:-translate-y-1.5 hover:shadow-2xl hover:bg-[#D97706]'
                  : 'cursor-default'
                }`}
            >
              <div className="mb-6 transform group-hover:rotate-6 transition-transform">
                {feat.icon}
              </div>
              <h3 className="text-[17px] font-black text-[#1A1A1A] mb-2">
                {feat.label}
              </h3>
              <p className="text-sm text-[#1A1A1A]/70 font-medium mb-6 leading-relaxed">
                {feat.desc}
              </p>
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest 
                ${feat.ready
                  ? 'bg-green-100 text-green-700'
                  : 'bg-black/10 text-black/40'
                }`}
              >
                {feat.tag}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4 & 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ACCOUNT INFO */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-black text-[#1A1A1A]">Account Information</h2>
          </div>
          <div className="divide-y divide-gray-100 px-6">
            <InfoRow
              icon={<PersonIcon className="text-gray-400" />}
              label="Full Name"
              value={currentUser?.displayName || "—"}
            />
            <InfoRow
              icon={<EmailIcon className="text-gray-400" />}
              label="Email ID"
              value={currentUser?.email || "—"}
            />
            <InfoRow
              icon={<CalendarMonthIcon className="text-gray-400" />}
              label="Member Since"
              value={memberSince}
            />
            <InfoRow
              icon={<CheckCircleIcon className="text-green-500" />}
              label="Status"
              value="Verified Active"
            />
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center p-12 text-center min-h-[340px]">
          <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
            <HistoryIcon className="text-gray-400 !text-4xl" />
          </div>
          <h3 className="text-xl font-black text-[#1A1A1A] mb-2">No activity yet</h3>
          <p className="text-gray-500 text-sm max-w-[280px] mb-8 font-medium">
            Start by finding a charging station near you to begin your EV journey.
          </p>
          <button
            onClick={() => navigate('/map')}
            className="bg-[#EAB308] hover:bg-[#D97706] text-[#1A1A1A] font-extrabold px-8 py-3 rounded-lg transition-all shadow-lg"
          >
            Find Stations
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center justify-between py-5">
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-sm font-bold text-gray-500">{label}</span>
    </div>
    <span className="text-sm font-black text-[#1A1A1A]">{value}</span>
  </div>
);

export default DashboardPage;
