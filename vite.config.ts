import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  base: "/Ns-cantieri/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // ✅ divide librerie pesanti in chunk separati
          react: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
          lucide: ["lucide-react"],
          motion: ["framer-motion"],
        },
      },
    },
    // ✅ alza anche il limite per i warning (opzionale)
    chunkSizeWarningLimit: 1500,
  },
});
