import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
// A port of its own so a real backend running on 8000 does not interfere.
const API_PORT = 8100;
const API_URL = `http://localhost:${API_PORT}`;

/**
 * End-to-end configuration.
 *
 * The backend is **not** started: every call to it is intercepted in the test. That is
 * deliberate — this suite exists to prove the *iframe* contract (PRD §7.3), and pinning it to a
 * live API and a live model would make it slow, costly and flaky for reasons unrelated to what
 * it checks. The backend has its own 241 tests.
 *
 * It runs against a production build for the same reason the build is in the gate: the widget's
 * CSP differs between dev and production, and it is the production one that must not break
 * hydration.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: [
    {
      // Serves only `/embed/config`, which the Next middleware fetches server-side and
      // `page.route` therefore cannot reach. See `e2e/config-server.mjs`.
      command: "node e2e/config-server.mjs",
      url: `${API_URL}/healthz`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { FAKE_BACKEND_PORT: String(API_PORT), E2E_HOST_ORIGIN: BASE_URL },
    },
    {
      command: `pnpm build && pnpm start --port ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: API_URL,
        NEXT_PUBLIC_APP_BASE_URL: BASE_URL,
        NEXT_PUBLIC_DEMO_EMBED_KEY: "pk_live_e2e",
        API_INTERNAL_BASE_URL: API_URL,
      },
    },
  ],
});
