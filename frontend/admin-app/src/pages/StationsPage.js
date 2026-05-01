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
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import { Switch, Modal, TextField, MenuItem, Checkbox, ListItemText, Select, InputLabel, FormControl, Chip, Tabs, Tab, Box, Typography, LinearProgress } from "@mui/material";
import * as XLSX from "xlsx";
import { Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

const API_GATEWAY = process.env.REACT_APP_API_URL || "http://localhost:5000";
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

// 📍 HAIVERSINE DISTANCE (for duplicate check)
const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const CONNECTOR_OPTIONS = ["CCS2", "CHAdeMO", "Type 2 AC", "AC Slow"];
const PAYMENT_OPTIONS = ["UPI", "Cash", "Card", "Net Banking"];

const TIME_OPTIONS = [];
let th = 0, tm = 0;
while(th < 24) {
  const hh = th.toString().padStart(2, '0');
  const mm = tm.toString().padStart(2, '0');
  const period = th < 12 ? 'AM' : 'PM';
  const displayHour = th === 0 ? 12 : (th > 12 ? th - 12 : th);
  TIME_OPTIONS.push({ value: `${hh}:${mm}`, label: `${displayHour.toString().padStart(2, '0')}:${mm} ${period}` });
  tm += 30; if(tm >= 60) { th++; tm = 0; }
}

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
  const { currentUser, adminRole } = useAuth();
  const [stations, setStations] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantFilter, setTenantFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(10);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    Monday: { isOpen: true, openTime: "09:00", closeTime: "22:00", slotDuration: 30 },
    Tuesday: { isOpen: true, openTime: "09:00", closeTime: "22:00", slotDuration: 30 },
    Wednesday: { isOpen: true, openTime: "09:00", closeTime: "22:00", slotDuration: 30 },
    Thursday: { isOpen: true, openTime: "09:00", closeTime: "22:00", slotDuration: 30 },
    Friday: { isOpen: true, openTime: "09:00", closeTime: "22:00", slotDuration: 30 },
    Saturday: { isOpen: true, openTime: "09:00", closeTime: "22:00", slotDuration: 30 },
    Sunday: { isOpen: true, openTime: "09:00", closeTime: "22:00", slotDuration: 30 },
  });
  const [editingStation, setEditingStation] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "", address: "", city: "", state: "", connectorTypes: [],
    totalSlots: 4, pricePerUnit: 18, paymentMethods: ["UPI"],
    autoApproveReviews: false, lat: "", lng: ""
  });
  const [editSlots, setEditSlots] = useState(0);

  // Bulk Upload states
  const [tabValue, setTabValue] = useState(0);
  const [excelData, setExcelData] = useState([]);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [uploadSummary, setUploadSummary] = useState(null);
  const [parsingErrors, setParsingErrors] = useState([]);
  const [showErrorsDialog, setShowErrorsDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [geocodingMissing, setGeocodingMissing] = useState(false);
  const [geocodeConfirmPending, setGeocodeConfirmPending] = useState(false);

  // Snackbar/Notification state
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const showNotify = (message, severity = "info") => setSnackbar({ open: true, message, severity });

  // Custom Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null });
  const openConfirm = (title, message, onConfirm) => setConfirmDialog({ open: true, title, message, onConfirm });

  useEffect(() => {
    fetchStations();
    if (adminRole === "superadmin") {
      fetchTenants();
    }
  }, []);

  const fetchTenants = async () => {
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.get(`${API_GATEWAY}/api/admin/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setTenants(res.data.tenants);
    } catch (e) {
      console.error("Failed to fetch tenants", e);
    }
  };

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
      showNotify("Failed to toggle station visibility", "error");
    }
  };

  const handleDelete = async (id, name) => {
    openConfirm(
      "Delete Station",
      `Are you sure you want to delete ${name}? This cannot be undone.`,
      async () => {
        try {
          const token = await currentUser.getIdToken();
          await axios.delete(`${API_GATEWAY}/api/admin/stations/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          showNotify(`${name} deleted successfully`, "success");
          fetchStations();
        } catch (e) {
          console.error(e);
          showNotify("Failed to delete station", "error");
        }
      }
    );
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      showNotify("Please enter valid decimal coordinates for Latitude and Longitude", "warning");
      return;
    }

    // 🛑 DUPLICATE CHECK
    const lowerName = formData.name.trim().toLowerCase();
    const duplicate = stations.find(st => {
      if (st.name.trim().toLowerCase() === lowerName) {
        const dist = getDistanceKm(lat, lng, st.lat, st.lng);
        return dist <= 0.2;
      }
      return false;
    });

    if (duplicate) {
      showNotify(`Duplicate Detected! This station is already available within 0.2km.`, "error");
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const stationData = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        lat: lat,
        lng: lng,
        connectorTypes: formData.connectorTypes,
        totalSlots: parseInt(formData.totalSlots),
        availableSlots: parseInt(formData.totalSlots),
        pricePerUnit: parseFloat(formData.pricePerUnit),
        paymentMethods: formData.paymentMethods,
        autoApproveReviews: formData.autoApproveReviews,
        status: 'open',
        isActive: true,
        rating: 0
      };
      await axios.post(`${API_GATEWAY}/api/admin/stations/add`, stationData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsAddModalOpen(false);
      setFormData({ name: "", address: "", city: "", state: "", connectorTypes: [], totalSlots: 4, pricePerUnit: 18, paymentMethods: ["UPI"], autoApproveReviews: false, lat: "", lng: "" });
      fetchStations();
      showNotify("Station added successfully!", "success");
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || "Failed to add station";
      showNotify(msg, "error");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);

    if (isNaN(lat) || isNaN(lng)) {
      showNotify("Please enter valid decimal coordinates", "warning");
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      
      // Update basic details
      await axios.put(`${API_GATEWAY}/api/admin/stations/${editingStation.id}`, {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        connectorTypes: formData.connectorTypes,
        totalSlots: parseInt(formData.totalSlots),
        pricePerUnit: parseFloat(formData.pricePerUnit),
        paymentMethods: formData.paymentMethods,
        autoApproveReviews: formData.autoApproveReviews,
        lat: lat,
        lng: lng
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Update slots if changed
      if (editSlots !== editingStation.availableSlots) {
        await axios.patch(`${API_GATEWAY}/api/admin/stations/${editingStation.id}/slots`, {
          availableSlots: editSlots
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      setIsEditModalOpen(false);
      fetchStations();
      showNotify("Station updated successfully", "success");
    } catch (e) {
      console.error(e);
      showNotify("Failed to edit station", "error");
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
      
      // Get raw data as array of arrays to be more flexible with headers
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length === 0) {
        showNotify("The file appears to be empty.", "error");
        return;
      }

      // Detect if first row is headers or data
      const firstRow = rows[0];
      const hasHeaders = firstRow.some(cell => 
        typeof cell === 'string' && 
        ['name', 'station', 'address', 'city', 'state'].includes(cell.toLowerCase())
      );

      const headerMap = {
        name: 0, address: 1, city: 2, state: 3, connectorTypes: 4, 
        totalSlots: 5, pricePerUnit: 6, paymentMethods: 7, latitude: 8, longitude: 9
      };

      if (hasHeaders) {
        // Map headers to indices
        firstRow.forEach((cell, idx) => {
          if (!cell) return;
          const label = cell.toString().toLowerCase().trim();
          if (label.includes('name') || label === 'station') headerMap.name = idx;
          else if (label.includes('address')) headerMap.address = idx;
          else if (label.includes('city')) headerMap.city = idx;
          else if (label.includes('state')) headerMap.state = idx;
          else if (label.includes('connector')) headerMap.connectorTypes = idx;
          else if (label.includes('slot')) headerMap.totalSlots = idx;
          else if (label.includes('price')) headerMap.pricePerUnit = idx;
          else if (label.includes('payment')) headerMap.paymentMethods = idx;
          else if (label.includes('lat')) headerMap.latitude = idx;
          else if (label.includes('lng') || label.includes('long')) headerMap.longitude = idx;
        });
      }

      const dataRows = hasHeaders ? rows.slice(1) : rows;
      const validRows = [];
      const skippedRows = [];
      const errors = [];

      dataRows.forEach((row, index) => {
        const rowNum = hasHeaders ? index + 2 : index + 1;
        
        // Defensive check: if row is missing, create a placeholder so we can show it in the table as "Empty Row"
        const isActuallyEmpty = !row || (Array.isArray(row) && row.length === 0);
        
        const nameFallback = row && row[headerMap.name] ? row[headerMap.name].toString().trim() : '';
        const stationName = nameFallback || (isActuallyEmpty ? `[Empty Row ${rowNum}]` : `[Unnamed Row ${rowNum}]`);
        
        // Skip commented out rows
        if (stationName.startsWith("//")) {
          console.log(`Skipping commented row ${rowNum}: ${stationName}`);
          return;
        }

        console.log(`Processing row ${rowNum}:`, row);

        // VALIDATION
        const validationErrors = [];
        if (isActuallyEmpty) {
          validationErrors.push("The entire row appears to be empty.");
        } else {
          if (!nameFallback) validationErrors.push("Station Name is missing.");
          if (!row[headerMap.address]) validationErrors.push("Address is missing.");
          if (!row[headerMap.city]) validationErrors.push("City is missing.");
          if (!row[headerMap.state]) validationErrors.push("State is missing.");
          
          const lat = row ? parseFloat(row[headerMap.latitude]) : NaN;
          const lng = row ? parseFloat(row[headerMap.longitude]) : NaN;
          const isValidLat = !isNaN(lat) && lat >= -90 && lat <= 90;
          const isValidLng = !isNaN(lng) && lng >= -180 && lng <= 180;
          
          if (isNaN(lat)) validationErrors.push("Latitude is missing or not a number.");
          else if (!isValidLat) validationErrors.push("Latitude is out of valid range (-90 to 90).");
          
          if (isNaN(lng)) validationErrors.push("Longitude is missing or not a number.");
          else if (!isValidLng) validationErrors.push("Longitude is out of valid range (-180 to 180).");

          // 🛑 DUPLICATE CHECK
          let isBatchDuplicate = false;
          let duplicateOf = "";
          if (nameFallback) {
            const lowerName = nameFallback.toLowerCase();
            stations.forEach(st => {
              if (st.name.trim().toLowerCase() === lowerName) {
                const dist = getDistanceKm(lat || 0, lng || 0, st.lat, st.lng);
                if (dist <= 0.2) {
                  isBatchDuplicate = true;
                  duplicateOf = st.name;
                }
              }
            });
          }

          const connectors = row[headerMap.connectorTypes];
          const payments = row[headerMap.paymentMethods];

          const stationObj = {
            id: Math.random().toString(36).substr(2, 9),
            name: stationName,
            address: row[headerMap.address] ? row[headerMap.address].toString().trim() : "",
            city: row[headerMap.city] ? row[headerMap.city].toString().trim() : "",
            state: row[headerMap.state] ? row[headerMap.state].toString().trim() : "",
            lat: lat || 0,
            lng: lng || 0,
            totalSlots: row[headerMap.totalSlots] ? parseInt(row[headerMap.totalSlots]) : 1,
            pricePerUnit: row[headerMap.pricePerUnit] ? parseFloat(row[headerMap.pricePerUnit]) : 0,
            connectorTypes: connectors ? connectors.toString().split(",").map(c => c.trim()) : ["CCS2"],
            paymentMethods: payments ? payments.toString().split(",").map(p => p.trim()) : ["UPI"],
            status: 'open',
            isActive: true,
            isDuplicate: isBatchDuplicate,
            duplicateOf,
            isValid: validationErrors.length === 0,
            validationErrors
          };

          validRows.push(stationObj);
          if (validationErrors.length > 0) {
            skippedRows.push(`Row ${rowNum}: ${validationErrors.join(", ")}`);
            errors.push({ row: rowNum, name: stationName, missingFields: validationErrors });
          }
        }
      });

      const dupeCount = validRows.filter(r => r.isDuplicate).length;
      const validCount = validRows.filter(r => r.isValid && !r.isDuplicate).length;
      const invalidCount = validRows.filter(r => !r.isValid).length;

      setExcelData(validRows);
      setParsingErrors(errors);
      setUploadSummary({
        total: dataRows.length,
        valid: validCount,
        skipped: invalidCount,
        duplicates: dupeCount,
        firstError: skippedRows[0] || null
      });
      
      if (!hasHeaders && validRows.length > 0) {
        showNotify("No headers detected; mapping columns by standard order.", "info");
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const headers = ["name", "address", "city", "state", "connectorTypes", "totalSlots", "pricePerUnit", "paymentMethods", "latitude", "longitude"];
    const sampleRow = ["Tata Power EV Hub", "Baner Road, Baner", "Pune", "Maharashtra", "CCS2,Type2", 6, 18, "UPI,Cash", 18.5590, 73.7868];
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "EV_Saarthi_Station_Template.xlsx");
  };

  const handleBulkUpload = async () => {
    if (excelData.length === 0) return;
    setUploadingBulk(true);
    
    try {
      const token = await currentUser.getIdToken();
      const stationsToSave = excelData.filter(r => !r.isDuplicate);
      
      if (stationsToSave.length === 0) {
        showNotify("No new stations to add (all are duplicates or invalid).", "warning");
        setUploadingBulk(false);
        return;
      }

      const res = await axios.post(`${API_GATEWAY}/api/admin/stations/bulk-add`, {
        stations: stationsToSave
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.success) {
        showNotify(`${res.data.addedCount} stations added successfully!`, "success");
        setExcelData([]);
        setUploadSummary(null);
        setIsAddModalOpen(false);
        fetchStations();
      }
    } catch (err) {
      console.error("[BulkUpload] error:", err);
      showNotify(err.response?.data?.error || "Bulk upload failed", "error");
    } finally {
      setUploadingBulk(false);
    }
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
      paymentMethods: station.paymentMethods || (station.upiSupported ? ["UPI"] : []),
      autoApproveReviews: station.autoApproveReviews || false,
      lat: station.lat?.toString() || "",
      lng: station.lng?.toString() || ""
    });
    setEditSlots(station.availableSlots);
    setIsEditModalOpen(true);
  };

  const openSchedule = (station) => {
    setEditingStation(station);
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    try {
      const token = await currentUser.getIdToken();
      await axios.put(`${API_GATEWAY}/api/stations/${editingStation.id}/schedule`, {
        schedule: scheduleData
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      showNotify("Schedule updated and generating slots", "success");
      setIsScheduleModalOpen(false);
    } catch (e) {
      console.error(e);
      showNotify("Failed to update schedule", "error");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Stations...</div>;
  
  const filteredStations = stations.filter(st => {
    if (adminRole === "superadmin" && tenantFilter !== "all") {
      return st.tenantId === tenantFilter;
    }
    return true;
  });

  return (
    <div className="p-2 sm:p-4 lg:p-6 max-w-7xl mx-auto space-y-6 transition-all">
      {/* TOP BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <h1 className="text-2xl font-black text-[#1A1A1A]">Charging Stations</h1>
          <span className="bg-[#FFFBEB] text-[#D97706] px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-[#FEF3C7]">
            {filteredStations.length} Total
          </span>
          {adminRole === "superadmin" && (
             <FormControl size="small" sx={{ minWidth: 200, ml: 1 }}>
                <InputLabel id="tenant-filter-label">Filter by Tenant</InputLabel>
                <Select
                  labelId="tenant-filter-label"
                  value={tenantFilter}
                  label="Filter by Tenant"
                  onChange={(e) => setTenantFilter(e.target.value)}
                  sx={{ 
                    borderRadius: '10px', 
                    bgcolor: 'white',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: '#EAB308' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#D97706' }
                  }}
                >
                  <MenuItem value="all"><em>All Tenants</em></MenuItem>
                  {tenants.map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
             </FormControl>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Superadmin is read-only for stations per spec */}
          {adminRole === "admin" && (
            <>
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
              setFormData({ name: "", address: "", city: "", state: "", connectorTypes: [], totalSlots: 4, pricePerUnit: 18, paymentMethods: ["UPI"], autoApproveReviews: false, lat: "", lng: "" });
              setIsAddModalOpen(true);
              setTabValue(0);
              setExcelData([]);
              setUploadSummary(null);
            }}
            className="w-full sm:w-auto bg-[#EAB308] hover:bg-[#D97706] text-[#1A1A1A] px-5 py-3 sm:py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm flex justify-center items-center gap-2"
          >
            <AddIcon fontSize="small" /> Add New Station
          </button>
          {tabValue === 1 && isAddModalOpen && (
            <button
              onClick={downloadTemplate}
              className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3 sm:py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm flex justify-center items-center gap-2"
            >
              Download Template
            </button>
          )}
            </>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-gray-100 text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider">
                <th className="p-3 sm:p-4 font-bold text-left">ID</th>
                <th className="p-3 sm:p-4 font-bold text-left">Station</th>
                <th className="p-3 sm:p-4 font-bold text-left">Location</th>
                {adminRole === "superadmin" && <th className="p-3 sm:p-4 font-bold text-left">Tenant</th>}
                <th className="p-3 sm:p-4 font-bold">Connectors</th>
                <th className="p-3 sm:p-4 font-bold text-center">Slots</th>
                <th className="p-3 sm:p-4 font-bold text-center">Price</th>
                <th className="p-3 sm:p-4 font-bold text-center">Payments</th>
                <th className="p-3 sm:p-4 font-bold text-center">Status</th>
                <th className="p-3 sm:p-4 font-bold text-center">Active Map</th>
                {adminRole !== "superadmin" && <th className="p-3 sm:p-4 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStations.slice(0, visibleCount).map(st => (
                <tr key={st.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[9px] font-mono text-gray-500">{st.id.substring(0, 5)}...</code>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(st.id); showNotify("ID Copied!", "success"); }}
                        className="p-1 hover:bg-yellow-50 rounded transition-colors"
                        title="Copy Full ID"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                    <td className="p-3 sm:p-4 font-black flex items-center gap-2 text-sm sm:text-base">
                      <LocationOnIcon fontSize="small" className="text-gray-400 shrink-0" />
                      <span className="truncate max-w-[120px] sm:max-w-[200px]" title={st.name}>{st.name}</span>
                    </td>
                  <td className="p-3 sm:p-4 whitespace-normal">
                    <div className="text-xs sm:text-sm font-bold text-[#1A1A1A]">{st.city}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 leading-tight max-w-[140px]">{st.address}</div>
                  </td>
                  {adminRole === "superadmin" && (
                    <td className="p-3 sm:p-4">
                      <span className="text-xs font-bold text-gray-600">
                        {tenants.find(t => t.id === st.tenantId)?.name || "—"}
                      </span>
                    </td>
                  )}
                  <td className="p-3 sm:p-4">
                    <div className="flex flex-wrap gap-1 max-w-[100px] sm:max-w-[140px]">
                      {st.connectorTypes?.map(c => (
                        <span key={c} className="bg-gray-100 border border-gray-200 text-gray-600 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 font-bold text-center text-xs sm:text-sm">
                    <span className={st.availableSlots === 0 ? "text-red-600" : "text-green-600"}>{st.availableSlots}</span>
                    <span className="text-gray-400">/{st.totalSlots}</span>
                  </td>
                  <td className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-center whitespace-nowrap">₹{st.pricePerUnit}</td>
                  <td className="p-3 sm:p-4 text-center">
                    <div className="flex flex-wrap gap-1 justify-center max-w-[80px] sm:max-w-[100px]">
                      {st.paymentMethods?.map((m, idx) => idx < 2 && (
                        <span key={m} className={`text-[8px] sm:text-[9px] font-black uppercase px-1 py-0.5 rounded border leading-none ${getPaymentBadgeColor(m)}`}>
                          {m}
                        </span>
                      ))}
                      {st.paymentMethods?.length > 2 && <span className="text-[8px] text-gray-400">+{st.paymentMethods.length - 2}</span>}
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 text-[10px] sm:text-xs font-bold text-center">
                     <span className={`px-2 py-0.5 rounded-full whitespace-nowrap ${
                        st.status === 'open' ? 'bg-[#F0FDF4] text-[#16A34A]' :
                        st.status === 'filling' ? 'bg-[#FFFBEB] text-[#D97706]' :
                        st.status === 'maintenance' ? 'bg-gray-100 text-gray-500' :
                        'bg-[#FEF2F2] text-[#DC2626]'
                      }`}>
                        {st.status.toUpperCase()}
                      </span>
                  </td>
                  <td className="p-3 sm:p-4 text-center">
                    <Switch size="small" checked={st.isActive} onChange={() => handleToggle(st.id, st.isActive)} color="warning" disabled={adminRole === "superadmin"} />
                  </td>
                  {adminRole !== "superadmin" && (
                    <td className="p-3 sm:p-4 text-right sticky right-0 bg-white/95 backdrop-blur-sm z-10">
                      <div className="flex justify-end items-center gap-0 sm:gap-1">
                        {adminRole === "operator" && (
                          <button onClick={() => openSchedule(st)} className="text-gray-400 hover:text-green-600 p-1" title="Schedule"><AccessTimeIcon sx={{ fontSize: { xs: 16, sm: 20 } }} /></button>
                        )}
                        {adminRole === "admin" && (
                          <>
                            <button onClick={() => openEdit(st)} className="text-gray-400 hover:text-blue-600 p-1" title="Edit"><EditIcon sx={{ fontSize: { xs: 16, sm: 20 } }} /></button>
                            <button onClick={() => handleDelete(st.id, st.name)} className="text-gray-400 hover:text-red-600 p-1" title="Delete"><DeleteIcon sx={{ fontSize: { xs: 16, sm: 20 } }} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStations.length > visibleCount && (
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

      {/* ADD / EDIT MODAL */}
      <Modal open={isAddModalOpen || isEditModalOpen} onClose={() => { if (!uploadingBulk) { setIsAddModalOpen(false); setIsEditModalOpen(false); } }}>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-[95vw] ${tabValue === 1 && isAddModalOpen ? 'lg:w-[950px] lg:max-w-5xl' : 'lg:w-[650px] lg:max-w-2xl'} max-h-[90vh] overflow-y-auto transition-all duration-300`}>
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
                        {selected.map((value) => <Chip key={value} label={value} size="small" />)}
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

                {/* Manual Lat/Lng Fields */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <TextField 
                    required 
                    label="Latitude" 
                    size="small" 
                    type="number" 
                    inputProps={{ step: "any" }} 
                    placeholder="e.g. 18.5204"
                    value={formData.lat} 
                    onChange={e => setFormData({...formData, lat: e.target.value})} 
                    fullWidth 
                  />
                  <TextField 
                    required 
                    label="Longitude" 
                    size="small" 
                    type="number" 
                    inputProps={{ step: "any" }} 
                    placeholder="e.g. 73.8567"
                    value={formData.lng} 
                    onChange={e => setFormData({...formData, lng: e.target.value})} 
                    fullWidth 
                  />
                </div>
              </div>

              {/* Auto Approve Reviews Toggle */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <Switch
                  checked={formData.autoApproveReviews}
                  onChange={(e) => setFormData({ ...formData, autoApproveReviews: e.target.checked })}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#16A34A' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#16A34A' },
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-700">Auto-Approve Community Reviews</span>
                  <span className="text-[10px] text-gray-400">Reviews from this station will be automatically approved</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t font-medium">
                <button 
                  type="button" 
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} 
                  className="px-5 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-[#EAB308] hover:bg-[#D97706] disabled:opacity-60 text-[#1A1A1A] font-bold shadow-sm transition-all"
                >
                  {loading ? (isAddModalOpen ? 'Adding...' : 'Saving...') : (isAddModalOpen ? 'Add Station' : 'Save Changes')}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <input type="file" id="excel-input" hidden accept=".xlsx, .xls, .csv" onChange={handleFileChange} />

              {!excelData.length && !uploadSummary && (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-[#EAB308] transition-colors cursor-pointer"
                  onClick={() => document.getElementById('excel-input').click()}
                >
                  <div className="bg-yellow-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AddIcon className="text-[#EAB308]" size="large" />
                  </div>
                  <p className="font-bold text-gray-700">Click to upload .xlsx file</p>
                  <p className="text-xs text-gray-500 mt-2">Required: name, address, city, state, lat, lng</p>
                  <button onClick={(e) => { e.stopPropagation(); downloadTemplate(); }} className="mt-4 text-[#EAB308] font-bold text-sm hover:underline">Download Excel Template</button>
                </div>
              )}

              {uploadSummary && (
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 sm:p-6 mb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <h3 className="text-lg font-black text-gray-800">Parsing Summary</h3>
                    <div className="flex items-center gap-4 text-sm font-bold">
                       <span className="text-blue-600">Total: {uploadSummary.total}</span>
                       <span className="text-green-600">Valid: {uploadSummary.valid}</span>
                       {uploadSummary.duplicates > 0 && (
                          <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                            Duplicates: {uploadSummary.duplicates}
                          </span>
                       )}
                       <span className="text-red-500">
                          Skipped: {uploadSummary.skipped}
                          {uploadSummary.skipped > 0 && <button onClick={() => setShowErrorsDialog(true)} className="ml-2 text-xs underline hover:text-red-700 pointer">View All Details</button>}
                       </span>
                    </div>
                  </div>
                  
                  {uploadSummary.firstError && (
                    <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 text-xs text-orange-700 leading-relaxed max-h-24 overflow-y-auto">
                      {uploadSummary.firstError}
                      {uploadSummary.skipped > 1 && <span className="font-bold underline ml-2 cursor-pointer" onClick={() => setShowErrorsDialog(true)}>... and {uploadSummary.skipped - 1} more issues found.</span>}
                    </div>
                  )}
                </div>
              )}

              {excelData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-sm text-gray-700 italic">Verification Table ({excelData.length} stations)</h3>
                    <button onClick={() => { setExcelData([]); setUploadSummary(null); }} className="text-xs text-red-600 font-bold hover:underline">Discard All</button>
                  </div>
                  
                  <div className="max-h-[500px] overflow-auto border border-gray-100 rounded-xl shadow-inner bg-white">
                    <table className="w-full text-xs text-left border-collapse table-auto">
                      <thead className="bg-[#1A1A1A] text-white sticky top-0 z-10">
                        <tr>
                          <th className="p-3 font-bold border-r border-gray-700 whitespace-nowrap">Name</th>
                          <th className="p-3 font-bold border-r border-gray-700 whitespace-nowrap">Address / City</th>
                          <th className="p-3 font-bold border-r border-gray-700 whitespace-nowrap">Connectors</th>
                          <th className="p-3 font-bold border-r border-gray-700 text-center whitespace-nowrap">Slots</th>
                          <th className="p-3 font-bold border-r border-gray-700 text-center whitespace-nowrap">Price</th>
                          <th className="p-3 font-bold border-r border-gray-700 text-center whitespace-nowrap">Lat</th>
                          <th className="p-3 font-bold border-r border-gray-700 text-center whitespace-nowrap">Lng</th>
                          <th className="p-3 font-bold text-center whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {excelData.map((row) => (
                          <tr key={row.id} className={`transition-colors ${row.isDuplicate ? 'bg-orange-50/30' : 'hover:bg-gray-50/50'}`}>
                            <td className="p-2 min-w-[150px]">
                              <div className="flex flex-col">
                                <input className="w-full bg-transparent border-none focus:ring-2 focus:ring-[#EAB308] focus:bg-yellow-50 rounded p-1 font-bold" value={row.name} onChange={e => setExcelData(excelData.map(r => r.id === row.id ? {...r, name: e.target.value} : r))} />
                                {row.isDuplicate && <span className="text-[10px] text-orange-600 font-bold px-1 flex items-center gap-1">⚠️ Already exists ({row.duplicateOf})</span>}
                              </div>
                            </td>
                            <td className="p-2 min-w-[200px]">
                               <input className="w-full bg-transparent border-none focus:ring-2 focus:ring-[#EAB308] focus:bg-yellow-50 rounded p-1" value={row.address} onChange={e => setExcelData(excelData.map(r => r.id === row.id ? {...r, address: e.target.value} : r))} />
                               <div className="text-[10px] text-gray-400 font-bold px-1">{row.city}, {row.state}</div>
                            </td>
                            <td className="p-2"><input className="w-full bg-transparent border-none focus:ring-2 focus:ring-[#EAB308] focus:bg-yellow-50 rounded p-1" value={row.connectorTypes.join(", ")} onChange={e => setExcelData(excelData.map(r => r.id === row.id ? {...r, connectorTypes: e.target.value.split(",").map(t => t.trim())} : r))} /></td>
                            <td className="p-2 text-center"><input type="number" className="w-12 bg-transparent border-none focus:ring-2 focus:ring-[#EAB308] focus:bg-yellow-50 rounded p-1 text-center" value={row.totalSlots} onChange={e => setExcelData(excelData.map(r => r.id === row.id ? {...r, totalSlots: Number(e.target.value)} : r))} /></td>
                            <td className="p-2 text-center"><input type="number" className="w-12 bg-transparent border-none focus:ring-2 focus:ring-[#EAB308] focus:bg-yellow-50 rounded p-1 text-center" value={row.pricePerUnit} onChange={e => setExcelData(excelData.map(r => r.id === row.id ? {...r, pricePerUnit: Number(e.target.value)} : r))} /></td>
                            <td className="p-2 text-center"><input type="number" className="w-full bg-transparent border-none focus:ring-2 focus:ring-[#EAB308] focus:bg-yellow-50 rounded p-1 font-mono text-center" value={row.lat} onChange={e => setExcelData(excelData.map(r => r.id === row.id ? {...r, lat: Number(e.target.value)} : r))} /></td>
                            <td className="p-2 text-center"><input type="number" className="w-full bg-transparent border-none focus:ring-2 focus:ring-[#EAB308] focus:bg-yellow-50 rounded p-1 font-mono text-center" value={row.lng} onChange={e => setExcelData(excelData.map(r => r.id === row.id ? {...r, lng: Number(e.target.value)} : r))} /></td>
                            <td className="p-2 text-center">
                              <button onClick={() => setExcelData(excelData.filter(r => r.id !== row.id))} className="text-red-400 hover:text-red-600 p-1"><DeleteIcon fontSize="inherit" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
                    <button type="button" onClick={() => { setExcelData([]); setUploadSummary(null); }} className="flex-1 px-5 py-3 rounded-xl border font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel All</button>
                    <button 
                      type="button" 
                      disabled={uploadingBulk}
                      onClick={handleBulkUpload} 
                      className="flex-[2] bg-[#EAB308] hover:bg-[#D97706] disabled:opacity-50 text-white py-3 rounded-xl font-black shadow-lg shadow-yellow-100 flex justify-center items-center gap-2"
                    >
                      {uploadingBulk ? <LinearProgress sx={{ width: 40, color: 'white' }} /> : 'Confirm & Save All Stations'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* PARSING ERRORS DETAILS DIALOG */}
      <Dialog open={showErrorsDialog} onClose={() => setShowErrorsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="font-black bg-red-50 text-red-700 py-3 flex justify-between items-center">
           Excel Parsing Errors
           <span className="text-xs font-bold bg-red-100 px-2 py-0.5 rounded-full">{parsingErrors.length} Rows skipped</span>
        </DialogTitle>
        <DialogContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
               <thead className="bg-gray-100 sticky top-0">
                 <tr>
                    <th className="p-3 font-bold border-b">Row</th>
                    <th className="p-3 font-bold border-b">Station Name</th>
                    <th className="p-3 font-bold border-b text-red-600">Missing/Invalid Fields</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {parsingErrors.map((err, i) => (
                   <tr key={i} className="hover:bg-red-50/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-gray-500">#{err.row}</td>
                      <td className="p-3 font-bold">{err.name}</td>
                      <td className="p-3 font-medium text-red-600 italic">{err.missingFields.join(", ")}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </DialogContent>
        <DialogActions className="border-t">
          <Button onClick={() => setShowErrorsDialog(false)} className="font-bold text-gray-600">Close</Button>
          <Button onClick={() => { setShowErrorsDialog(false); document.getElementById('excel-input').click(); }} className="bg-[#EAB308] text-white font-black px-4 hover:bg-[#CA8A04]">Re-upload Corrected File</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar and Confirm Dialog */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%', fontWeight: 'bold' }}>{snackbar.message}</Alert>
      </Snackbar>

      {/* SCHEDULE MODAL */}
      <Modal open={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)}>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-[95vw] lg:w-[650px] max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-black mb-4">Set Station Schedule</h2>
          <p className="text-sm text-gray-500 mb-4">Set timings for {editingStation?.name}</p>
          
          <div className="space-y-4">
            {Object.keys(scheduleData).map((day) => (
              <div key={day} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 gap-4">
                <div className="w-full sm:w-1/4 font-bold text-[#1A1A1A] text-sm sm:text-base">{day}</div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Switch 
                    checked={scheduleData[day].isOpen} 
                    onChange={e => setScheduleData({ ...scheduleData, [day]: { ...scheduleData[day], isOpen: e.target.checked } })}
                    color="primary"
                    size="small"
                  />
                  <span className={`text-xs font-bold w-12 ${scheduleData[day].isOpen ? 'text-[#16A34A]' : 'text-gray-400'}`}>
                    {scheduleData[day].isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>

                {scheduleData[day].isOpen ? (
                  <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                    <div className="flex items-center gap-2">
                      <Select
                        size="small"
                        value={scheduleData[day].openTime}
                        onChange={e => setScheduleData({ ...scheduleData, [day]: { ...scheduleData[day], openTime: e.target.value } })}
                        sx={{ 
                          bgcolor: 'white', 
                          minWidth: 120, 
                          fontSize: '14px', 
                          fontWeight: '800', 
                          borderRadius: '8px',
                          '& .MuiSelect-select': { py: 1, px: 2 }
                        }}
                      >
                        {TIME_OPTIONS.map(opt => <MenuItem key={"o"+opt.value} value={opt.value} sx={{ fontWeight: '600' }}>{opt.label}</MenuItem>)}
                      </Select>
                      <span className="text-gray-400 font-black text-xs uppercase tracking-widest px-1">to</span>
                      <Select
                        size="small"
                        value={scheduleData[day].closeTime}
                        onChange={e => setScheduleData({ ...scheduleData, [day]: { ...scheduleData[day], closeTime: e.target.value } })}
                        sx={{ 
                          bgcolor: 'white', 
                          minWidth: 120, 
                          fontSize: '14px', 
                          fontWeight: '800', 
                          borderRadius: '8px',
                          '& .MuiSelect-select': { py: 1, px: 2 }
                        }}
                      >
                        {TIME_OPTIONS.map(opt => <MenuItem key={"c"+opt.value} value={opt.value} sx={{ fontWeight: '600' }}>{opt.label}</MenuItem>)}
                      </Select>
                    </div>
                    <TextField 
                      label="Slot(min)" 
                      type="number"
                      size="small"
                      value={scheduleData[day].slotDuration}
                      onChange={e => setScheduleData({ ...scheduleData, [day]: { ...scheduleData[day], slotDuration: Number(e.target.value) } })}
                      sx={{ width: 85, bgcolor: 'white', '& .MuiInputBase-input': { p: 1, fontSize: '13px', fontWeight: 'bold' } }}
                    />
                  </div>
                ) : (
                  <div className="flex-1 text-center sm:text-right text-gray-400 text-sm font-medium italic">
                    Station closed all day
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6 font-medium">
            <button onClick={() => setIsScheduleModalOpen(false)} className="px-5 py-2 rounded-lg border hover:bg-gray-50">Cancel</button>
            <button onClick={handleSaveSchedule} className="px-5 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-bold shadow-sm">
              Save Schedule
            </button>
          </div>
        </div>
      </Modal>

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle sx={{ fontWeight: 'black' }}>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'gray.600' }}>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} sx={{ fontWeight: 'bold', color: 'gray.500' }}>Cancel</Button>
          <Button 
             onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ ...confirmDialog, open: false }); }} 
             variant="contained" color="error" sx={{ fontWeight: 'bold', borderRadius: '8px', px: 3 }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default StationsPage;
