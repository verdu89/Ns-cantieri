"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  Folder,
  Hammer,
  Calendar,
  BarChart2,
  FileText,
  Settings,
  HardHat,
  User as UserIcon,
  Menu,
  X,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext"; // aggiorna path se diverso

type Role = "backoffice" | "montatore";

interface NavItem {
  label: string;
  icon: ReactNode;
  to: string;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const role: Role = user?.role === "montatore" ? "montatore" : "backoffice";
  const userName = user?.username;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<null | "analisi" | "gestione" | "profilo">(null);

  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const backofficeMain: NavItem[] = [
    { label: "Dashboard", icon: <Home className="w-5 h-5" />, to: "/backoffice/home" },
    { label: "Clienti", icon: <Users className="w-5 h-5" />, to: "/backoffice/customers" },
    { label: "Commesse", icon: <Folder className="w-5 h-5" />, to: "/backoffice/orders" },
    { label: "Agenda", icon: <Calendar className="w-5 h-5" />, to: "/agenda" },
  ];

  const backofficeAnalisi: NavItem[] = [
    { label: "Report", icon: <BarChart2 className="w-5 h-5" />, to: "/backoffice/report" },
    { label: "Documenti", icon: <FileText className="w-5 h-5" />, to: "/backoffice/documenti" },
  ];

  const backofficeGestione: NavItem[] = [
    { label: "Montatori", icon: <HardHat className="w-5 h-5" />, to: "/backoffice/montatori" },
    { label: "Impostazioni", icon: <Settings className="w-5 h-5" />, to: "/settings" },
  ];

  const montatoreMain: NavItem[] = [
    { label: "Agenda", icon: <Calendar className="w-5 h-5" />, to: "/agenda" },
    { label: "I miei lavori", icon: <Hammer className="w-5 h-5" />, to: "/my-jobs" },


  ];

  const linkBase =
    "flex items-center gap-2 px-3 py-2 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";
  const linkIdle = "text-gray-300 hover:bg-blue-800 hover:text-white";
  const linkActive = "bg-blue-700 text-white";

  const RoleBadge = () => (
    <span
      className={`text-xs font-semibold px-2 py-1 rounded-md ${
        role === "backoffice" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
      }`}
    >
      {role === "backoffice" ? "Backoffice" : "Montatore"}
    </span>
  );

  function toggleDropdown(id: "analisi" | "gestione" | "profilo") {
    setOpenDropdown((prev) => (prev === id ? null : id));
  }

  function closeDropdowns() {
    setOpenDropdown(null);
  }

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  return (
    <header className="bg-gradient-to-r from-blue-900 to-blue-950 text-gray-200 shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo + ruolo + utente */}
        <div className="flex items-center gap-3">
          <div className="text-xl font-extrabold text-white tracking-wide">New-Saverplast</div>
          <RoleBadge />
          {userName && <span className="text-sm text-gray-300">• {userName}</span>}
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-3">
          {role === "backoffice" ? (
            <>
              {backofficeMain.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`${linkBase} ${isActive(item.to) ? linkActive : linkIdle}`}
                  onClick={closeDropdowns}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}

              {/* Analisi */}
              <div className="relative">
                <button
                  type="button"
                  className={`${linkBase} ${linkIdle}`}
                  onClick={() => toggleDropdown("analisi")}
                >
                  <BarChart2 className="w-5 h-5" />
                  <span>Analisi</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {openDropdown === "analisi" && (
                  <div className="absolute mt-2 bg-blue-900 rounded-lg shadow-lg p-2 space-y-1 min-w-44 z-50">
                    {backofficeAnalisi.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-700"
                        onClick={closeDropdowns}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Gestione */}
              <div className="relative">
                <button
                  type="button"
                  className={`${linkBase} ${linkIdle}`}
                  onClick={() => toggleDropdown("gestione")}
                >
                  <Settings className="w-5 h-5" />
                  <span>Gestione</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {openDropdown === "gestione" && (
                  <div className="absolute mt-2 bg-blue-900 rounded-lg shadow-lg p-2 space-y-1 min-w-44 z-50">
                    {backofficeGestione.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-700"
                        onClick={closeDropdowns}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-600 hover:text-white"
              >
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </>
          ) : (
            <>
              {montatoreMain.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`${linkBase} ${isActive(item.to) ? linkActive : linkIdle}`}
                  onClick={closeDropdowns}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}

              {/* Profilo */}
              <div className="relative">
                <button
                  type="button"
                  className={`${linkBase} ${linkIdle}`}
                  onClick={() => toggleDropdown("profilo")}
                >
                  <UserIcon className="w-5 h-5" />
                  <span>Profilo</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {openDropdown === "profilo" && (
                  <div className="absolute mt-2 bg-blue-900 rounded-lg shadow-lg p-2 space-y-1 min-w-44 z-50">
                    <Link
                      to="/settings"
                      className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-700"
                      onClick={closeDropdowns}
                    >
                      <UserIcon className="w-5 h-5" /> Profilo
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 rounded text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <LogOut className="w-5 h-5" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-200"
          onClick={() => {
            setMobileOpen(!mobileOpen);
            closeDropdowns();
          }}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden bg-blue-900 flex flex-col space-y-2 px-4 py-3">
          {(role === "backoffice"
            ? [...backofficeMain, ...backofficeAnalisi, ...backofficeGestione]
          : [...montatoreMain, { label: "Impostazioni", icon: <Settings className="w-5 h-5" />, to: "/settings" }]
          ).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-800"
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-600 hover:text-white"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </nav>
      )}
    </header>
  );
}
