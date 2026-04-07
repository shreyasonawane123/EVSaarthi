import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Search as SearchIcon } from "@mui/icons-material";
import { Avatar } from "@mui/material";

const API_GATEWAY = process.env.REACT_APP_API_URL || "http://localhost:5000";

const UsersPage = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_GATEWAY}/api/admin/users`, { headers });
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(q);
    const emailMatch = u.email?.toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Loading Users...</div>;
  }

  return (
    <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-[#1A1A1A]">Registered Users</h1>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
            {users.length} Users
          </span>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="text-gray-400 !text-xl" />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EAB308] focus:border-transparent transition-all"
            placeholder="Search name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[900px] whitespace-nowrap text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold w-12 text-center">User</th>
                <th className="p-4 font-bold">Details</th>
                <th className="p-4 font-bold">City</th>
                <th className="p-4 font-bold">Tariff</th>
                <th className="p-4 font-bold">Points</th>
                <th className="p-4 font-bold">Joined</th>
                <th className="p-4 font-bold text-center">Vehicle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <Avatar src={user.photoURL} className="!w-9 !h-9 border border-gray-100 shadow-sm" />
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#1A1A1A]">{user.name || "Unknown"}</div>
                      <div className="text-xs text-gray-500">{user.email || "—"}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-medium">{user.city || "—"}</td>
                    <td className="p-4 text-sm font-bold text-gray-700">₹{user.electricityTariff || 7}/unit</td>
                    <td className="p-4 text-sm font-black text-[#16A34A]">{user.totalPoints || 0}</td>
                    <td className="p-4 text-xs font-semibold text-gray-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-lg" title={user.vehicleProfile ? "Vehicle saved" : "No vehicle"}>
                        {user.vehicleProfile ? "✅" : "➖"}
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

export default UsersPage;
