import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Node globals available in vite.config (no @ts-expect-error, see issue #6/#16).
declare const process: { env: Record<string, string | undefined> };

const host = process.env.TAURI_DEV_HOST;
const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    ...(isTauri
      ? []
      : [
          VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["pwa-192x192.png", "pwa-512x512.png"],
            manifest: {
              name: "Shelfly - PDF Reader",
              short_name: "Shelfly",
              description: "Leitor de PDF offline com progresso e bookmarks",
              categories: ["productivity", "books"],
              lang: "pt-BR",
              theme_color: "#ffffff",
              background_color: "#f8fafc",
              display: "standalone",
              scope: "/",
              start_url: "/",
              orientation: "any",
              icons: [
                {
                  src: "pwa-192x192.png",
                  sizes: "192x192",
                  type: "image/png",
                  purpose: "any",
                },
                {
                  src: "pwa-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  purpose: "maskable",
                },
              ],
              shortcuts: [
                {
                  name: "Open Library",
                  url: "/",
                  description: "Open your book library",
                },
              ],
              screenshots: [
                {
                  src: "pwa-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
                  form_factor: "wide",
                  label: "Library view",
                },
              ],
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
              navigateFallback: "index.html",
              runtimeCaching: [
                {
                  urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                  handler: "CacheFirst",
                  options: {
                    cacheName: "google-fonts-cache",
                    expiration: {
                      maxEntries: 10,
                      maxAgeSeconds: 60 * 60 * 24 * 365,
                    },
                  },
                },
                {
                  urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                  handler: "CacheFirst",
                  options: {
                    cacheName: "gstatic-fonts-cache",
                    expiration: {
                      maxEntries: 10,
                      maxAgeSeconds: 60 * 60 * 24 * 365,
                    },
                  },
                },
                {
                  urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
                  handler: "CacheFirst",
                  options: {
                    cacheName: "jsdelivr-cache",
                    expiration: {
                      maxEntries: 20,
                      maxAgeSeconds: 60 * 60 * 24 * 30,
                    },
                  },
                },
              ],
            },
          }),
        ]),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
