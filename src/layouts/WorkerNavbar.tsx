import { NavLink } from "react-router-dom";
import { CalendarClock, ClipboardList } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function WorkerNavbar() {
  const { theme } = useTheme();

  const base =
    "px-3 py-1.5 rounded text-sm font-medium transition inline-flex items-center gap-2";

  const inactive =
    theme === "light"
      ? "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
      : "text-gray-300 hover:bg-white/10";

  const active =
    theme === "light"
      ? "bg-orange-100 text-orange-600"
      : "bg-orange-500/20 text-orange-200";

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
