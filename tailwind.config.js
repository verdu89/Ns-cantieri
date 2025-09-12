export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1e40af", // blu principale
          light: "#3b82f6",   // blu chiaro
          dark: "#1e3a8a",    // blu scuro
        },
        graybg: "#f8f9fa",    // sfondo neutro
      },
    },
  },
  plugins: [],
};