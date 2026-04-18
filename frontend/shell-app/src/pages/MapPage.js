import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import CircularProgress from "@mui/material/CircularProgress";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const MapPage = () => {
  const { currentUser } = useAuth();
  const [mapUrl, setMapUrl] = useState("");

  useEffect(() => {
    const initMap = async () => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          const name = currentUser.displayName || "Driver";
          
          // Fetch profile to get city
          let city = "";
          try {
            console.log("MapPage: Fetching user profile...");
            const res = await axios.get(`${API}/api/user/profile`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const profile = res.data.profile || res.data;
            city = profile.city || "";
            console.log("MapPage: Profile city fetched:", city);
          } catch (err) {
            console.error("MapPage: Failed to fetch profile:", err);
          }

          const query = new URLSearchParams({ token, name, city });
          const finalUrl = `http://localhost:3003/?${query.toString()}`;
          console.log("MapPage: Setting map URL:", finalUrl);
          setMapUrl(finalUrl);
        } catch (error) {
          console.error("Failed to get token for map app:", error);
          setMapUrl("http://localhost:3003/");
        }
      } else {
        setMapUrl("");
      }
    };
    initMap();
  }, [currentUser]);

  if (!mapUrl) {
    return (
      <div style={{ height: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress style={{ color: "#EAB308" }} />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      <iframe
        src={mapUrl}
        title="EV Saarthi Charging Map"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        allow="geolocation"
      />
    </div>
  );
};

export default MapPage;
