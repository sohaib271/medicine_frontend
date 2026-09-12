import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://localhost:5175",
    channel: "msedge",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node ../medicine_backend/scripts/test-server.cjs",
      port: 3101,
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: "node scripts/browser-dev.mjs",
      port: 5175,
      env: { API_PROXY: "http://127.0.0.1:3101" },
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
});
