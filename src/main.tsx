import React from "react";
import ReactDOM from "react-dom/client";
import AppRoutes from "./AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <AppRoutes />
        {/* ✅ Monta il Toaster una sola volta a livello root */}
        <Toaster position="top-right" reverseOrder={false} />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);
