import React from "react";
import ReactDOM from "react-dom/client";
import AppRoutes from "./AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext"; 
import { ThemeProvider } from "./context/ThemeContext"; 
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <ThemeProvider>   {/* 👈 aggiungi il ThemeProvider */}
          <AppRoutes />
        </ThemeProvider>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
