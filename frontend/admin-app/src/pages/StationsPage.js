import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationOnIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { Switch, Modal, TextField, MenuItem, Checkbox, ListItemText, Select, InputLabel, FormControl, Chip, Tabs, Tab, Box, Typography, LinearProgress } from "@mui/material";
import * as XLSX from "xlsx";

const API_GATEWAY = process.env.REACT_APP_API_GATEWAY_URL || "http://localhost:5000";
const MAPPLS_KEY = "496b3b573470430656a3e7448c9a7f5b";

// Add a mock indianCities.json handling since we can't load it easily without copying
// I'll define a few mock ones natively here, in production we'd import indianCities.json
const mockCities = [
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
  { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { city: "Delhi", state: "Delhi", lat: 28.7041, lng: 77.1025 },
];

// Geocode a full address string using the Mappls SDK (already loaded on window).
// Returns { lat, lng } on success, or null on failure/timeout.
const geocodeAddress = (address, city, state) =>
  new Promise((resolve) => {
    const fullAddr = `${address}, ${city}, ${state}, India`;
    if (!window.mappls || !window.mappls.search) {
      console.warn("[Geocode] Mappls SDK not ready for:", fullAddr);
      return resolve(null);
    }
    const timer = setTimeout(() => {
      console.warn("[Geocode] Timeout for:", fullAddr);
      resolve(null);
    }, 10000);
    try {
      window.mappls.search({ query: fullAddr }, (response) => {
        clearTimeout(timer);
        let result = null;
        if (Array.isArray(response) && response.length > 0) result = response[0];
        else if (response?.results?.length > 0) result = response.results[0];
        else if (response?.copResults?.length > 0) result = response.copResults[0];
        if (result && (result.lat || result.geometry?.location)) {
          const lat = result.lat || result.geometry.location.lat;
          const lng = result.lng || result.geometry.location.lng;
          resolve({ lat: Number(lat), lng: Number(lng) });
        } else {
          console.warn("[Geocode] No result for:", fullAddr);
          resolve(null);
        }
      });
    } catch (err) {
      clearTimeout(timer);
      console.error("[Geocode] SDK error for:", fullAddr, err);
      resolve(null);
    }
  });

const CONNECTOR_OPTIONS = ["CCS2", "CHAdeMO", "Type 2 AC", "AC Slow"];
const PAYMENT_OPTIONS = ["UPI", "Cash", "Card", "Net Banking"];

const getPaymentBadgeColor = (method) => {
  switch (method) {
    case "UPI": return "bg-blue-50 text-blue-600 border-blue-200";
    case "Cash": return "bg-green-50 text-green-600 border-green-200";
    case "Card": return "bg-purple-50 text-purple-600 border-purple-200";
    case "Net Banking": return "bg-gray-50 text-gray-600 border-gray-200";
    default: return "bg-gray-50 text-gray-600 border-gray-100";
  }
};

const StationsPage = () => {
  const { currentUser } = useAuth();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "", address: "", city: "", state: "", connectorTypes: [],
    totalSlots: 4, pricePerUnit: 18, paymentMethods: ["UPI"]
  });
  const [editSlots, setEditSlots] = useState(0);

  // Bulk Upload states
  const [tabValue, setTabValue] = useState(0);
  const [excelData, setExcelData] = useState([]);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [uploadSummary, setUploadSummary] = useState(null);
  const [geocodingMissing, setGeocodingMissing] = useState(false);
  const [geocodeConfirmPending, setGeocodeConfirmPending] = useState(false);

  // Map state
  const [formLat, setFormLat] = useState(null);
  const [formLng, setFormLng] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      // GET stations is public on admin-service, no token needed but let's pass it anyway
      const token = await currentUser.getIdToken();
      const res = await axios.get(`${API_GATEWAY}/api/admin/stations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setStations(res.data.stations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id, currentVal) => {
    try {
      const token = await currentUser.getIdToken();
      await axios.patch(`${API_GATEWAY}/api/admin/stations/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStations();
    } catch (e) {
      console.error(e);
      alert("Failed to toggle station visibility");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}?\nThis cannot be undone.`)) return;
    try {
      const token = await currentUser.getIdToken();
      await axios.delete(`${API_GATEWAY}/api/admin/stations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStations();
    } catch (e) {
      console.error(e);
      alert("Failed to delete station");
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formLat || !formLng) {
      alert("Please find location on map before saving");
      return;
    }
    try {
      const token = await currentUser.getIdToken();
      const stationData = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        lat: formLat,
        lng: formLng,
        connectorTypes: formData.connectorTypes,
        totalSlots: formData.totalSlots,
        availableSlots: formData.totalSlots,
        pricePerUnit: formData.pricePerUnit,
        paymentMethods: formData.paymentMethods,
        status: 'open',
        isActive: true,
        rating: 0
      };
      await axios.post(`${API_GATEWAY}/api/admin/stations/add`, stationData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsAddModalOpen(false);
      setMapInitialized(false);
      setFormLat(null);
      setFormLng(null);
      fetchStations();
    } catch (e) {
      console.error(e);
      alert("Failed to add station");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = await currentUser.getIdToken();
      
      // Update basic details
      await axios.put(`${API_GATEWAY}/api/admin/stations/${editingStation.id}`, {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        connectorTypes: formData.connectorTypes,
        totalSlots: formData.totalSlots,
        pricePerUnit: formData.pricePerUnit,
        paymentMethods: formData.paymentMethods,
        lat: formLat || editingStation.lat,
        lng: formLng || editingStation.lng
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Update slots if changed
      if (editSlots !== editingStation.availableSlots) {
        await axios.patch(`${API_GATEWAY}/api/admin/stations/${editingStation.id}/slots`, {
          availableSlots: editSlots
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      setIsEditModalOpen(false);
      fetchStations();
    } catch (e) {
      console.error(e);
      alert("Failed to edit station");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      // Expected columns: name, address, city, state, connectorTypes, totalSlots, pricePerUnit, paymentMethods, lat, lng
      const formatted = data.slice(1).filter(row => row[0]).map(row => ({
        name: row[0],
        address: row[1],
        city: row[2],
        state: row[3],
        connectorTypes: row[4]?.toString().split(",").map(t => t.trim()) || [],
        totalSlots: Number(row[5]) || 4,
        pricePerUnit: Number(row[6]) || 18,
        paymentMethods: row[7]?.toString().split(",").map(m => m.trim()) || ["UPI"],
        lat: Number(row[8]) || 0,
        lng: Number(row[9]) || 0,
      }));
      
      setExcelData(formatted);
      setUploadSummary(null);
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkUpload = async () => {
    if (excelData.length === 0) return;
    setUploadingBulk(true);
    setUploadSummary(null);
    let successCount = 0;
    let skipCount = 0;       // duplicates
    let geoFailCount = 0;    // geocoding failures

    const token = await currentUser.getIdToken();

    for (let i = 0; i < excelData.length; i++) {
      const station = excelData[i];

      // Step 1: Get coordinates (from CSV or Geocode)
      let coords = null;
      if (station.lat && station.lng) {
        coords = { lat: station.lat, lng: station.lng };
      } else {
        setBulkProgress({ current: i + 1, total: excelData.length, phase: 'geocoding' });
        coords = await geocodeAddress(station.address, station.city, station.state);
      }

      if (!coords) {
        console.error(`[BulkUpload] Geocoding failed for "${station.name}" at "${station.address}, ${station.city}". Skipping.`);
        geoFailCount++;
        continue;
      }

      // Step 2: Upload to backend
      setBulkProgress({ current: i + 1, total: excelData.length, phase: 'uploading' });
      try {
        await axios.post(`${API_GATEWAY}/api/admin/stations/add`, {
          ...station,
          lat: coords.lat,
          lng: coords.lng,
          availableSlots: station.totalSlots,
          status: 'open',
          isActive: true,
          rating: 0
        }, { headers: { Authorization: `Bearer ${token}` } });
        successCount++;
      } catch (err) {
        if (err.response?.data?.error === "Duplicate station") {
          skipCount++;
        } else {
          console.error("[BulkUpload] API error at row", i, err);
        }
      }
    }

    setUploadingBulk(false);
    setUploadSummary({ success: successCount, skipped: skipCount, geoFailed: geoFailCount });
    fetchStations();
  };

  // Calls backend endpoint to batch-geocode all stations with lat=0,lng=0
  const handleGeocodeExisting = async () => {
    const missingCount = stations.filter(st => !st.lat && !st.lng).length;
    if (missingCount === 0) return;

    setGeocodingMissing(true);
    setGeocodeConfirmPending(false);
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.post(
        `${API_GATEWAY}/api/admin/stations/geocode-missing`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { fixed, failed } = res.data;
      alert(`Geocoding complete!\n✅ ${fixed} stations updated.${failed ? `\n⚠️ ${failed} stations could not be geocoded (check addresses).` : ''}`);
      fetchStations();
    } catch (err) {
      console.error("[GeocodeMissing] Backend error:", err);
      alert("Geocoding failed. Check backend logs.");
    } finally {
      setGeocodingMissing(false);
    }
  };

  const handleCityChange = (e) => {
    const cityObj = mockCities.find(c => c.city === e.target.value);
    setFormData(prev => ({
      ...prev,
      city: cityObj.city,
      state: cityObj.state
    }));
  };

  const handleFindOnMap = async () => {
    if (!formData.address || !formData.city) {
      setGeoError("Please enter address and city first");
      return;
    }
    
    if (!window.mappls) {
      setGeoError("Map SDK not loaded. Please refresh.");
      return;
    }

    setGeocoding(true);
    setGeoError("");

    const fullAddr = `${formData.address}, ${formData.city}, India`;

    // Try getGeocode (from geocoding plugin) first
    const geoMethod = window.mappls.getGeocode || window.mappls.search;
    
    if (!geoMethod) {
      setGeoError("Geocoding library not ready. Try again in a moment.");
      setGeocoding(false);
      return;
    }

    geoMethod({ address: fullAddr, query: fullAddr }, (response) => {
      setGeocoding(false);
      
      // Standardize different response formats
      let result = null;
      if (Array.isArray(response) && response.length > 0) {
        result = response[0];
      } else if (response && response.results && response.results.length > 0) {
        result = response.results[0];
      } else if (response && response.copResults && response.copResults.length > 0) {
        result = response.copResults[0];
      }

      if (result && (result.lat || (result.geometry && result.geometry.location))) {
        const lat = result.lat || result.geometry.location.lat;
        const lng = result.lng || result.geometry.location.lng;
        setFormLat(Number(lat));
        setFormLng(Number(lng));
        initAdminMap(Number(lat), Number(lng));
      } else {
        setGeoError("Location not found. Please check address.");
      }
    });
  };

  const initAdminMap = (lat, lng) => {
    setTimeout(() => {
      if (!window.mappls) return;
      
      // Cleanup previous map if exists
      const container = document.getElementById('admin-station-map');
      if (container) container.innerHTML = '';

      const map = new window.mappls.Map('admin-station-map', {
        center: [lng, lat],
        zoom: 15,
        search: false
      });
      
      mapRef.current = map;

      const marker = new window.mappls.Marker({
        map: map,
        position: { lat, lng },
        draggable: true
      });
      
      markerRef.current = marker;

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        setFormLat(pos.lat);
        setFormLng(pos.lng);
      });
      
      setMapInitialized(true);
    }, 300);
  };

  // Legacy initMap removed

  const openEdit = (station) => {
    setEditingStation(station);
    setFormData({
      name: station.name,
      address: station.address,
      city: station.city,
      state: station.state,
      connectorTypes: station.connectorTypes,
      totalSlots: station.totalSlots,
      pricePerUnit: station.pricePerUnit,
      paymentMethods: station.paymentMethods || (station.upiSupported ? ["UPI"] : [])
    });
    setEditSlots(station.availableSlots);
    setIsEditModalOpen(true);
    setFormLat(station.lat);
    setFormLng(station.lng);
    setMapInitialized(true);
    setTimeout(() => initAdminMap(station.lat || 20.5937, station.lng || 78.9629), 300);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Stations...</div>;

  return (
    <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-6">
      {/* TOP BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-[#1A1A1A]">Charging Stations</h1>
          <span className="bg-[#FFFBEB] text-[#D97706] px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-[#FEF3C7]">
            {stations.length} Total
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Fallback button: geocode stations that were uploaded with lat=0,lng=0 */}
          {stations.some(st => !st.lat && !st.lng) && (
            geocodeConfirmPending ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-600">Geocode {stations.filter(st => !st.lat && !st.lng).length} stations?</span>
                <button
                  id="geocode-confirm-yes"
                  onClick={handleGeocodeExisting}
                  disabled={geocodingMissing}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-all"
                >
                  {geocodingMissing ? 'Running...' : 'Yes, Geocode'}
                </button>
                <button onClick={() => setGeocodeConfirmPending(false)} className="text-xs text-gray-500 hover:text-gray-800 font-bold px-2">Cancel</button>
              </div>
            ) : (
              <button
                id="geocode-missing-btn"
                onClick={() => setGeocodeConfirmPending(true)}
                disabled={geocodingMissing}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-3 sm:py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm flex justify-center items-center gap-2"
              >
                {geocodingMissing ? 'Geocoding...' : `📍 Geocode Missing (${stations.filter(st => !st.lat && !st.lng).length})`}
              </button>
            )
          )}
          <button
            onClick={() => {
              setFormData({ name: "", address: "", city: "", state: "", connectorTypes: [], totalSlots: 4, pricePerUnit: 18, paymentMethods: ["UPI"] });
              setIsAddModalOpen(true);
              setTabValue(0);
              setExcelData([]);
              setUploadSummary(null);
              setMapInitialized(false);
              setFormLat(null);
              setFormLng(null);
            }}
            className="w-full sm:w-auto bg-[#EAB308] hover:bg-[#D97706] text-[#1A1A1A] px-5 py-3 sm:py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm flex justify-center items-center gap-2"
          >
            <AddIcon fontSize="small" /> Add New Station
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[900px] whitespace-nowrap text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Station</th>
                <th className="p-4 font-bold">Location</th>
                <th className="p-4 font-bold">Connectors</th>
                <th className="p-4 font-bold">Slots (Avail/Tot)</th>
                <th className="p-4 font-bold">Price</th>
                <th className="p-4 font-bold">Payments</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Active Map</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stations.map(st => (
                <tr key={st.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-black flex items-center gap-2">
                    <LocationOnIcon fontSize="small" className="text-gray-400" />
                    {st.name}
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-bold text-[#1A1A1A]">{st.city}</div>
                    <div className="text-xs text-gray-500 max-w-[150px] truncate">{st.address}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 w-32">
                      {st.connectorTypes?.map(c => (
                        <span key={c} className="bg-gray-100 border border-gray-200 text-gray-600 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 font-bold">
                    <span className={st.availableSlots === 0 ? "text-red-600" : "text-green-600"}>{st.availableSlots}</span>
                    <span className="text-gray-400">/{st.totalSlots}</span>
                  </td>
                  <td className="p-4 text-sm font-bold">₹{st.pricePerUnit}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-[120px]">
                      {st.paymentMethods?.map(m => (
                        <span key={m} className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${getPaymentBadgeColor(m)}`}>
                          {m}
                        </span>
                      ))}
                      {!st.paymentMethods && st.upiSupported && (
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${getPaymentBadgeColor("UPI")}`}>
                          UPI
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-xs font-bold">
                     <span className={`px-2.5 py-1 rounded-full ${
                        st.status === 'open' ? 'bg-[#F0FDF4] text-[#16A34A]' :
                        st.status === 'filling' ? 'bg-[#FFFBEB] text-[#D97706]' :
                        st.status === 'maintenance' ? 'bg-gray-100 text-gray-500' :
                        'bg-[#FEF2F2] text-[#DC2626]'
                      }`}>
                        {st.status.toUpperCase()}
                      </span>
                  </td>
                  <td className="p-4">
                    <Switch size="small" checked={st.isActive} onChange={() => handleToggle(st.id, st.isActive)} color="warning" />
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openEdit(st)} className="text-gray-400 hover:text-blue-600 p-1 mx-1"><EditIcon fontSize="small" /></button>
                    <button onClick={() => handleDelete(st.id, st.name)} className="text-gray-400 hover:text-red-600 p-1 mx-1"><DeleteIcon fontSize="small" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal open={isAddModalOpen || isEditModalOpen} onClose={() => { if (!uploadingBulk) { setIsAddModalOpen(false); setIsEditModalOpen(false); } }}>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-[95vw] lg:w-[650px] max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-black mb-4">{isAddModalOpen ? 'Add New Station' : 'Edit Station'}</h2>
          
          {isAddModalOpen && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} textColor="inherit" TabIndicatorProps={{ style: { background: '#EAB308' } }}>
                <Tab label="Single Station" className="font-bold" />
                <Tab label="Excel Bulk Upload" className="font-bold" />
              </Tabs>
            </Box>
          )}

          {tabValue === 0 || isEditModalOpen ? (
            <form onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField required label="Station Name" size="small" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} fullWidth />
                <TextField required label="Address" placeholder="e.g. Baner Road" size="small" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} fullWidth />
                
                <FormControl size="small" fullWidth required>
                  <InputLabel>City</InputLabel>
                  <Select value={formData.city} label="City" onChange={handleCityChange}>
                    {mockCities.map(c => <MenuItem key={c.city} value={c.city}>{c.city}</MenuItem>)}
                  </Select>
                </FormControl>

                <TextField disabled label="State" size="small" value={formData.state} fullWidth />

                <FormControl size="small" fullWidth required>
                  <InputLabel>Connectors</InputLabel>
                  <Select multiple value={formData.connectorTypes} onChange={e => setFormData({...formData, connectorTypes: e.target.value})} label="Connectors" renderValue={(selected) => <div className="flex flex-wrap gap-1">{selected.map((value) => <Chip key={value} label={value} size="small" />)}</div>}>
                    {CONNECTOR_OPTIONS.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox checked={formData.connectorTypes.indexOf(name) > -1} />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <div className="flex gap-4">
                  <TextField required type="number" label="Total Slots" size="small" value={formData.totalSlots} onChange={e => setFormData({...formData, totalSlots: e.target.value})} fullWidth />
                  {isEditModalOpen && (
                    <TextField type="number" label="Avail (Edit)" size="small" value={editSlots} onChange={e => setEditSlots(Number(e.target.value))} fullWidth />
                  )}
                </div>

                <TextField required type="number" label="Price per kWh (₹)" size="small" value={formData.pricePerUnit} onChange={e => setFormData({...formData, pricePerUnit: e.target.value})} fullWidth />
                
                <FormControl size="small" fullWidth required>
                  <InputLabel>Payment Methods</InputLabel>
                  <Select
                    multiple
                    value={formData.paymentMethods}
                    onChange={e => setFormData({...formData, paymentMethods: e.target.value})}
                    label="Payment Methods"
                    renderValue={(selected) => (
                      <div className="flex flex-wrap gap-1">
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </div>
                    )}
                  >
                    {PAYMENT_OPTIONS.map((method) => (
                      <MenuItem key={method} value={method}>
                        <Checkbox checked={formData.paymentMethods.indexOf(method) > -1} />
                        <ListItemText primary={method} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              {/* Find on Map Button (Only for Add) */}
              {isAddModalOpen && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleFindOnMap}
                    disabled={geocoding}
                    style={{
                      background: '#16A34A',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      width: '100%',
                      marginTop: '8px'
                    }}>
                    {geocoding ? 'Finding location...' : 'Find on Map'}
                  </button>
                  {geoError && (
                    <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>
                      {geoError}
                    </p>
                  )}
                </div>
              )}

              {/* Mappls Map Container */}
              <div className="mt-4">
                {!mapInitialized && isAddModalOpen ? (
                  <div style={{
                    width: '100%',
                    height: '250px',
                    background: '#F9FAFB',
                    border: '2px dashed #E5E7EB',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#888',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    Enter address and city then click "Find on Map"
                  </div>
                ) : (
                  <div>
                    <div
                      id="admin-station-map"
                      style={{
                        width: '100%',
                        height: '250px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB'
                      }}
                    />
                    <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                      Drag marker to adjust exact location
                    </p>
                  </div>
                )}
              </div>

              {formLat && formLng && isAddModalOpen && (
                <p style={{ fontSize: '11px', color: '#16A34A', fontWeight: '600', marginTop: '4px' }}>
                  Location captured: {formLat.toFixed(4)}, {formLng.toFixed(4)} ✓
                </p>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t font-medium">
                <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="px-5 py-2 rounded-lg border hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-[#EAB308] hover:bg-[#D97706] text-[#1A1A1A] font-bold shadow-sm">
                  {isAddModalOpen ? 'Add Station' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 min-h-[400px]">
              {!uploadingBulk && !uploadSummary && (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-[#EAB308] transition-colors cursor-pointer"
                  onClick={() => document.getElementById('excel-input').click()}
                >
                  <input type="file" id="excel-input" hidden accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                  <div className="bg-yellow-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AddIcon className="text-[#EAB308]" size="large" />
                  </div>
                  <p className="font-bold text-gray-700">Click to upload .xlsx file</p>
                  <p className="text-xs text-gray-500 mt-2">Expected columns: name, address, city, state, connectorTypes, totalSlots, pricePerUnit, paymentMethods</p>
                </div>
              )}

              {excelData.length > 0 && !uploadSummary && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm text-gray-600 italic">{excelData.length} stations found in file</h3>
                    <button onClick={() => setExcelData([])} className="text-xs text-red-600 font-bold hover:underline">Clear</button>
                  </div>
                  <div className="max-h-[200px] overflow-auto border rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">City</th>
                          <th className="p-2">Slots</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-bold">{row.name}</td>
                            <td className="p-2">{row.city}</td>
                            <td className="p-2">{row.totalSlots}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {excelData.length > 5 && <div className="p-2 text-center text-[10px] text-gray-400">+{excelData.length - 5} more rows</div>}
                  </div>

                  {uploadingBulk ? (
                    <div className="space-y-2">
                       <p className="text-sm font-bold text-[#EAB308]">
                         {bulkProgress.phase === 'geocoding'
                           ? `📍 Geocoding ${bulkProgress.current} of ${bulkProgress.total}...`
                           : `⬆️ Uploading ${bulkProgress.current} of ${bulkProgress.total}...`}
                       </p>
                       <LinearProgress variant="determinate" value={(bulkProgress.current / bulkProgress.total) * 100} sx={{ height: 10, borderRadius: 5, backgroundColor: '#FEF3C7', '& .MuiLinearProgress-bar': { backgroundColor: '#EAB308' }}} />
                    </div>
                  ) : (
                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-5 py-3 rounded-xl border font-bold text-gray-600">Cancel</button>
                      <button type="button" onClick={handleBulkUpload} className="flex-[2] bg-[#EAB308] hover:bg-[#D97706] text-white py-3 rounded-xl font-black shadow-lg shadow-yellow-100">Upload All Stations</button>
                    </div>
                  )}
                </div>
              )}

              {uploadSummary && (
                <div className="text-center py-10 space-y-4">
                   <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircleIcon className="text-green-600" style={{ fontSize: 40 }} />
                   </div>
                   <h2 className="text-2xl font-black">Upload Complete!</h2>
                   <div className="bg-gray-50 p-6 rounded-2xl inline-block min-w-[300px] space-y-2">
                      <p className="font-bold text-green-600">{uploadSummary.success} stations added with coordinates ✅</p>
                      {uploadSummary.skipped > 0 && <p className="font-bold text-orange-500">{uploadSummary.skipped} stations skipped (already exist)</p>}
                      {uploadSummary.geoFailed > 0 && <p className="font-bold text-red-500">{uploadSummary.geoFailed} stations skipped (geocoding failed — check address)</p>}
                   </div>
                   <p className="text-sm text-gray-500 max-w-[400px] mx-auto">
                     Stations with valid coordinates are now visible on the map.
                     {uploadSummary.geoFailed > 0 && " Use the \"Geocode Missing\" button on the dashboard to retry failed ones after fixing addresses."}
                   </p>
                   <button type="button" onClick={() => { setIsAddModalOpen(false); setUploadSummary(null); }} className="w-full bg-[#1A1A1A] text-white py-4 rounded-xl font-bold mt-6">Back to Dashboard</button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StationsPage;
