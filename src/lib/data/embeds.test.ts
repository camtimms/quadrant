import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RATING_AUTHOR } from "@/lib/data/embeds";

// Design 20.4. Since review_likes (migration 6), ratings and profiles are
// linked two ways: directly (the rating's author) and through the likes.
// Supabase refuses a nested "profiles (...)" under ratings that does not
// say which link it means, so every such query must name it.

describe("RATING_AUTHOR", () => {
  it("names the rating's own link to its author", () => {
    expect(RATING_AUTHOR).toBe(
      "profiles!ratings_user_id_fkey (display_name, avatar_url)",
    );
  });
});

describe("queries in src/lib/data", () => {
  const files = readdirSync("src/lib/data")
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => ({
      name,
      text: readFileSync(`src/lib/data/${name}`, "utf8"),
    }));

  it("finds the loaders to check", () => {
    expect(files.map((file) => file.name)).toEqual(
      expect.arrayContaining(["allRatings.ts", "filmPage.ts"]),
    );
  });

  // In a query string a nested table is written "name (columns)". An
  // unnamed "profiles (" anywhere but a comment is the ambiguous form.
  it("never nests profiles without naming the link", () => {
    const unnamed = files.flatMap(({ name, text }) =>
      text
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\*)/.test(line))
        .filter((line) => /["`,\s]profiles\s*\(/.test(line))
        .map((line) => `${name}: ${line.trim()}`),
    );
    expect(unnamed).toEqual([]);
  });
});
