import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import auth from "./utils/auth";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// attach activity listeners to keep session alive while user is active
// also perform a simple inactivity check on load
// attach activity listeners (updates lastActive) — server manages session via refresh tokens
auth.attachActivityListeners();
