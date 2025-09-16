import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import toast from "react-hot-toast";

import ProtectedLayout from "./routes/ProtectedLayout";
import WorkerLayout from "./layouts/NewsaverplastLayout";
import BackofficeLayout from "./layouts/NewsaverplastLayout";
import AuthLayout from "./layouts/AuthLayoutNewsaverplast";

import Login from "./pages/Login";
import Agenda from "./pages/Agenda";
import JobDetail from "./pages/JobDetail";
import Home from "./pages/backoffice/Home";
import Customers from "./pages/backoffice/Customers";
import Orders from "./pages/backoffice/Orders";
import NewJob from "./pages/backoffice/NewJob";
import CustomerDetail from "./pages/backoffice/CustomerDetail";
import OrderDetail from "./pages/backoffice/OrderDetail";
import Montatori from "./pages/backoffice/Montatori";
import Documenti from "./pages/backoffice/Documenti";
import Report from "./pages/backoffice/Report";
import Settings from "./pages/Settings";
import MyJobs from "./pages/MyJobs";

const AppRoutesInner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const lastBackPress = useRef(0);

  // 🔙 Gestione tasto indietro Android con doppio tap per uscire
  useEffect(() => {
    let handler: any;

    CapacitorApp.addListener("backButton", () => {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        const now = Date.now();
        if (now - lastBackPress.current < 2000) {
          CapacitorApp.exitApp();
        } else {
          toast("Premi di nuovo indietro per uscire");
          lastBackPress.current = now;
        }
      }
    }).then((h) => {
      handler = h; // salva l'handle
    });

    return () => {
      handler?.remove(); // rimuovi il listener
    };
  }, [navigate]);

  // 🔑 Calcola la "home" giusta
  const getHomeRoute = () => {
    if (!user) return "/login";
    if (user.role === "worker") return "/agenda";
    return "/backoffice/home";
  };

  return (
    <Routes>
      {/* === Pubbliche === */}
      {!user ? (
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>
      ) : (
        <Route
          path="/login"
          element={<Navigate to={getHomeRoute()} replace />}
        />
      )}

      {/* === Protette === */}
      {user && (
        <Route element={<ProtectedLayout />}>
          {/* Worker */}
          {user.role === "worker" && (
            <Route element={<WorkerLayout />}>
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/my-jobs" element={<MyJobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          )}

          {/* Backoffice + Admin */}
          {(user.role === "backoffice" || user.role === "admin") && (
            <Route element={<BackofficeLayout />}>
              <Route path="/backoffice/home" element={<Home />} />
              <Route path="/backoffice/customers" element={<Customers />} />
              <Route
                path="/backoffice/customers/:id"
                element={<CustomerDetail />}
              />
              <Route path="/backoffice/orders" element={<Orders />} />
              <Route path="/backoffice/orders/:id" element={<OrderDetail />} />
              <Route path="/backoffice/newjob" element={<NewJob />} />
              <Route path="/backoffice/montatori" element={<Montatori />} />
              <Route path="/backoffice/documenti" element={<Documenti />} />

              {/* ✅ SOLO ADMIN */}
              {user.role === "admin" && (
                <Route path="/backoffice/report" element={<Report />} />
              )}

              <Route path="/backoffice/jobs/:id" element={<JobDetail />} />
              <Route path="/backoffice/settings" element={<Settings />} />
              <Route path="/backoffice/agenda" element={<Agenda />} />
            </Route>
          )}

          {/* Home dinamica */}
          <Route
            path="/home"
            element={<Navigate to={getHomeRoute()} replace />}
          />
        </Route>
      )}

      {/* === Default === */}
      <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
    </Routes>
  );
};

// Wrapper con Router
const AppRoutes = () => (
  <Router>
    <AppRoutesInner />
  </Router>
);

export default AppRoutes;
