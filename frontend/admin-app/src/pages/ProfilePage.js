import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { 
  Person as PersonIcon, 
  Email as EmailIcon, 
  AdminPanelSettings as AdminIcon, 
  Business as BusinessIcon 
} from "@mui/icons-material";

const API_GATEWAY = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ProfilePage = () => {
  const { currentUser, adminRole } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await currentUser.getIdToken();
        const res = await axios.get(`${API_GATEWAY}/api/admin/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setProfile(res.data.admin);
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  if (loading) return <div className="p-10 text-center font-bold text-gray-500">Loading profile...</div>;

  return (
    <div className="p-4 lg:p-10 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-[#1A1A1A]">Admin Profile</h1>
        <p className="text-sm text-gray-500 font-medium">Your account details and role permissions</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#1A1A1A] px-8 py-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-[#EAB308] rounded-full flex items-center justify-center mb-4 border-4 border-white/10">
            <PersonIcon className="text-[#1A1A1A] !text-[40px]" />
          </div>
          <h2 className="text-xl font-black text-white">{profile?.name || "Admin User"}</h2>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-[#EAB308] uppercase tracking-widest border border-white/10">
            {adminRole === 'superadmin' ? 'Super Platform Admin' : (adminRole === 'admin' ? 'Tenant Admin' : 'Station Operator')}
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileItem 
              icon={<PersonIcon className="text-gray-400" />} 
              label="Full Name" 
              value={profile?.name || "—"} 
            />
            <ProfileItem 
              icon={<EmailIcon className="text-gray-400" />} 
              label="Email Address" 
              value={profile?.email || currentUser?.email || "—"} 
            />
            <ProfileItem 
              icon={<AdminIcon className="text-gray-400" />} 
              label="Assigned Role" 
              value={adminRole?.charAt(0).toUpperCase() + adminRole?.slice(1) || "—"} 
            />
            {profile?.tenantId && (
              <ProfileItem 
                icon={<BusinessIcon className="text-gray-400" />} 
                label="Tenant Organization" 
                value={profile?.tenantName || "Unknown Tenant"} 
              />
            )}
          </div>

          <div className="pt-6 border-t border-gray-100">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
                Note: Profile editing is currently restricted to Superadmins. If you need to change your name or role, please contact the platform administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileItem = ({ icon, label, value }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest">
      {icon} {label}
    </div>
    <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-100 text-sm font-bold text-[#1A1A1A]">
      {value}
    </div>
  </div>
);

export default ProfilePage;
