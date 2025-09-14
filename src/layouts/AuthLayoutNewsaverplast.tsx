import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";

export default function AuthLayout() {
  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-orange-100 via-orange-200 to-orange-300">
      {/* Colonna sinistra: brand/descrizione (solo desktop) */}
      <div className="hidden lg:flex w-1/2 text-gray-800 flex-col justify-center items-center p-12">
        <motion.img
          src="public/img/logo.png"
          alt="NS Cantieri"
          className="h-16 mb-6 opacity-95"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        />
        <motion.h1
          className="text-5xl font-extrabold tracking-tight text-center text-gray-900"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Ns cantieri
        </motion.h1>
        <p className="mt-6 text-lg text-gray-700 text-center max-w-md leading-relaxed">
          La nuova generazione di gestione cantieri.
          <br />
          <span className="font-medium text-gray-900">
            Smart, semplice e veloce.
          </span>
        </p>
      </div>

      {/* Colonna destra: login */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 relative">
        {/* Branding mobile (visibile solo < lg) */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <img
            src="/img/logo.png"
            alt="NS Cantieri"
            className="h-14 mb-3 opacity-95"
          />
          <h1 className="text-2xl font-bold text-gray-900">Ns cantieri</h1>
          <p className="mt-1 text-sm text-gray-600">Accedi al tuo account</p>
        </div>

        {/* Box login */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="
            w-full max-w-md
            rounded-2xl border border-gray-200 shadow-xl
            bg-white
            p-6 sm:p-8
          "
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
