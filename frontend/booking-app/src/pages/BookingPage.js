// frontend/booking-app/src/pages/BookingPage.js
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  EvStation, LocationOn, LocalOffer, InfoOutlined, WarningAmber
} from "@mui/icons-material";

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
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load details. " + (err.response?.data?.error || err.message));
        setLoading(false);
        setLoadingBookings(false);
      }
    };
    fetchData();
  }, [stationId, currentUser]);

  const loadBookings = async () => {
    try {
      const token = await currentUser.getIdToken();
      const bRes = await axios.get(`${GATEWAY_URL}/api/booking/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(bRes.data.bookings || []);
    } catch(e) {}
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !duration) return;
    setBookingLoading(true);

    try {
      const token = await currentUser.getIdToken();
      const res = await axios.post(`${GATEWAY_URL}/api/booking/create`, {
        stationId,
        slotDate: selectedDate, // expects format from the date buttons
        slotTime: selectedTime,
        duration: Number(duration)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("Booking Confirmed!");
      // Reset form
      setSelectedTime("");
      setDuration("");
      // Reload slots/bookings
      
      const stRes = await axios.get(`${GATEWAY_URL}/api/stations/${stationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStation(stRes.data.station);
      await loadBookings();

    } catch (err) {
      alert("Booking failed: " + (err.response?.data?.error || err.message));
    } finally {
      setBookingLoading(false);
    }
  };

  const cancelBooking = async (id) => {
    if(!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const token = await currentUser.getIdToken();
      await axios.patch(`${GATEWAY_URL}/api/booking/cancel/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Booking Cancelled.");
      // Reload slots/bookings
      const stRes = await axios.get(`${GATEWAY_URL}/api/stations/${stationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStation(stRes.data.station);
      await loadBookings();
    } catch(err) {
      alert("Failed to cancel: " + (err.response?.data?.error || err.message));
    }
  };


  if (loading) return <div className="p-8 text-center text-lg font-bold">Loading booking details...</div>;
  if (error) return <div className="p-8 text-center text-red-600 font-bold max-w-xl mx-auto border border-red-200 bg-red-50 rounded-xl mt-10">🚨 {error}</div>;

  // Calculate generic cost display
  const vBattery = vehicle?.batteryCapacity ? Number(vehicle.batteryCapacity) : 40;
  const price = station?.pricePerUnit ? Number(station.pricePerUnit) : 10;
  
  const estimatedCost = duration 
    ? ((Number(duration) / 60) * price * (vBattery / 100)).toFixed(2)
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
              ₹{station?.pricePerUnit}/kWh
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
                  Based on {vehicle?.vehicleBrand || "EV"} ({vBattery}kWh)
                </div>
              </div>
              
              <button
                onClick={handleBook}
                disabled={!selectedDate || !selectedTime || !duration || bookingLoading}
                className={`py-4 px-10 rounded-xl font-black text-lg transition-all w-full sm:w-auto shadow-lg
                  ${!selectedDate || !selectedTime || !duration 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                    : bookingLoading 
                      ? 'bg-[#D97706] text-white opacity-80 cursor-wait'
                      : 'bg-[#EAB308] text-[#1A1A1A] hover:bg-[#D97706] hover:text-white hover:-translate-y-1'}`}
              >
                {bookingLoading ? 'Processing...' : 'Confirm Booking'}
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

    </div>
  );
};

export default BookingPage;
