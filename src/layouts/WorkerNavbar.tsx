import { NavLink } from "react-router-dom";
import { CalendarClock, ClipboardList } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function WorkerNavbar() {
  const { theme } = useTheme();

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

  return (
    <>
      <NavLink to="/agenda" className={linkClass}>
        <CalendarClock size={16} /> Agenda
      </NavLink>
      <NavLink to="/my-jobs" className={linkClass}>
        <ClipboardList size={16} /> I miei lavori
      </NavLink>
    </>
  );
}
