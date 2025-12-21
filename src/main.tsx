import "./ui/style.css";

import React from "react";
import { createRoot } from "react-dom/client";

import App from "./ui/App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
