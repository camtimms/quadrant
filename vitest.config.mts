import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Teaches Vitest to read JSX, so React components can be tested.
  plugins: [react()],
  resolve: {
    // Mirror the "@/..." import alias from tsconfig.json so tests can import
    // code the same way the app does.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The "server-only" package throws when imported anywhere except a
      // Next.js server build; that is how it keeps secrets out of browser
      // code. Unit tests are neither, so point it at the package's own empty
      // file. The real guard still applies in `next build`.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    // Unit tests live next to the code they test. Access-control and
    // end-to-end tests arrive later in tests/ with their own configs.
    include: ["src/**/*.test.{ts,tsx}"],
    // Plain Node by default: fast, and right for pure functions. A component
    // test needs a pretend browser, and asks for one by starting with the
    // comment  // @vitest-environment jsdom
    environment: "node",
  },
});
