// frontend/shell-app/src/pages/BookingPage.js
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BookingPage = () => {
  const [searchParams] = useSearchParams();
  const stationId = searchParams.get("stationId");
  const { currentUser } = useAuth();
  const [token, setToken] = useState(null);

  useEffect(() => {
    const fetchToken = async () => {
      if (currentUser) {
        const t = await currentUser.getIdToken();
        const b64Name = btoa(unescape(encodeURIComponent(currentUser.displayName || "User")));
        setToken({ val: t, name: b64Name });
      }
    };
    fetchToken();
  }, [currentUser]);

  if (!token) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading Booking App...</div>;
  }
  
  // Pass the query param through to the iframe
  const iframeUrl = stationId 
    ? `http://localhost:3004/?stationId=${stationId}&token=${token.val}&name=${token.name}`
    : `http://localhost:3004/?token=${token.val}&name=${token.name}`;

  return (
    <div style={{ height: "calc(100vh - 64px)", width: "100%" }}>
      <iframe
        src={iframeUrl}
        title="Slot Booking"
        allow="geolocation"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block"
        }}
      />
    </div>
  );
};

export default BookingPage;
