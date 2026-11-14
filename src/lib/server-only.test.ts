import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
  "src/lib/supabase/admin.ts",
  "src/lib/titles/store.ts",
  "src/lib/titles/ensureTitle.ts",
];

describe("server-only modules", () => {
  it.each(SERVER_ONLY_MODULES)("%s imports server-only", (file) => {
    // Paths are relative to the project root, which is where tests run from.
    expect(readFileSync(file, "utf8")).toMatch(/^import "server-only";$/m);
  });
});

/** Every .ts / .tsx file under a folder, tests excluded. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    // Windows joins paths with "\"; use "/" everywhere so the comparisons
    // below read the same on any machine.
    const path = join(dir, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

// The secret-key client bypasses every database rule, so the fewer places
// that can reach it, the smaller the area that has to be got exactly right
// (design section 4.2). Adding a second user of it should be a deliberate
// decision, which means changing this test.
describe("the secret-key client", () => {
  it("is imported by the titles store and nothing else", () => {
    const importers = sourceFiles("src").filter((file) =>
      readFileSync(file, "utf8").includes("@/lib/supabase/admin"),
    );
    expect(importers).toEqual(["src/lib/titles/store.ts"]);
  });

  it("is the only reader of the secret key", () => {
    const readers = sourceFiles("src").filter(
      (file) =>
        file !== "src/lib/env.server.ts" &&
        /getSupabaseSecretKey|SUPABASE_SECRET_KEY/.test(
          readFileSync(file, "utf8"),
        ),
    );
    expect(readers).toEqual(["src/lib/supabase/admin.ts"]);
  });
});
