import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    // Use repository sub-path for GitHub Pages when building for production.
    // This makes the app work at https://deadronos.github.io/NanoBotsIdle/
    base: process.env.NODE_ENV === "production" ? "/NanoBotsIdle/" : "/",
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
  };
});
