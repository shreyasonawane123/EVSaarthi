import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";

import {
  EvStation as EvStationIcon,
  MyLocation as MyLocationIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
} from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import { Alert, Snackbar } from "@mui/material";

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const connectors = ["All", "CCS2", "CHADEMO", "TYPE2"];
const radii = [5, 10, 20, 50];

const normalize = (str) => str.toLowerCase().replace(/\s/g, "");

const getMarkerColor = (station) => {
  if (station.status === "maintenance") return "#888888";
  const ratio = station.availableSlots / station.totalSlots;
  if (ratio === 0) return "#DC2626";
  if (ratio <= 0.3) return "#EAB308";
  return "#16A34A";
};

const createMarkerSVG = (color, isSelected = false) => {
  if (isSelected) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg"
           width="40" height="40"
           viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18"
          fill="${color}"
          opacity="0.3"
          stroke="none"/>
        <circle cx="20" cy="20" r="12"
          fill="${color}"
          stroke="white"
          stroke-width="3"/>
        <circle cx="20" cy="20" r="5"
          fill="white"
          opacity="0.9"/>
      </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="24" height="24"
         viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"
        fill="${color}"
        stroke="white"
        stroke-width="3"/>
      <circle cx="12" cy="12" r="4"
        fill="white"
        opacity="0.9"/>
    </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

const buildPopupHTML = (station) => `
  <div style="font-family:Segoe UI, sans-serif;min-width:250px;padding:4px;">
    <h3 style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#1A1A1A;">
      ${station.name}
    </h3>
    <p style="margin:0 0 12px;font-size:13px;color:#6B7280;">
      ${station.address}
    </p>
    <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">
      ${(station.connectorTypes || [])
        .map(t => `<span style="background:#EFF6FF;color:#2563EB;font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;">${t}</span>`).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
      <span style="font-size:13px;font-weight:600;">
        ${station.availableSlots}/${station.totalSlots} slots
      </span>
      <span style="font-size:13px;font-weight:700;color:#D97706;">
        Rs.${station.pricePerKwh || station.pricePerUnit}/kWh
      </span>
    </div>
    ${station.upiSupported
      ? `<div style="background:#F0FDF4;color:#16A34A;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:4px;margin-bottom:12px;display:inline-block;">UPI Accepted</div>`
      : ''}
    <button
      onclick="window.parent.location.href='http://localhost:3000/booking?stationId=${station.id}'"
      style="width:100%;background:#EAB308;border:none;border-radius:8px;padding:10px;font-size:14px;font-weight:bold;color:#1A1A1A;cursor:pointer;">
      Book a Slot
    </button>
  </div>`;

const MapPage = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedRadius, setSelectedRadius] = useState(10);

  const [userLocation, setUserLocation] = useState(null);
  const [isDetectedLocation, setIsDetectedLocation] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const showNotify = (message, severity = "info") => setSnackbar({ open: true, message, severity });

  const mapRef = useRef(null);
  const markersRef = useRef({});
  const infoWindowRef = useRef(null);
  const cardRefs = useRef({});

  // FETCH STATIONS
  useEffect(() => {
    const q = query(collection(db, "stations"), where("isActive", "==", true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStations(data);
        setLoading(false);
      },
      (error) => {
        console.error("DEBUG: onSnapshot error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredStations = useMemo(() => {
    const filtered = stations
      .filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number')
      .map((s) => ({
        ...s,
        distance: userLocation
          ? Number(
              getDistanceKm(userLocation.lat, userLocation.lng, s.lat, s.lng).toFixed(1)
            )
          : null,
      }))
      .filter((s) => {
        const matchSearch =
          searchText === "" ||
          s.name.toLowerCase().includes(searchText.toLowerCase()) ||
          s.address.toLowerCase().includes(searchText.toLowerCase());

        const matchConnector =
          activeFilter === "All" ||
          (s.connectorTypes || []).some((c) =>
            normalize(c).includes(normalize(activeFilter))
          );

        const matchRadius =
          isDetectedLocation && s.distance ? s.distance <= selectedRadius : true;

        return matchSearch && matchConnector && matchRadius;
      })
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));

    return filtered;
  }, [
    stations,
    searchText,
    activeFilter,
    selectedRadius,
    userLocation,
    isDetectedLocation,
  ]);

  // MAP INITIALIZATION
  useEffect(() => {
    let attempts = 0;
    const initMap = () => {
      attempts++;
      if (!window.mappls) {
        if (attempts < 50) {
          setTimeout(initMap, 200);
        }
        return;
      }
      const container = document.getElementById('map-container');
      if (!container) {
        setTimeout(initMap, 200);
        return;
      }
      if (mapRef.current) return;
      try {
        mapRef.current = new window.mappls.Map('map-container', {
          center: [73.8567, 18.5204],
          zoom: 12,
          search: false
        });
        console.log('Mappls map initialized!');

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            mapRef.current.setCenter([longitude, latitude]);
            mapRef.current.setZoom(13);
          },
          () => console.log('Location denied')
        );
      } catch (err) {
        console.error('Map init error:', err);
      }
    };
    setTimeout(initMap, 500);
  }, []);

  // MARKERS EFFECT
  useEffect(() => {
    if (!mapRef.current || !window.mappls) return;

    const currentIds = stations.map(s => s.id);
    
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.includes(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    stations.forEach(station => {
      const color = getMarkerColor(station);
      const isSelected = selectedStation?.id === station.id;

      const iconWidth = isSelected ? 40 : 24;
      const iconHeight = isSelected ? 40 : 24;
      const iconAnchor = isSelected ? [20, 20] : [12, 12];
      
      const iconConfig = {
        url: createMarkerSVG(color, isSelected),
        width: iconWidth,
        height: iconHeight,
        anchor: iconAnchor
      };
      
      if (!markersRef.current[station.id]) {
        const marker = new window.mappls.Marker({
          map: mapRef.current,
          position: { lat: station.lat, lng: station.lng },
          icon: iconConfig,
          draggable: false
        });

        marker.addListener('click', () => {
          setSelectedStation(station);
        });

        markersRef.current[station.id] = marker;
      } else {
        markersRef.current[station.id].setIcon(iconConfig);
      }
    });
  }, [stations, selectedStation]);

  // SELECTED STATION EFFECT
  useEffect(() => {
    if (!selectedStation || !mapRef.current || !window.mappls) return;

    mapRef.current.setCenter([selectedStation.lng, selectedStation.lat]);

    if (infoWindowRef.current) {
      infoWindowRef.current.remove();
    }

    infoWindowRef.current = new window.mappls.InfoWindow({
      map: mapRef.current,
      position: { lat: selectedStation.lat, lng: selectedStation.lng },
      content: buildPopupHTML(selectedStation),
      offset: [0, -40]
    });

    if (cardRefs.current[selectedStation.id]) {
      cardRefs.current[selectedStation.id].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [selectedStation]);

  const handleMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setCenter([longitude, latitude]);
        mapRef.current?.setZoom(14);
        setUserLocation({
          lat: latitude,
          lng: longitude
        });
        setIsDetectedLocation(true);
      },
      () => showNotify("Location access denied", "warning")
    );
  };


  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex" }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      {/* SIDEBAR */}
      <div
        style={{
          width: 340,
          background: "#fff",
          borderRight: "1px solid #E5E7EB",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EvStationIcon style={{ color: "#EAB308" }} />
            <span style={{ fontWeight: 600 }}>Charging Stations</span>
          </div>

          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
            Near: {isDetectedLocation ? "Your Location" : "Pune"}
          </div>

          {/* SEARCH */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              padding: "6px 8px",
            }}
          >
            <SearchIcon style={{ fontSize: 18, color: "#888" }} />

            <input
              placeholder="Search station..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                marginLeft: 6,
                width: "100%",
              }}
            />
          </div>

          {/* CONNECTOR FILTER */}
          <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
            {connectors.map((c) => (
              <button
                key={c}
                onClick={() => setActiveFilter(c)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 16,
                  border: "1px solid #E5E7EB",
                  background: activeFilter === c ? "#FACC15" : "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, marginTop: 8, color: "#6B7280" }}>
            Showing {filteredStations.length} stations
          </div>
        </div>

        {/* STATION LIST */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
          {filteredStations.map((station) => (
            <div
              key={station.id}
              ref={el => cardRefs.current[station.id] = el}
              onClick={() => {
                setSelectedStation(station);
              }}
              style={{
                border: selectedStation?.id === station.id ? "2px solid #EAB308" : "1px solid #E5E7EB",
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
                background: selectedStation?.id === station.id ? "#FEFCE8" : "#fff",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: selectedStation?.id === station.id ? "0 4px 12px rgba(234, 179, 8, 0.2)" : "0 1px 2px rgba(0,0,0,0.05)",
                transform: selectedStation?.id === station.id ? "scale(1.02)" : "none"
              }}
              onMouseEnter={(e) => {
                if (selectedStation?.id !== station.id) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.12)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedStation?.id !== station.id) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                }
              }}
            >
              {/* TITLE */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 600 }}>{station.name}</div>

                <span
                  style={{
                    background: "#E6F9F0",
                    color: "#16A34A",
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  OPEN
                </span>
              </div>

              {/* ADDRESS */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 12,
                  color: "#6B7280",
                  marginTop: 4,
                  gap: 4,
                }}
              >
                <LocationIcon style={{ fontSize: 14 }} />
                {station.address}
              </div>

              {/* CONNECTORS + SLOTS */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(station.connectorTypes || []).map((type) => (
                    <span
                      key={type}
                      style={{
                        background: "#EEF2FF",
                        color: "#4F46E5",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                      }}
                    >
                      {type}
                    </span>
                  ))}

                  <span style={{ color: "#16A34A", fontWeight: 500 }}>
                    ⚡ {station.availableSlots}/{station.totalSlots} slots
                  </span>
                </div>

                <span style={{ color: "#D97706", fontWeight: 600 }}>
                  ₹{station.pricePerKwh || station.pricePerUnit}/kWh
                </span>
              </div>

              {station.distance && (
                <div style={{ fontSize: 11, marginTop: 4, color: "#6B7280" }}>
                  {station.distance} km away
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MAP */}
      <div style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        height: "calc(100vh - 64px)",
      }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.7)",
              zIndex: 10,
            }}
          >
            <CircularProgress />
          </div>
        )}

        <div
          id="map-container"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%'
          }}
        />

        <button
          onClick={handleMyLocation}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "#fff",
            borderRadius: 8,
            padding: 8,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 1000,
          }}
        >
          <MyLocationIcon />
        </button>
      </div>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%', fontWeight: 'bold' }}>{snackbar.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default MapPage;