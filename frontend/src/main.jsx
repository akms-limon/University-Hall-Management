import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./app/providers/AuthProvider";
import justLogo from "./assets/just-logo.webp";
import { initializeTheme } from "./lib/theme";
import "./styles/index.css";

initializeTheme();
document.title = "Shaheed Mashiur Rahman Hall | JUST";

const favicon = document.querySelector("link[rel='icon'], link[rel='shortcut icon']") || document.createElement("link");
favicon.setAttribute("rel", "icon");
favicon.setAttribute("type", "image/webp");
favicon.setAttribute("href", justLogo);
if (!favicon.parentElement) {
  document.head.appendChild(favicon);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
