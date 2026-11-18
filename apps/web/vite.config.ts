import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PWA_BRAND = {
  name: "Saigon Corner — Staff",
  short_name: "SC Staff",
  description: "Rota, opening hours, and time logs for Saigon Corner staff.",
  theme_color: "#355264",
  background_color: "#f7f0dd",
} as const;

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  const apiUrl = env.BETTER_AUTH_URL ?? "http://localhost:3100";
  const webPort = Number(env.WEB_PORT ?? "5280");

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["logo.png"],
        manifest: {
          ...PWA_BRAND,
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          scope: "/",
          categories: ["business", "productivity"],
          icons: [
            {
              src: "/logo.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/trpc/, /^\/api/, /^\/health/],
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith("/trpc") ||
                url.pathname.startsWith("/api"),
              handler: "NetworkOnly",
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    server: {
      port: webPort,
      proxy: {
        "/trpc": {
          target: apiUrl,
          changeOrigin: true,
        },
        "/api": {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
  };
});