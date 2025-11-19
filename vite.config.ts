import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "warplet-connect.vercel.app",
      "vitamin-ion-surf-syracuse.trycloudflare.com",
      "warplet-connect.fun",
    ],
  },
});
