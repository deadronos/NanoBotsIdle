/// <reference types="vitest" />

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["**/*.d.ts", "src/test/**", "dist/**", "coverage/**", "node_modules/**"],
    },
  },
});
