import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import Footer from "../components/Footer";

type AppLayoutProps = {
  left: ReactNode;   // navbar principale (link / dropdown)
  right?: ReactNode; // user menu (avatar, settings, logout)
  children?: ReactNode;
};

export default function AppLayout({ left, right, children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Chiudi il menu mobile cliccando fuori
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) setMobileOpen(false);
    }
    if (mobileOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-brand text-white px-4 py-3 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded hover:bg-brand-dark"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Apri menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="text-lg font-bold tracking-tight">POSA 3000</h1>
        </div>

        {/* Navbar desktop */}
        <nav className="hidden md:flex items-center gap-2">{left}</nav>

        {/* User menu desktop */}
        <div className="hidden md:flex">{right}</div>

        {/* Mobile panel */}
        {mobileOpen && (
          <div
            ref={panelRef}
            className="absolute top-full left-0 right-0 md:hidden bg-white text-gray-800 shadow-lg border-b z-50"
          >
            <div className="px-3 py-3 flex flex-col gap-2">
              {/* voci principali con override colori */}
              <div className="flex flex-col gap-1 [&_*]:!text-gray-800 [&_*]:hover:!bg-gray-100">
                {left}
              </div>

              {/* separatore */}
              {right ? <div className="my-2 border-t" /> : null}

              {/* user actions con override colori */}
              <div className="flex flex-col gap-1 [&_*]:!text-gray-800 [&_*]:hover:!bg-gray-100">
                {right}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Contenuto */}
      <main className="flex-1 px-4 py-4">{children}</main>

      {/* Footer */}
      <Footer />

    </div>
  );
}
