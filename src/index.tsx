import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { updateConfig } from "./config";

// Enable telemetry if URL parameter is present
const params = new URLSearchParams(window.location.search);
if (params.get("telemetry") === "true") {
  updateConfig({ telemetry: { enabled: true } });
}

// Expose updateConfig for external use (e.g., profiling scripts)
(window as unknown as { updateConfig?: typeof updateConfig }).updateConfig = updateConfig;

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
