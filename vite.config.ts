import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [
          /^\/~oauth/,
          // Never SPA-fallback Supabase function URLs or other API calls
          /^\/functions\//,
          /^\/rest\//,
          /^\/auth\/v1\//,
        ],
        runtimeCaching: [
          {
            // Supabase Edge Functions — these are POSTs that mutate state
            // (clock-in, pin-login). They must NEVER be served from cache.
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/v1\/.*/i,
            handler: "NetworkOnly",
            options: {
              cacheName: "supabase-functions",
            },
          },
          {
            // Auth endpoints — also NetworkOnly. Stale sessions = wrong user.
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/i,
            handler: "NetworkOnly",
            options: {
              cacheName: "supabase-auth",
            },
          },
          {
            // Everything else on Supabase (REST queries, storage) — fine to
            // cache briefly so the app feels snappy on flaky tablet wifi.
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "maskable-icon-512.png"],
      manifest: {
        name: "Wetzels of Augusta",
        short_name: "Wetzels",
        description: "Operations platform for Wetzel's Pretzels of Augusta",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1a365d",
        orientation: "portrait",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/maskable-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Only split out Supabase. It's the single largest vendor (~165 KB
        // minified) and changes rarely → good long-term cache target.
        //
        // We deliberately do NOT split React/Radix/recharts here: doing so
        // pulls shared transitive helpers into crossing chunks and triggers
        // Rollup's "Circular chunk" warning. Lazy-loaded routes + Vite's
        // default chunk graph handle the rest.
        manualChunks(id) {
          if (id.includes("/@supabase/")) return "supabase-vendor";
          return undefined;
        },
      },
    },
  },
}));
