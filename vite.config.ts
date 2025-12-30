import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  const isProd = process.env.NODE_ENV === "production";

  return {
    // Use repository sub-path for GitHub Pages when building for production.
    // This makes the app work at https://deadronos.github.io/NanoBotsIdle/
    base: isProd ? "/NanoBotsIdle/" : "/",
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [tailwindcss(), react()],
    test: {
      include: ["tests/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Strip debug logs in production builds
    esbuild: {
      drop: isProd ? ["console", "debugger"] : undefined,
      // Keep error logs even in production
      pure: isProd ? ["console.log", "console.debug", "console.info", "console.warn"] : undefined,
    },
    build: {
      // Improve dead-code elimination
      minify: "esbuild",
      target: "es2022",
    },
  };
});
