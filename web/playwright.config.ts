import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "web-desktop", testMatch: "web.spec.ts", use: { ...devices["Desktop Chrome"] } },
    { name: "web-phone", testMatch: "responsive.spec.ts", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
    { name: "expo-web", testMatch: "mobile.spec.ts", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", baseURL: "http://127.0.0.1:3101" } },
  ],
  webServer: [
    {
      command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      timeout: 180_000,
      env: { API_URL: "http://127.0.0.1:18080", NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100", NEXT_PUBLIC_API_URL: "" },
    },
    {
      command: "npm --prefix ../mobile run export:web && node e2e/serve-mobile.mjs",
      url: "http://127.0.0.1:3101",
      timeout: 180_000,
    },
  ],
});
