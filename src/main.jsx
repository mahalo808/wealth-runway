import React from "react";
import ReactDOM from "react-dom/client";
import App from "./AppShell.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the offline service worker (PWA). No accounts, no server sync —
// this only caches the app shell so EmberFI works offline once visited.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is a progressive enhancement; ignore failures */
    });
  });
}

// Register the service worker for offline / installable PWA support.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
