import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import AppRoutes from "./AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";
import "./index.css";

import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

function RootApp() {
  useEffect(() => {
    // Nascondi lo splash quando l'app è pronta
    SplashScreen.hide({ fadeOutDuration: 300 });

    // Imposta la status bar in base al tema (scura + colore personalizzato)
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: "#0f172a" }); // colore tema slate-900
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppRoutes />
        {/* ✅ Monta il Toaster una sola volta a livello root */}
        <Toaster position="top-right" reverseOrder={false} />
      </ThemeProvider>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
