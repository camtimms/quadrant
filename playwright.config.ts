import { defineConfig, devices } from "@playwright/test";
import { storageStatePath } from "./tests/e2e/support/members";

// The tests set the scene with the dev project's secret key, which lives in
// these two git-ignored files (see .env.example). process.loadEnvFile is
// built into Node. Playwright loads the test files after this config, so
// testData.ts finds the settings already in place.
process.loadEnvFile(".env.local");
process.loadEnvFile(".env.test.local");

/**
 * Its own port, so the tests never collide with a `npm run dev` already on
 * 3000.
 */
const PORT = 3111;
const baseURL = `http://localhost:${PORT}`;

/**
 * End-to-end tests: `npm run test:e2e` (design section 10).
 *
 * They drive a real browser against a production build of the app, talking
 * to the real dev Supabase project and the real TMDB. They are slow (a build
 * plus about a minute of tests) and are run before a deploy, not after every
 * task.
 */
export default defineConfig({
  testDir: "tests/e2e",
  // One test at a time. The tests share one database and two members; run
  // side by side, one test's rating would show up in another's page.
  workers: 1,
  fullyParallel: false,
  // TMDB and Supabase are on the internet, so allow for a slow answer.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // A forgotten test.only must not quietly skip the rest before a deploy.
  forbidOnly: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    // Kept only for a failed test: a step-by-step record to open with
    // `npx playwright show-trace`.
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      teardown: "cleanup",
    },
    { name: "cleanup", testMatch: /cleanup\.teardown\.ts/ },
    {
      // A phone, because that is how the app is mostly used. Pixel 7 runs
      // in Chromium, the one browser installed for these tests.
      name: "phone",
      use: {
        ...devices["Pixel 7"],
        storageState: storageStatePath("alice"),
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // A production build rather than `next dev`: a second dev server in the
    // same folder refuses to start, and the build is what gets deployed.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    // A build takes a minute or two.
    timeout: 300_000,
    // Reuse one already running on this port (say, from the last run).
    reuseExistingServer: true,
  },
});
