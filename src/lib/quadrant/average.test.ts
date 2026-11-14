import { describe, expect, it } from "vitest";
import { groupAverage, roundToOneDecimal } from "@/lib/quadrant/average";
import { classify } from "@/lib/quadrant/classify";
import type { Point } from "@/lib/quadrant/types";

/**
 * Test helper: build `count` whole-number ratings whose quality scores add up
 * to `qualitySum` and whose enjoyment scores add up to `enjoymentSum`.
 * This lets a test ask for an exact mean, e.g. 247 over 50 ratings = 4.94.
 */
function ratingsWithSums(
  count: number,
  qualitySum: number,
  enjoymentSum: number,
): Point[] {
  // Spread a total as evenly as possible: everyone gets the rounded-down
  // share, and the first few get one extra until the total is reached.
  const spread = (sum: number) => {
    const base = Math.floor(sum / count);
    const extra = sum - base * count;
    return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
  };
  const qualities = spread(qualitySum);
  const enjoyments = spread(enjoymentSum);
  return qualities.map((quality, i) => ({ quality, enjoyment: enjoyments[i] }));
}

describe("roundToOneDecimal", () => {
  it.each([
    [5, 5],
    [4.94, 4.9],
    [4.95, 5], // halves round up
    [5.04, 5],
    [5.05, 5.1], // halves round up
    [7.666666, 7.7],
    [0, 0],
    [10, 10],
  ])("rounds %s to %s", (value, expected) => {
    expect(roundToOneDecimal(value)).toBe(expected);
  });
});

describe("groupAverage", () => {
  // A film nobody has rated has no average. null, not 0/0: zero is a real score.
  it("returns null for no ratings", () => {
    expect(groupAverage([])).toBeNull();
  });

  // R45: with one rating, the average is that rating.
  it("returns the rating itself when there is only one", () => {
    expect(groupAverage([{ quality: 3, enjoyment: 9 }])).toEqual({
      quality: 3,
      enjoyment: 9,
    });
  });

  it("averages each scale separately", () => {
    const ratings = [
      { quality: 2, enjoyment: 10 },
      { quality: 4, enjoyment: 8 },
    ];
    expect(groupAverage(ratings)).toEqual({ quality: 3, enjoyment: 9 });
  });

  // R27: each mean is rounded to one decimal place.
  it("rounds each mean to one decimal place", () => {
    const ratings = [
      { quality: 7, enjoyment: 1 },
      { quality: 8, enjoyment: 1 },
      { quality: 8, enjoyment: 2 },
    ];
    // quality 23 / 3 = 7.666..., enjoyment 4 / 3 = 1.333...
    expect(groupAverage(ratings)).toEqual({ quality: 7.7, enjoyment: 1.3 });
  });

  // E14: a score of 0 is a real score and must pull the average down.
  it("counts a score of 0 as 0, not as missing", () => {
    const ratings = [
      { quality: 0, enjoyment: 0 },
      { quality: 10, enjoyment: 10 },
    ];
    expect(groupAverage(ratings)).toEqual({ quality: 5, enjoyment: 5 });
    expect(groupAverage([{ quality: 0, enjoyment: 0 }])).toEqual({
      quality: 0,
      enjoyment: 0,
    });
  });

  // The exact means named in the design's boundary list (section 7).
  it.each([
    [50, 247, 4.9], // 4.94
    [20, 99, 5], //   4.95, the half rounds up
    [50, 252, 5], //  5.04
    [20, 101, 5.1], // 5.05, the half rounds up
  ])(
    "with %i ratings summing to %i, the mean rounds to %s",
    (count, sum, expected) => {
      const average = groupAverage(ratingsWithSums(count, sum, sum));
      expect(average).toEqual({ quality: expected, enjoyment: expected });
    },
  );

  it("never produces more than one decimal place", () => {
    // Thirds, sevenths and so on are where floating-point noise would show up.
    for (let count = 1; count <= 15; count++) {
      for (let sum = 0; sum <= count * 10; sum++) {
        const average = groupAverage(ratingsWithSums(count, sum, sum));
        const tenths = average!.quality * 10;
        expect(Math.abs(tenths - Math.round(tenths))).toBeLessThan(1e-9);
        expect(average!.quality).toBeGreaterThanOrEqual(0);
        expect(average!.quality).toBeLessThanOrEqual(10);
      }
    }
  });

  it("does not change the list it is given", () => {
    const ratings = [
      { quality: 1, enjoyment: 2 },
      { quality: 3, enjoyment: 4 },
    ];
    const copy = structuredClone(ratings);
    groupAverage(ratings);
    expect(ratings).toEqual(copy);
  });
});

// R27: the ROUNDED value is what gets classified, so the number a member
// reads and the label beside it can never contradict each other (E3).
describe("classifying a group average", () => {
  it("treats a mean of 5.04 as exactly 5 (neutral)", () => {
    const average = groupAverage(ratingsWithSums(50, 252, 252));
    expect(classify(average!)).toBe("on-the-fence");
  });

  it("treats a mean of 5.05 as 5.1 (above the midpoint)", () => {
    const average = groupAverage(ratingsWithSums(20, 101, 101));
    expect(classify(average!)).toBe("worth-watching");
  });

  it("treats a mean of 7.45 as 7.5 (extreme) and 7.44 as 7.4 (not)", () => {
    // 149 / 20 = 7.45 and 372 / 50 = 7.44
    expect(classify(groupAverage(ratingsWithSums(20, 149, 149))!)).toBe(
      "masterpieces",
    );
    expect(classify(groupAverage(ratingsWithSums(50, 372, 372))!)).toBe(
      "worth-watching",
    );
  });

  it("uses the same rule as a single rating when one scale averages to 5", () => {
    const ratings = [
      { quality: 4, enjoyment: 8 },
      { quality: 6, enjoyment: 9 },
    ];
    // quality 5.0, enjoyment 8.5
    expect(classify(groupAverage(ratings)!)).toBe("enjoyable");
  });
});
