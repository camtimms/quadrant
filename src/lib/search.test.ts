import { describe, expect, it } from "vitest";
import {
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_QUERY_MIN_LENGTH,
  parseSearchQuery,
} from "@/lib/search";

describe("parseSearchQuery", () => {
  it("accepts a query of two characters or more (R9)", () => {
    expect(SEARCH_QUERY_MIN_LENGTH).toBe(2);
    expect(parseSearchQuery("up")).toBe("up");
    expect(parseSearchQuery("commando")).toBe("commando");
  });

  it("trims spaces before counting", () => {
    expect(parseSearchQuery("  heat  ")).toBe("heat");
    expect(parseSearchQuery(" a ")).toBeNull();
  });

  it.each([[null], [undefined], [""], ["   "], ["a"]])(
    "rejects %j as too short",
    (value) => {
      expect(parseSearchQuery(value)).toBeNull();
    },
  );

  // One emoji is one character to a person, though JavaScript's .length
  // counts it as two.
  it("counts whole characters", () => {
    expect(parseSearchQuery("🎬")).toBeNull();
    expect(parseSearchQuery("🎬🎬")).toBe("🎬🎬");
  });

  it("rejects an absurdly long query", () => {
    const longest = "a".repeat(SEARCH_QUERY_MAX_LENGTH);
    expect(parseSearchQuery(longest)).toBe(longest);
    expect(parseSearchQuery(longest + "a")).toBeNull();
  });
});
