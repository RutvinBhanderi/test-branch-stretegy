import { defineConfig, devices } from "@playwright/test";

/**
 * Thin E2E layer per TDD section 4.1 - only the critical user journeys
 * (auth, receipt upload -> points credited, wallet pass issuance), run against
 * a preview deployment on merges to develop/staging, not on every PR.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
