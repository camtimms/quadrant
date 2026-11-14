import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the "@/..." import alias from tsconfig.json so tests can import
    // code the same way the app does.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Unit tests live next to the code they test. Access-control and
    // end-to-end tests arrive later in tests/ with their own configs.
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
