import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationOnIcon
} from "@mui/icons-material";
import { Switch, Modal, TextField, MenuItem, Checkbox, ListItemText, Select, InputLabel, FormControl, Chip } from "@mui/material";

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

const CONNECTOR_OPTIONS = ["CCS2", "CHAdeMO", "Type 2 AC", "AC Slow"];

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
    totalSlots: 4, pricePerUnit: 18, upiSupported: true
  });
  const [editSlots, setEditSlots] = useState(0);

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
        upiSupported: formData.upiSupported,
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
        upiSupported: formData.upiSupported,
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
      upiSupported: station.upiSupported
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
        <button
          onClick={() => {
            setFormData({ name: "", address: "", city: "", state: "", connectorTypes: [], totalSlots: 4, pricePerUnit: 18, upiSupported: true });
            setIsAddModalOpen(true);
            setMapInitialized(false);
            setFormLat(null);
            setFormLng(null);
          }}
          className="w-full sm:w-auto bg-[#EAB308] hover:bg-[#D97706] text-[#1A1A1A] px-5 py-3 sm:py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm flex justify-center items-center gap-2"
        >
          <AddIcon fontSize="small" /> Add New Station
        </button>
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
      <Modal open={isAddModalOpen || isEditModalOpen} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-[95vw] lg:w-[600px] max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-black mb-6">{isAddModalOpen ? 'Add New Station' : 'Edit Station'}</h2>
          
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
              
              <div className="flex items-center gap-2 pl-2">
                <span className="text-sm font-bold text-gray-700">UPI Supported</span>
                <Switch checked={formData.upiSupported} onChange={e => setFormData({...formData, upiSupported: e.target.checked})} color="success" />
              </div>
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
                  height: '300px',
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
                      height: '300px',
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
        </div>
      </Modal>
    </div>
  );
};

export default StationsPage;
