import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every module that handles a secret, or acts with a member's session, must
 * start by importing "server-only". That import makes `next build` fail if
 * the file is ever pulled into browser code, where its secrets would be sent
 * to every visitor (design section 11).
 *
 * This test only checks that the guard has not been deleted. Add a file to
 * the list when it starts reading a secret.
 */
const SERVER_ONLY_MODULES = [
  "src/lib/env.server.ts",
  "src/lib/tmdb/client.ts",
  "src/lib/supabase/server.ts",
];

describe("server-only modules", () => {
  it.each(SERVER_ONLY_MODULES)("%s imports server-only", (file) => {
    // Paths are relative to the project root, which is where tests run from.
    expect(readFileSync(file, "utf8")).toMatch(/^import "server-only";$/m);
  });
});
