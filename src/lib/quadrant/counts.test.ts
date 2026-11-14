import { describe, expect, it } from "vitest";
import { countByPlacement } from "@/lib/quadrant/counts";
import { PLACEMENTS, type Point } from "@/lib/quadrant/types";

/** Add up every count in a result. */
const total = (counts: Record<string, number>) =>
  Object.values(counts).reduce((sum, n) => sum + n, 0);

describe("countByPlacement", () => {
  // The filter chips always show all thirteen, greyed out when empty (R34),
  // so every placement must be present even with nothing to count.
  it("returns all thirteen placements at 0 for an empty list", () => {
    const counts = countByPlacement([]);
    expect(Object.keys(counts).sort()).toEqual([...PLACEMENTS].sort());
    expect(total(counts)).toBe(0);
  });

  it("counts each point under its one placement", () => {
    const points: Point[] = [
      { quality: 9, enjoyment: 9 }, // masterpieces
      { quality: 8, enjoyment: 10 }, // masterpieces
      { quality: 6, enjoyment: 9 }, // worth-watching
      { quality: 1, enjoyment: 9 }, // guilty-pleasures
      { quality: 8, enjoyment: 5 }, // good
      { quality: 5, enjoyment: 5 }, // on-the-fence
      { quality: 5, enjoyment: 5 }, // on-the-fence
    ];
    expect(countByPlacement(points)).toEqual({
      masterpieces: 2,
      "guilty-pleasures": 1,
      "serious-watches": 0,
      "dumpster-fires": 0,
      "worth-watching": 1,
      "cheap-thrills": 0,
      respectable: 0,
      "not-worth-watching": 0,
      good: 1,
      bad: 0,
      enjoyable: 0,
      "not-enjoyable": 0,
      "on-the-fence": 2,
    });
  });

  // R34: the counts must always add up to the number of films.
  it("always adds up to the number of points", () => {
    const everyRating: Point[] = [];
    for (let quality = 0; quality <= 10; quality++) {
      for (let enjoyment = 0; enjoyment <= 10; enjoyment++) {
        everyRating.push({ quality, enjoyment });
      }
    }
    const counts = countByPlacement(everyRating);
    expect(total(counts)).toBe(121);
    expect(counts.masterpieces).toBe(9);
    expect(counts["worth-watching"]).toBe(16);
    expect(counts.good).toBe(5);
    expect(counts["on-the-fence"]).toBe(1);
  });

  it("counts group averages by the same rule", () => {
    const counts = countByPlacement([
      { quality: 7.5, enjoyment: 7.5 },
      { quality: 7.4, enjoyment: 7.5 },
    ]);
    expect(counts.masterpieces).toBe(1);
    expect(counts["worth-watching"]).toBe(1);
  });
});
