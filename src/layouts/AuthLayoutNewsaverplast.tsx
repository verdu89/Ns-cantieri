import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";

export default function AuthLayout() {
  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      {/* Sfondo immagine */}
      <motion.img
        src="/img/cantiere.jpg"
        alt="Auth Saverplast"
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{
          duration: 25,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Contenuto centrale */}
      <div className="relative z-10 flex h-full w-full items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="
            w-full max-w-md
            bg-white/90 backdrop-blur-xl rounded-2xl
            border border-gray-200 shadow-2xl
            p-6 sm:p-8
            text-center
          "
        >
          {/* Logo / Titolo Saverplast */}
          <div className="mb-6">
            {/* Se hai un logo immagine: */}
            {/* <img src="/logo-saverplast.png" alt="Saverplast" className="mx-auto h-12" /> */}
            <h1 className="text-2xl font-bold text-gray-900 tracking-wide">
             Ns cantieri
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Accedi al tuo account
            </p>
          </div>

          {/* Outlet = form di login/registrazione */}
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
