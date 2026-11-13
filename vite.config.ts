import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["recocare.svg"],
      manifest: {
        name: "RECOCARE Healthcare Marketplace",
        short_name: "RECOCARE",
        description: "Find recovery and home-care services in South Bangalore.",
        theme_color: "#1457c5",
        background_color: "#f5f8ff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/recocare.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
        ]
      }
    })
  ]
});
