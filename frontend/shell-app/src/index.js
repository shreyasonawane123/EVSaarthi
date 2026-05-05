// frontend/shell-app/src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./tailwind.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── PWA Service Worker Registration ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('[PWA] Service Worker registered with scope:', registration.scope);

        // Check for updates periodically (every 60 seconds)
        setInterval(() => {
          registration.update();
        }, 60 * 1000);

        // Listen for new service worker waiting to activate
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[PWA] New content is available; please refresh.');
              }
            });
          }
        });
      })
      .catch(error => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
  });
}
