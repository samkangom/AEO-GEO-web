import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Load .env.local the same way Next does, so e2e uses the engineer's Supabase.
loadEnvConfig(process.cwd());

const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = `http://localhost:${PORT}`;

/**
 * e2e/public.spec.ts   — runs anywhere (no database needed).
 * e2e/journey.spec.ts  — full user journey; needs Supabase (local via
 *                        `npx supabase start`) and E2E_FULL=1.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  // The dev server compiles each route on first visit (several seconds when cold).
  // e2e must use `next dev`: the fixture-site escape hatch is disabled in production builds.
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run fixtures",
      url: "http://127.0.0.1:4001",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run dev -- -p ${PORT}`,
      url: baseURL,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        // Lets the app audit the local fixture sites. Ignored in production builds.
        AUDIT_ALLOW_PRIVATE_HOSTS: "1",
        // `MOCK_AI_RESPONSES=1 npm run test:e2e` runs the app with simulated AI answers.
        MOCK_AI_RESPONSES: process.env.MOCK_AI_RESPONSES ?? "",
        // Placeholders so public pages render without a database.
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder",
      },
    },
  ],
});
