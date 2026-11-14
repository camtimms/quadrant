import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The access-control tests talk to a real Supabase project, so they need real
// settings. process.loadEnvFile (built into Node) reads KEY=value lines into
// process.env. Both files are git-ignored.
process.loadEnvFile(".env.local");
process.loadEnvFile(".env.test.local");

/**
 * Config for the access-control ("RLS") tests: `npm run test:rls`.
 *
 * These are kept apart from the unit tests (`npm test`) because they are a
 * different kind of test: they need the network, a real database and a secret
 * key, and they take seconds rather than milliseconds. Unit tests must stay
 * runnable anywhere, instantly, with no setup.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/rls/**/*.test.ts"],
    environment: "node",
    // One file at a time: the tests share one database, and two files
    // changing the invite list at once would trip each other up.
    fileParallelism: false,
    // Network round trips are slow compared with pure functions.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
