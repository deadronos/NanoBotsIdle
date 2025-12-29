import { defineConfig } from "@playwright/test";

const headless = process.env.PERF_HEADLESS !== "false";
const launchArgs = headless ? ["--use-angle=swiftshader", "--ignore-gpu-blocklist"] : [];

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless,
    launchOptions: {
      args: launchArgs,
    },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
