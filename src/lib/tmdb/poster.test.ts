import { describe, expect, it } from "vitest";
import { POSTER_SIZES, posterUrl } from "@/lib/tmdb/poster";
import configuration from "./fixtures/configuration.json";

describe("posterUrl", () => {
  it("builds the image address from a poster path and a size", () => {
    expect(posterUrl("/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg", "list")).toBe(
      "https://image.tmdb.org/t/p/w185/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg",
    );
    expect(posterUrl("/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg", "page")).toBe(
      "https://image.tmdb.org/t/p/w342/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg",
    );
  });

  it("returns null when the film has no poster, so the caller shows a placeholder (R10)", () => {
    expect(posterUrl(null, "list")).toBeNull();
  });

  // V2: the size names are not free text. TMDB only serves the sizes listed
  // by its /configuration endpoint, so check ours against the real list.
  it("only uses sizes and a base address that TMDB really offers", () => {
    for (const size of Object.values(POSTER_SIZES)) {
      expect(configuration.images.poster_sizes).toContain(size);
    }
    expect(posterUrl("/x.jpg", "list")).toContain(
      configuration.images.secure_base_url,
    );
  });
});
