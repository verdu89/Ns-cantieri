import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";

export default function AuthLayout() {
  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-orange-100 via-orange-200 to-orange-300">
      {/* Colonna sinistra: brand/descrizione (solo desktop) */}

      <div className="hidden lg:flex w-1/2 text-gray-800 flex-col justify-center items-center p-16">
        <motion.img
          src={`${import.meta.env.BASE_URL}img/logo.png`}
          alt="NS Cantieri"
          className="h-20 mb-12 opacity-95" // Logo ingrandito
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        />
        <motion.h1
          className="text-7xl font-extrabold tracking-tight text-center text-gray-900" // Titolo ingrandito
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          N<span className="text-orange-500">S</span> cantieri
        </motion.h1>
        <p className="mt-8 text-2xl text-gray-700 text-center max-w-lg leading-relaxed">
          {" "}
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
            src={`${import.meta.env.BASE_URL}img/logo.png`}
            alt="NS Cantieri"
            className="h-14 mb-3 opacity-95"
          />
          <h1 className="text-5xl font-extrabold tracking-tight text-center text-gray-900">
            N<span className="text-orange-500">S</span> cantieri
          </h1>

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
