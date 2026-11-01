/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(() => ({
  plugins: [react()],
  clearScreen: false,
  // WebView2 on Windows 10+ is Chromium-based and evergreen; this keeps output compatible with older builds.
  build: { target: "chrome105" },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"], setupFiles: ["./src/test/setup.ts"] },
      },
      {
        extends: true,
        test: { name: "integration", environment: "node", include: ["tests/integration/**/*.test.ts"], testTimeout: 30000, fileParallelism: false },
      },
    ],
  },
}));
