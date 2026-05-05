import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  RateReview as ReviewIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Verified as VerifiedIcon,
  Schedule as PendingIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Alert, Snackbar } from '@mui/material';

const API_GATEWAY = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ReviewsPage = () => {
  const { currentUser, adminRole } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [visibleCount, setVisibleCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const showNotify = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      
      const [reviewsRes, tenantsRes] = await Promise.all([
        axios.get(`${API_GATEWAY}/api/admin/reviews`, { headers: { Authorization: `Bearer ${token}` } }),
        adminRole === 'superadmin' 
          ? axios.get(`${API_GATEWAY}/api/admin/tenants`, { headers: { Authorization: `Bearer ${token}` } })
          : Promise.resolve({ data: { success: true, tenants: [] } })
      ]);

      if (reviewsRes.data.success) {
        setReviews(reviewsRes.data.reviews);
      }
      if (tenantsRes.data.success) {
        setTenants(tenantsRes.data.tenants);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg && msg.includes("https://console.firebase.google.com")) {
        showNotify("A Firestore Index is required. Click the link in your console to create it.", "warning");
      } else {
        showNotify('Failed to fetch data: ' + (err.response?.data?.error || err.message), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchReviews();
  }, [currentUser]);

  const handleUpdateStatus = async (stationId, reviewId, status) => {
    try {
      const token = await currentUser.getIdToken();
      await axios.patch(`${API_GATEWAY}/api/admin/reviews/${stationId}/${reviewId}`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchReviews();
    } catch (err) {
      showNotify('Update failed: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleApproveAll = async () => {
    const pendingReviews = reviews.filter(rev => rev.status === 'pending');
    if (pendingReviews.length === 0) {
      showNotify('No pending reviews to approve', 'info');
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const reviewIds = pendingReviews.map(rev => ({ 
        stationId: rev.stationId, 
        reviewId: rev.id 
      }));

      await axios.post(`${API_GATEWAY}/api/admin/reviews/approve-all`, 
        { reviewIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showNotify(`Successfully approved ${pendingReviews.length} reviews`, 'success');
      fetchReviews();
    } catch (err) {
      showNotify('Bulk approval failed: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const filteredReviews = adminRole === 'superadmin' && selectedTenant !== 'all'
    ? reviews.filter(r => r.tenantId === selectedTenant)
    : reviews;

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircleIcon fontSize="inherit" /> Approved</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><CancelIcon fontSize="inherit" /> Rejected</span>;
      default: return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><PendingIcon fontSize="inherit" /> Pending</span>;
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] flex items-center gap-2">
            <ReviewIcon className="text-[#EAB308]" /> Review Moderation
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Approve or reject community station reviews</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleApproveAll}
            disabled={!filteredReviews.some(r => r.status === 'pending')}
            className="flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircleIcon /> Approve All Visible
          </button>
          {adminRole === 'superadmin' && (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filter:</span>
              <select 
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none cursor-pointer text-gray-700"
              >
                <option value="all">All Tenants</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <button 
            onClick={fetchReviews}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-[#EAB308] hover:border-[#EAB308] transition-all shadow-sm"
          >
            <RefreshIcon />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-20 font-bold text-gray-500">Loading reviews...</div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-2xl p-20 text-center border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-bold">No reviews found for this selection.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-black uppercase tracking-widest text-gray-400">
                <th className="px-6 py-4">User & Date</th>
                <th className="px-6 py-4">Station</th>
                {adminRole === 'superadmin' && <th className="px-6 py-4">Tenant</th>}
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Feedback</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReviews.slice(0, visibleCount).map((rev) => (
                <tr key={`${rev.stationId}-${rev.id}`} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-sm text-gray-800">{rev.userName}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{new Date(rev.timestamp).toLocaleDateString()}</div>
                    {rev.verifiedVisit && (
                      <div className="flex items-center gap-1 text-blue-600 text-[10px] font-bold mt-1 uppercase italic">
                        <VerifiedIcon className="!text-[12px]" /> Verified Visit
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-gray-500 uppercase">Station ID:</div>
                    <div className="text-sm font-medium text-gray-700">{rev.stationId}</div>
                  </td>
                  {adminRole === 'superadmin' && (
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-800">
                        {tenants.find(t => t.id === rev.tenantId)?.name || '—'}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex text-[#EAB308]">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < rev.rating ? 'opacity-100' : 'opacity-20'}>★</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 min-w-[200px]">
                    <div className="text-sm text-gray-600 italic">"{rev.text}"</div>
                    {rev.photoUrl && (
                      <a href={rev.photoUrl} target="_blank" rel="noreferrer" className="inline-block mt-2 text-blue-500 text-xs font-bold underline">
                        View Photo
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(rev.status)}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {rev.status !== 'approved' && (
                      <button 
                        onClick={() => handleUpdateStatus(rev.stationId, rev.id, 'approved')}
                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Approve"
                      >
                        <CheckCircleIcon fontSize="small" />
                      </button>
                    )}
                    {rev.status !== 'rejected' && (
                      <button 
                        onClick={() => handleUpdateStatus(rev.stationId, rev.id, 'rejected')}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Reject"
                      >
                        <CancelIcon fontSize="small" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredReviews.length > visibleCount && (
            <div className="p-4 text-center border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setVisibleCount((prev) => prev + 10)}
                className="px-6 py-2 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%', fontWeight: 'bold' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ReviewsPage;
