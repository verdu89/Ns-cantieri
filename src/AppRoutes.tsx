import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

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

const AppRoutes = () => {
  const { user } = useAuth();

  // 🔑 Calcola la "home" giusta
  const getHomeRoute = () => {
    if (!user) return "/login";
    if (user.role === "worker") return "/agenda";
    return "/backoffice/home";
  };

  return (
    <Router>
      <Routes>
        {/* === Pubbliche === */}
        {!user ? (
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>
        ) : (
          <Route path="/login" element={<Navigate to={getHomeRoute()} replace />} />
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

            {/* Backoffice/Admin */}
            {(user.role === "backoffice" || user.role === "admin") && (
              <Route element={<BackofficeLayout />}>
                <Route path="/backoffice/home" element={<Home />} />
                <Route path="/backoffice/customers" element={<Customers />} />
                <Route path="/backoffice/customers/:id" element={<CustomerDetail />} />
                <Route path="/backoffice/orders" element={<Orders />} />
                <Route path="/backoffice/orders/:id" element={<OrderDetail />} />
                <Route path="/backoffice/newjob" element={<NewJob />} />
                <Route path="/backoffice/montatori" element={<Montatori />} />
                <Route path="/backoffice/documenti" element={<Documenti />} />
                <Route path="/backoffice/report" element={<Report />} />
                <Route path="/backoffice/jobs/:id" element={<JobDetail />} />
                <Route path="/backoffice/settings" element={<Settings />} />
                <Route path="/backoffice/agenda" element={<Agenda />} />
              </Route>
            )}

            {/* Home dinamica */}
            <Route path="/home" element={<Navigate to={getHomeRoute()} replace />} />
          </Route>
        )}

        {/* === Default === */}
        <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
