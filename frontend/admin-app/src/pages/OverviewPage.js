import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  People as PeopleIcon,
  EvStation as EvStationIcon,
  CheckCircle as CheckCircleIcon,
  DirectionsCar as DirectionsCarIcon,
  ArrowForward as ArrowForwardIcon
} from "@mui/icons-material";

const API_GATEWAY = process.env.REACT_APP_API_GATEWAY_URL || "http://localhost:5000";

const OverviewPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStations: 0,
    activeStations: 0,
    totalVehicles: 0
  });
  const [recentStations, setRecentStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch stats
      const statsRes = await axios.get(`${API_GATEWAY}/api/admin/stats`, { headers });
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }

      // Fetch stations
      const stationsRes = await axios.get(`${API_GATEWAY}/api/admin/stations`, { headers });
      if (stationsRes.data.success) {
        // Take last 5 created (assumes descending order from backend)
        setRecentStations(stationsRes.data.stations.slice(0, 5));
      }
    } catch (error) {
      console.error("Failed to fetch overview data", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, icon: <PeopleIcon className="text-blue-500 !text-3xl" />, bg: "bg-[#F0F9FF]" },
    { label: "Total Stations", value: stats.totalStations, icon: <EvStationIcon className="text-green-500 !text-3xl" />, bg: "bg-[#F0FDF4]" },
    { label: "Active Stations", value: stats.activeStations, icon: <CheckCircleIcon className="text-yellow-600 !text-3xl" />, bg: "bg-[#FFFBEB]" },
    { label: "Registered Vehicles", value: stats.totalVehicles, icon: <DirectionsCarIcon className="text-purple-500 !text-3xl" />, bg: "bg-[#F5F3FF]" },
  ];

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Loading Overview...</div>;
  }

  return (
    <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#1A1A1A]">Admin Overview</h1>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {statCards.map((card, idx) => (
          <div key={idx} className={`${card.bg} rounded-xl p-6 shadow-sm border border-black/5 flex items-center gap-4`}>
            <div className="p-3 bg-white/60 rounded-lg shadow-sm">
              {card.icon}
            </div>
            <div>
              <div className="text-sm font-bold text-gray-500">{card.label}</div>
              <div className="text-3xl font-black text-[#1A1A1A]">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* RECENT STATIONS TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-[#F9FAFB]">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Recent Stations</h2>
          <button 
            onClick={() => navigate('/admin/stations')}
            className="text-sm font-bold text-[#EAB308] hover:text-[#D97706] flex items-center gap-1"
          >
            View All <ArrowForwardIcon fontSize="small" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] whitespace-nowrap text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 italic text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Station Name</th>
                <th className="p-4 font-bold">City</th>
                <th className="p-4 font-bold">Slots (Avail/Total)</th>
                <th className="p-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentStations.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">No stations added yet.</td>
                </tr>
              ) : (
                recentStations.map((station) => (
                  <tr key={station.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-bold text-[#1A1A1A]">{station.name}</td>
                    <td className="p-4 text-gray-500 text-sm font-medium">{station.city}</td>
                    <td className="p-4 text-sm font-bold">
                      {station.availableSlots} <span className="text-gray-400 font-normal">/ {station.totalSlots}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        station.status === 'open' ? 'bg-[#F0FDF4] text-[#16A34A]' :
                        station.status === 'filling' ? 'bg-[#FFFBEB] text-[#D97706]' :
                        station.status === 'maintenance' ? 'bg-[#F5F5F5] text-gray-500' :
                        'bg-[#FEF2F2] text-[#DC2626]'
                      }`}>
                        {station.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
