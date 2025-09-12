import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";

type UserMenuProps = {
  dropUp?: boolean; // 👈 se true apre verso l'alto
};

export default function UserMenu({ dropUp = false }: UserMenuProps) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [openDesktop, setOpenDesktop] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initials = user?.name
    ? user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpenDesktop(false);
      }
    }
    if (openDesktop) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openDesktop]);

  const itemCls =
    "flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm w-full text-left";

  const getSettingsPath = () =>
    user?.role === "worker" ? "/settings" : "/backoffice/settings";

  return (
    <div className="relative w-full" ref={ref}>
      {/* Bottone utente */}
      <button
        onClick={() =>
          window.innerWidth >= 768
            ? setOpenDesktop((v) => !v)
            : setOpenMobile((v) => !v)
        }
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 w-full"
      >
        <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-semibold text-gray-800 dark:text-gray-100">
          {initials}
        </div>
        <span className="hidden sm:inline text-sm text-gray-800 dark:text-gray-100">
          {user?.name ?? "Utente"}
        </span>
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
          className={`
            absolute ${
              dropUp ? "bottom-full mb-2" : "top-full mt-2"
            } right-0 w-56 rounded-md shadow-xl border z-[200] hidden md:block
            ${theme === "light"
              ? "bg-white text-gray-800 border-gray-200"
              : "bg-gray-800 text-gray-100 border-gray-700"}
          `}
        >
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm font-semibold">{user?.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</div>
            <div className="text-[11px] mt-1 inline-block px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
              {user?.role}
            </div>
          </div>
          <div className="py-1">
            <button
              className={itemCls}
              onClick={() => {
                setOpenDesktop(false);
                navigate(getSettingsPath());
              }}
            >
              <Settings size={16} /> Impostazioni
            </button>
            <button
              className={itemCls}
              onClick={async () => {
                setOpenDesktop(false);
                await logout();
                navigate("/login");
              }}
            >
              <LogOut size={16} /> Esci
            </button>
          </div>
        </div>
      )}

      {/* Accordion mobile */}
      {openMobile && (
        <div className="mt-1 ml-4 flex flex-col gap-1 md:hidden">
          <button
            className={itemCls}
            onClick={() => {
              setOpenMobile(false);
              navigate(getSettingsPath());
            }}
          >
            <Settings size={16} /> Impostazioni
          </button>
          <button
            className={itemCls}
            onClick={async () => {
              setOpenMobile(false);
              await logout();
              navigate("/login");
            }}
          >
            <LogOut size={16} /> Esci
          </button>
        </div>
      )}
    </div>
  );
}
