import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import AppRoutes from "./AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";
import "./index.css";

import { SplashScreen } from "@capacitor/splash-screen";
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";

import ScrollToTopButton from "./components/ui/ScrollToTopButton";

// Tipizzazione evento backButton
interface BackButtonEvent {
  canGoBack: boolean;
}

function RootApp() {
  useEffect(() => {
    // Nascondi lo splash quando l'app è pronta
    SplashScreen.hide({ fadeOutDuration: 300 });

    // Gestione del tasto back su Android
    let listener: PluginListenerHandle | undefined;

    const setupBackButton = async () => {
      listener = await App.addListener(
        "backButton",
        (event: BackButtonEvent) => {
          if (event.canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        }
      );
    };

    setupBackButton();

    // Cleanup → rimuove il listener quando il componente viene smontato
    return () => {
      listener?.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppRoutes />
        <ScrollToTopButton />
        <Toaster
          position="bottom-center" // Posiziona i toast in basso
          reverseOrder={false}
          containerStyle={{
            marginBottom: 40, // Distanza dal fondo
          }}
          toastOptions={{
            style: {
              zIndex: 99999, // Assicurati che i toast siano sopra gli altri contenuti
            },
          }}
        />
      </ThemeProvider>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
