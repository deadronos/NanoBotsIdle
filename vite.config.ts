import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, type Plugin } from "vite";

// Plugin to strip console logs in production (except console.error)
function stripConsolePlugin(): Plugin {
  return {
    name: "strip-console",
    enforce: "pre",
    transform(code, id) {
      if (process.env.NODE_ENV === "production" && (id.endsWith(".ts") || id.endsWith(".tsx"))) {
        // Strip console.debug, console.info, console.warn, console.log
        // Keep console.error for critical error reporting
        return {
          code: code
            .replace(/\bconsole\.(debug|info|warn|log)\s*\([^)]*\)\s*;?/g, "/* stripped */")
            .replace(/\bconsole\.groupCollapsed\s*\([^)]*\)\s*;?/g, "/* stripped */")
            .replace(/\bconsole\.groupEnd\s*\(\s*\)\s*;?/g, "/* stripped */"),
          map: null,
        };
      }
      return null;
    },
  };
}

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
    plugins: [tailwindcss(), react(), ...(isProd ? [stripConsolePlugin()] : [])],
    test: {
      include: ["tests/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Improve dead-code elimination
      minify: "esbuild" as const,
      target: "es2022",
    },
  };
});
