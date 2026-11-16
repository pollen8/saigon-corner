import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  const apiUrl = env.BETTER_AUTH_URL ?? "http://localhost:3100";
  const webPort = Number(env.WEB_PORT ?? "5280");

  return {
    plugins: [react()],
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