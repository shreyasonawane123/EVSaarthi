// frontend/booking-app/src/pages/BookingPage.js
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  EvStation, LocationOn, LocalOffer, InfoOutlined, WarningAmber,
  Star as StarIcon, StarBorder as StarBorderIcon, 
  Verified as VerifiedIcon, PhotoCamera as PhotoCameraIcon,
  RateReview as RateReviewIcon
} from "@mui/icons-material";
import { 
  Alert, Snackbar, Dialog, DialogTitle, DialogContent, 
  DialogActions, Button, Typography, TextField, Rating, 
  IconButton, CircularProgress 
} from "@mui/material";
import { storage } from "../firebase/config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const GATEWAY_URL = process.env.REACT_APP_API_GATEWAY_URL || "http://localhost:5000";

const BookingPage = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const stationId = searchParams.get("stationId");

  // State
  const [station, setStation] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Form State
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(""); // 30, 60, 120
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, text: "", photo: null, uploading: false });

  // Snackbar & Dialog State
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const showNotify = (message, severity = "info") => setSnackbar({ open: true, message, severity });
  
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null });
  const openConfirm = (title, message, onConfirm) => setConfirmDialog({ open: true, title, message, onConfirm });

  // Dates Generate (Next 7 days)
  const getNext7Days = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        id: d.toISOString().split("T")[0],
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" }),
        dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: d.toLocaleDateString('en-GB').split('/').join('-') // DD-MM-YYYY
      });
    }
    return dates;
  };
  const dates = getNext7Days();

  // Time Slots Generate (08:00 to 22:00, 30 min intervals)
  const generateTimeSlots = () => {
    const times = [];
    let h = 8, m = 0;
    while (h < 22) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      times.push(`${hh}:${mm}`);
      m += 30;
      if (m >= 60) { h++; m = 0; }
    }
    return times;
  };
  const timeSlots = generateTimeSlots();

  // Load Data
  useEffect(() => {
    if (!stationId) {
      setError("No station selected. Please go back to the map.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const token = await currentUser.getIdToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 1. Fetch Station (public route is fine, but proxy through gateway)
        const stRes = await axios.get(`${GATEWAY_URL}/api/stations/${stationId}`, config);
        setStation(stRes.data.station);

        // 2. Fetch Vehicle Info (need battery capacity for cost)
        const vRes = await axios.get(`${GATEWAY_URL}/api/vehicle/me`, config);
        setVehicle(vRes.data.vehicle || { batteryCapacity: 40, vehicleModel: "Unknown Vehicle", vehicleBrand: "EV" });

        // 3. Fetch My Bookings
        const bRes = await axios.get(`${GATEWAY_URL}/api/booking/my-bookings`, config);
        setBookings(bRes.data.bookings || []);

        setLoading(false);
        setLoadingBookings(false);
        
        // 4. Fetch Reviews
        fetchReviews();
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load details. " + (err.response?.data?.error || err.message));
        setLoading(false);
        setLoadingBookings(false);
      }
    };
    fetchData();
  }, [stationId, currentUser]);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${GATEWAY_URL}/api/stations/${stationId}/reviews`);
      setReviews(res.data.reviews || []);
      setLoadingReviews(false);
    } catch (err) { console.error("Reviews fetch error:", err); setLoadingReviews(false); }
  };

  const loadBookings = async () => {
    try {
      const token = await currentUser.getIdToken();
      const bRes = await axios.get(`${GATEWAY_URL}/api/booking/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(bRes.data.bookings || []);
    } catch(e) {}
  };

  const handleProceedToPay = async () => {
    if (!selectedDate || !selectedTime || !duration) return;
    setBookingLoading(true);

    try {
      const token = await currentUser.getIdToken();
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // 1. Create Razorpay Order on Backend
      const orderRes = await axios.post(`${GATEWAY_URL}/api/booking/payment/order`, {
        stationId,
        duration: Number(duration)
      }, config);

      const { orderId, amount, currency } = orderRes.data;

      // 2. Initialize Razorpay Checkout
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_SXwCfEf5EfAy8k",
        amount: amount,
        currency: currency,
        name: "EV Saarthi",
        description: `Booking for ${station?.name}`,
        order_id: orderId,
        handler: async (response) => {
          // 3. Verify Payment on Success
          try {
            const verifyRes = await axios.post(`${GATEWAY_URL}/api/booking/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              stationId,
              slotDate: selectedDate,
              slotTime: selectedTime,
              duration: Number(duration)
            }, config);

            showNotify("Booking Confirmed!", "success");
            setSelectedTime("");
            setDuration("");
            
            // Reload data
            const stRes = await axios.get(`${GATEWAY_URL}/api/stations/${stationId}`, config);
            setStation(stRes.data.station);
            await loadBookings();
          } catch (verifyErr) {
            showNotify(verifyErr.response?.data?.error || "Payment verification failed", "error");
          }
        },
        prefill: {
          email: currentUser.email,
        },
        theme: {
          color: "#EAB308",
        },
        modal: {
          ondismiss: () => {
            showNotify("Payment cancelled by user", "info");
            setBookingLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        showNotify("Payment failed: " + response.error.description, "error");
        setBookingLoading(false);
      });
      rzp.open();

    } catch (err) {
      showNotify(err.response?.data?.error || "Failed to initiate payment", "error");
      setBookingLoading(false);
    }
  };

  const cancelBooking = async (id) => {
    openConfirm(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      async () => {
        try {
          const token = await currentUser.getIdToken();
          await axios.patch(`${GATEWAY_URL}/api/booking/cancel/${id}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          showNotify("Booking Cancelled.", "success");
          // Reload slots/bookings
          const stRes = await axios.get(`${GATEWAY_URL}/api/stations/${stationId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setStation(stRes.data.station);
          await loadBookings();
        } catch(err) {
          showNotify("Failed to cancel: " + (err.response?.data?.error || err.message), "error");
        }
      }
    );
  };

  const handleReviewSubmit = async () => {
    if (!reviewData.text) return showNotify("Please add some feedback", "warning");
    setReviewData(prev => ({ ...prev, uploading: true }));

    try {
      let photoUrl = "";
      // 1. Upload Photo if exists (Wrapped in try-catch for CORS/Network safety)
      if (reviewData.photo) {
        try {
          const storageRef = ref(storage, `reviews/${stationId}/${currentUser.uid}_${Date.now()}`);
          const uploadTask = await uploadBytesResumable(storageRef, reviewData.photo);
          photoUrl = await getDownloadURL(uploadTask.ref);
        } catch (uploadErr) {
          console.error("Firebase Storage Upload Error (Check CORS/Rules):", uploadErr);
          showNotify("Photo upload failed (CORS/Network error). Submitting review without photo...", "warning");
          // Continue with textual review submission
        }
      }

      // 2. Get GPS Location
      let userLat = null, userLng = null;
      try {
        const pos = await new Promise((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000, enableHighAccuracy: true })
        );
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
      } catch (e) { 
        console.warn("GPS capture failed for review:", e.message); 
      }

      // 3. Submit Review
      const token = await currentUser.getIdToken();
      await axios.post(`${GATEWAY_URL}/api/stations/${stationId}/reviews`, {
        rating: reviewData.rating,
        text: reviewData.text,
        photoUrl,
        userLat,
        userLng
      }, { headers: { Authorization: `Bearer ${token}` } });

      showNotify("Review submitted for moderation!", "success");
      setReviewModal(false);
      setReviewData({ rating: 5, text: "", photo: null, uploading: false });
      
      // OPTIONAL: Refresh reviews list locally if moderation is off (not the case here)
      // fetchReviews();

    } catch (err) {
      console.error("Full Review Submission Error:", err);
      showNotify("Submission failed: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setReviewData(prev => ({ ...prev, uploading: false }));
    }
  };


  if (loading) return <div className="p-8 text-center text-lg font-bold">Loading booking details...</div>;
  if (error) return <div className="p-8 text-center text-red-600 font-bold max-w-xl mx-auto border border-red-200 bg-red-50 rounded-xl mt-10">🚨 {error}</div>;

  // Standardized Time-Based Logic: (Duration/60) * Price
  const price = station?.pricePerUnit ? Number(station.pricePerUnit) : 10;
  
  const estimatedCost = duration 
    ? ((Number(duration) / 60) * price).toFixed(2)
    : "0.00";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 font-sans">
      
      {/* SECTION 1: Station Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] mb-2">{station?.name}</h1>
          <div className="flex items-center text-gray-500 mb-4 text-sm font-medium">
            <LocationOn fontSize="small" className="mr-1" />
            {station?.address}, {station?.city}
          </div>
          <div className="flex flex-wrap gap-2">
            {(station?.connectorTypes || []).map(ct => (
              <span key={ct} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold">
                {ct}
              </span>
            ))}
            <span className="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-bold">
              ₹{station?.pricePerUnit}/hr
            </span>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 min-w-[160px] text-center">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Available Slots</div>
          <div className={`text-3xl font-black ${station?.availableSlots > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {station?.availableSlots} <span className="text-base font-bold text-gray-400">/ {station?.totalSlots}</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Booking Form */}
      {station?.availableSlots > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#16A34A] px-6 py-4 text-white">
            <h2 className="text-lg font-black flex items-center gap-2">
              <EvStation /> Select Your Slot
            </h2>
          </div>

          <div className="p-6 space-y-8">
            {/* Dates */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase">1. Select Date</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {dates.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDate(d.fullDate)}
                    className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all min-w-[100px] text-center
                      ${selectedDate === d.fullDate 
                        ? 'border-[#EAB308] bg-[#FFFBEB] shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className={`font-black text-sm ${selectedDate === d.fullDate ? 'text-[#D97706]' : 'text-gray-500'}`}>{d.label}</div>
                    <div className="font-bold text-[#1A1A1A]">{d.dateStr}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Times */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase">2. Select Time</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {timeSlots.map(t => (
                  <button
                    key={t}
                    disabled={!selectedDate}
                    onClick={() => setSelectedTime(t)}
                    className={`py-2 rounded-lg text-sm font-bold border-2 transition-all
                      ${!selectedDate ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' : 
                        selectedTime === t 
                        ? 'border-[#EAB308] bg-[#EAB308] text-white shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase">3. Select Duration</h3>
              <div className="flex gap-3">
                {[
                  { val: 30, label: "30 Min" },
                  { val: 60, label: "1 Hour" },
                  { val: 120, label: "2 Hours" }
                ].map(dur => (
                  <button
                    key={dur.val}
                    onClick={() => setDuration(dur.val)}
                    className={`flex-1 py-3 rounded-xl border-2 font-black transition-all
                      ${duration === dur.val 
                        ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Cost & Submit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#F8FAFC] p-5 rounded-xl border border-blue-50">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Estimated Cost</div>
                <div className="text-3xl font-black text-[#1A1A1A]">₹{estimatedCost}</div>
                <div className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-1">
                  <InfoOutlined style={{ fontSize: 14 }} />
                  Secure payment via Razorpay
                </div>
              </div>
              
              <button
                onClick={handleProceedToPay}
                disabled={!selectedDate || !selectedTime || !duration || bookingLoading}
                className={`py-4 px-10 rounded-xl font-black text-lg transition-all w-full sm:w-auto shadow-lg
                  ${!selectedDate || !selectedTime || !duration 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                    : bookingLoading 
                      ? 'bg-[#16A34A] text-white opacity-80 cursor-wait'
                      : 'bg-[#16A34A] text-white hover:bg-[#15803d] hover:-translate-y-1'}`}
              >
                {bookingLoading ? 'Processing...' : 'Proceed to Pay'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-700">
          <WarningAmber style={{ fontSize: 48, marginBottom: 12 }} />
          <h2 className="text-xl font-black">Station Full</h2>
          <p className="font-medium mt-2">There are currently no slots available at this station. Please check back later or find another nearby station.</p>
        </div>
      )}

      {/* SECTION 3: My Bookings */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h2 className="text-2xl font-black text-[#1A1A1A] mb-6">My Bookings</h2>
        
        {loadingBookings ? (
          <div className="text-gray-500 font-bold p-4">Loading your bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-500 font-medium">
            You haven't booked any slots yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map(b => (
              <div key={b.bookingId} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                {/* Status bar left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 
                  ${b.status === 'confirmed' ? 'bg-green-500' : 
                    b.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-400'}`} 
                />
                
                <div className="flex justify-between items-start mb-3 pl-2">
                  <div>
                    <h3 className="font-black text-[17px] text-[#1A1A1A] pb-0.5">{b.stationName}</h3>
                    <div className="text-xs text-gray-500 font-bold">{b.slotDate} at {b.slotTime}</div>
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider border
                    ${b.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' : 
                      b.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {b.status}
                  </span>
                </div>
                
                <div className="pl-2 flex justify-between items-end mt-4">
                  <div>
                    <div className="text-xs font-bold text-gray-400 mb-0.5 uppercase tracking-wide">Total Cost</div>
                    <div className="font-black text-lg text-[#1A1A1A]">₹{b.totalCost}</div>
                  </div>
                  
                  {b.status === 'confirmed' && (
                    <button 
                      onClick={() => cancelBooking(b.bookingId)}
                      className="text-sm font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-1.5 rounded-lg transition-colors border border-red-100"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Snackbar and Confirm Dialog */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%', fontWeight: 'bold' }}>{snackbar.message}</Alert>
      </Snackbar>

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle sx={{ fontWeight: 'black', px: 3, pt: 3 }}>{confirmDialog.title}</DialogTitle>
        <DialogContent sx={{ px: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} sx={{ fontWeight: 'bold', color: 'gray.500' }}>Back</Button>
          <Button 
             onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ ...confirmDialog, open: false }); }} 
             variant="contained" color="error" sx={{ fontWeight: 'black', borderRadius: '12px', px: 4, py: 1, boxShadow: 'none' }}>
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* SECTION 4: Reviews */}
      <div className="mt-16 pt-10 border-t border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-[#1A1A1A]">Community Reviews</h2>
            <p className="text-gray-500 font-medium text-sm">Verified feedback from real station visitors</p>
          </div>
          <button 
            onClick={() => setReviewModal(true)}
            className="flex items-center gap-2 bg-[#EAB308] text-[#1A1A1A] px-5 py-2.5 rounded-xl font-bold hover:bg-[#d9a300] transition-colors shadow-sm"
          >
            <RateReviewIcon fontSize="small" /> Write Review
          </button>
        </div>

        {loadingReviews ? (
          <div className="text-gray-400 font-bold p-4">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400 font-bold italic">
            No approved reviews yet. Be the first to share your experience!
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map(rev => (
              <div key={rev.id} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F5F3FF] text-[#7C3AED] rounded-full flex items-center justify-center font-black">
                      {rev.userName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-black text-sm text-[#1A1A1A]">{rev.userName}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {new Date(rev.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {rev.verifiedVisit && (
                    <div className="flex items-center gap-1 text-[#16A34A] bg-green-50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-green-100">
                      <VerifiedIcon style={{ fontSize: 13 }} /> Verified Visit
                    </div>
                  )}
                </div>
                <Rating value={rev.rating} readOnly size="small" sx={{ mb: 1.5, color: '#EAB308' }} />
                <p className="text-gray-700 text-sm font-medium leading-relaxed italic">"{rev.text}"</p>
                {rev.photoUrl && (
                  <img src={rev.photoUrl} alt="Review" className="mt-4 rounded-xl max-h-48 w-full object-cover border border-gray-100 shadow-sm" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Dialog open={reviewModal} onClose={() => !reviewData.uploading && setReviewModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: '900', pt: 4, px: 4 }}>How was your experience?</DialogTitle>
        <DialogContent sx={{ px: 4 }}>
          <div className="space-y-6 pt-2">
            <div>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'gray.500', display: 'block', mb: 1, textTransform: 'uppercase' }}>Select Rating</Typography>
              <Rating 
                size="large" 
                value={reviewData.rating} 
                onChange={(_, val) => setReviewData(prev => ({ ...prev, rating: val }))} 
                sx={{ color: '#EAB308' }}
              />
            </div>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Share your experience with other EV owners..."
              value={reviewData.text}
              onChange={(e) => setReviewData(prev => ({ ...prev, text: e.target.value }))}
              InputProps={{ style: { borderRadius: '16px', fontWeight: '500' } }}
            />

            <div className="flex items-center gap-4">
              <input 
                type="file" 
                accept="image/*" 
                hidden 
                id="photo-upload" 
                onChange={(e) => setReviewData(prev => ({ ...prev, photo: e.target.files[0] }))}
              />
              <label htmlFor="photo-upload">
                <Button component="span" variant="outlined" startIcon={<PhotoCameraIcon />} sx={{ borderRadius: '12px', fontWeight: 'bold' }}>
                  {reviewData.photo ? "Change Photo" : "Add Photo"}
                </Button>
              </label>
              {reviewData.photo && <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'green.600' }}>{reviewData.photo.name} ready</Typography>}
            </div>
            
            <Alert severity="info" sx={{ borderRadius: '12px', fontWeight: 'bold' }}>
              Your visit status will be auto-detected via GPS for a "Verified" badge.
            </Alert>
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setReviewModal(false)} disabled={reviewData.uploading} sx={{ fontWeight: 'bold', color: 'gray.500' }}>Cancel</Button>
          <Button 
            onClick={handleReviewSubmit}
            disabled={reviewData.uploading}
            variant="contained" 
            sx={{ bgcolor: '#EAB308', color: '#1A1A1A', fontWeight: '900', borderRadius: '12px', px: 4, '&:hover': { bgcolor: '#d9a300' } }}
          >
            {reviewData.uploading ? <CircularProgress size={20} /> : "Submit Review"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default BookingPage;
