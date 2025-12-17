// // vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // or 'localhost' or your IP address
    port: 3000, // change to any port you want
  },
  base: "/",
});
