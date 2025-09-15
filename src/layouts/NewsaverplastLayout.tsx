import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X, ArrowLeft } from "lucide-react";
import BackofficeNavbar from "./BackofficeNavbar";
import WorkerNavbar from "./WorkerNavbar";
import UserMenu from "@/components/UserMenu";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function NewsaverplastLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();

  const navigate = useNavigate();
  const location = useLocation();

  // Chiude automaticamente il drawer al cambio pagina
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Rotte per cui mostrare il pulsante indietro
  const backPaths = ["/customers/", "/orders/", "/jobs/"];
  const showBack = backPaths.some((path) => location.pathname.includes(path));

  const NavbarComponent =
    user?.role === "worker" ? WorkerNavbar : BackofficeNavbar;

  return (
    <div
      className={`
        flex h-screen w-full overflow-hidden
        ${theme === "light" ? "bg-orange-50" : "bg-gray-900"}
      `}
    >
      {/* Layout principale */}
      <div className="flex h-full w-full relative z-10">
        {/* Sidebar desktop */}
        <motion.aside
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className={`
            hidden md:flex
            w-64 flex-col justify-between relative
            ${
              theme === "light"
                ? "bg-white border-orange-200"
                : "bg-gray-800 border-gray-700"
            }
            backdrop-blur-2xl border-r
            p-4 shadow-xl
            text-gray-900 dark:text-gray-100
          `}
        >
          {/* Navbar in alto */}
          <div className="flex flex-col gap-2">
            <NavbarComponent />
          </div>

          {/* User menu in basso */}
          <div className="mt-4 border-t border-orange-100 dark:border-gray-700 pt-4 relative">
            <UserMenu dropUp />
          </div>
        </motion.aside>

        {/* Sidebar mobile (drawer) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Drawer ancorato a sinistra */}
            <motion.aside
              initial={{ x: -250 }}
              animate={{ x: 0 }}
              exit={{ x: -250 }}
              className={`
                w-64 flex flex-col justify-between relative
                ${
                  theme === "light"
                    ? "bg-white border-orange-200"
                    : "bg-gray-800 border-gray-700"
                }
                backdrop-blur-2xl border-r
                p-4 shadow-xl
                text-gray-900 dark:text-gray-100
              `}
            >
              <div>
                <button
                  className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-300"
                  onClick={() => setMobileOpen(false)}
                >
                  <X size={20} /> Chiudi
                </button>
                <div className="flex flex-col gap-2">
                  <NavbarComponent />
                </div>
              </div>

              <div className="mt-4 border-t border-orange-100 dark:border-gray-700 pt-4 relative">
                <UserMenu />
              </div>
            </motion.aside>

            {/* Overlay a destra che copre il resto */}
            <div
              className="flex-1 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
          </div>
        )}

        {/* Area contenuto */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <header
            className={`
              flex items-center 
              ${
                theme === "light"
                  ? "bg-white border-orange-200"
                  : "bg-gray-800 border-gray-700"
              }
              backdrop-blur-2xl border-b
              px-4 sm:px-6 py-3 shadow-md
            `}
          >
            <button
              className="md:hidden p-2 rounded hover:bg-orange-100 dark:hover:bg-gray-700"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="ml-2 flex items-center gap-2">
              <img
                src="/img/logo.png"
                alt="Logo NS Cantieri"
                className="h-16 w-[150px] sm:h-20 sm:w-[200px] md:h-24 md:w-[250px] lg:h-28 lg:w-[300px] object-auto"
              />
            </div>
          </header>

          {/* Main */}
          <motion.main
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6"
          >
            {/* Pulsante indietro (solo in sottopagine) */}
            {showBack && (
              <div className="mb-4">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-100 
                             dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                             hover:bg-orange-200 dark:hover:bg-gray-600 transition"
                >
                  <ArrowLeft
                    size={18}
                    className="text-gray-800 dark:text-gray-200"
                  />
                  <span>Indietro</span>
                </button>
              </div>
            )}

            <div
              className={`
                rounded-2xl border shadow-lg p-4 sm:p-6
                ${
                  theme === "light"
                    ? "bg-white border-orange-200"
                    : "bg-gray-800 border-gray-700"
                }
              `}
            >
              <Outlet />
            </div>
          </motion.main>

          {/* Footer */}
          <footer
            className={`
              px-4 py-3 text-xs text-center border-t
              ${
                theme === "light"
                  ? "bg-white text-gray-500 border-orange-200"
                  : "bg-gray-800 text-gray-400 border-gray-700"
              }
            `}
          >
            © {new Date().getFullYear()} New Saverplast. Tutti i diritti
            riservati.
          </footer>
        </div>
      </div>
    </div>
  );
}
