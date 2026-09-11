import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Load Supabase keys (for cleanup) from .env.local, then allow .env to add the
// E2E_* test-account credentials without committing them.
dotenv.config({ path: ".env.local" });
dotenv.config();

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // These specs sign in and write real rows to Supabase, so run them serially
  // and never in parallel — keeps created data (and cleanup) predictable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Logs in once and saves the session; every spec reuses it.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "e2e",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/state.json",
      },
    },
  ],
  // Reuses your running `npm run dev` (port 3000) if present, otherwise starts it.
  // The dev server runs with NODE_ENV=development, which is what exposes the
  // "Fill mock data" / "Generate Mock Data" shortcuts the specs rely on.
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
