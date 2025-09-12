import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  Wrench,
  FileText,
  BarChart3,
  CalendarClock,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function BackofficeNavbar() {
  const { theme } = useTheme(); // 👈 prende il tema globale
  const [openDesktop, setOpenDesktop] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const base =
    "px-3 py-1.5 rounded text-sm font-medium transition inline-flex items-center gap-2";

  const inactive =
    theme === "light"
      ? "text-gray-800 hover:bg-gray-100"
      : "text-gray-300 hover:bg-white/10";

  const active =
    theme === "light"
      ? "bg-blue-50 text-blue-600"
      : "bg-white/20 text-white";

  function linkClass({ isActive }: { isActive: boolean }) {
    return `${base} ${isActive ? active : inactive}`;
  }

  // Chiudi dropdown desktop cliccando fuori
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpenDesktop(false);
    }
    if (openDesktop) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openDesktop]);

  return (
    <>
      <NavLink to="/backoffice/home" className={linkClass}>
        <LayoutDashboard size={16} /> Dashboard
      </NavLink>

      {/* --- Gestione --- */}
      <div className="relative">
        {/* Bottone comune */}
        <button
          type="button"
          className={`${base} ${
            openDesktop || openMobile ? active : inactive
          } w-full md:w-auto`}
          onClick={() =>
            window.innerWidth >= 768
              ? setOpenDesktop((v) => !v) // desktop
              : setOpenMobile((v) => !v)  // mobile
          }
        >
          <Package size={16} /> Gestione
          <ChevronDown
            size={16}
            className={`ml-auto md:ml-0 transition-transform ${
              openDesktop || openMobile ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown desktop */}
        {openDesktop && (
          <div
            ref={ref}
            className={`
              absolute left-0 mt-2 w-56 rounded-md shadow-lg border z-50 hidden md:block
              ${theme === "light"
                ? "bg-white text-gray-800 border-gray-200"
                : "bg-gray-900 text-gray-100 border-gray-700"}
            `}
          >
            <div className="py-1">
              <NavLink
                to="/backoffice/customers"
                className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpenDesktop(false)}
              >
                <Users size={16} /> Clienti
              </NavLink>
              <NavLink
                to="/backoffice/orders"
                className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpenDesktop(false)}
              >
                <Package size={16} /> Ordini
              </NavLink>
              <NavLink
                to="/backoffice/montatori"
                className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpenDesktop(false)}
              >
                <Wrench size={16} /> Montatori
              </NavLink>
              <NavLink
                to="/backoffice/documenti"
                className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpenDesktop(false)}
              >
                <FileText size={16} /> Documenti
              </NavLink>
              <NavLink
                to="/backoffice/report"
                className="flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpenDesktop(false)}
              >
                <BarChart3 size={16} /> Report
              </NavLink>
            </div>
          </div>
        )}

        {/* Accordion mobile */}
        {openMobile && (
          <div className="mt-1 ml-4 flex flex-col gap-1 md:hidden">
            <NavLink to="/backoffice/customers" className={linkClass}>
              <Users size={16} /> Clienti
            </NavLink>
            <NavLink to="/backoffice/orders" className={linkClass}>
              <Package size={16} /> Ordini
            </NavLink>
            <NavLink to="/backoffice/montatori" className={linkClass}>
              <Wrench size={16} /> Montatori
            </NavLink>
            <NavLink to="/backoffice/documenti" className={linkClass}>
              <FileText size={16} /> Documenti
            </NavLink>
            <NavLink to="/backoffice/report" className={linkClass}>
              <BarChart3 size={16} /> Report
            </NavLink>
          </div>
        )}
      </div>

      {/* Link diretti */}
      <NavLink to="/backoffice/agenda" className={linkClass}>
        <CalendarClock size={16} /> Agenda
      </NavLink>
    </>
  );
}
