import { describe, expect, it } from "vitest";
import {
  describeSpread,
  MIN_RATINGS_FOR_SPREAD,
  normalCurve,
  spreadOf,
} from "@/lib/quadrant/spread";

// R73, R74 (design 21.1): how spread out a group's scores are.

describe("spreadOf", () => {
  it("is nothing for no scores", () => {
    expect(spreadOf([])).toBeNull();
  });

  it("gives the mean and the standard deviation", () => {
    // A textbook set: mean 5, deviations -3 -1 -1 -1 0 0 2 4, squares sum
    // 32, over n = 8 gives 4, so the standard deviation is exactly 2.
    expect(spreadOf([2, 4, 4, 4, 5, 5, 7, 9])).toEqual({ mean: 5, sd: 2 });
  });

  // Over n, not n - 1: the curves describe these members, not a sample of
  // some wider audience (design 21.1).
  it("divides by the number of scores", () => {
    const { sd } = spreadOf([0, 10])!;
    expect(sd).toBe(5); // over n - 1 it would be about 7.07
  });

  it("is zero when everyone agrees", () => {
    expect(spreadOf([7, 7, 7, 7, 7])).toEqual({ mean: 7, sd: 0 });
  });

  it("does not care about order", () => {
    expect(spreadOf([9, 2, 5, 4, 7, 4, 5, 4])).toEqual(
      spreadOf([2, 4, 4, 4, 5, 5, 7, 9]),
    );
  });
});

describe("MIN_RATINGS_FOR_SPREAD", () => {
  // E55, the owner's choice: below five a spread is mostly noise.
  it("is five", () => {
    expect(MIN_RATINGS_FOR_SPREAD).toBe(5);
  });
});

describe("normalCurve", () => {
  const curve = normalCurve(6, 1.5);

  it("runs across the whole 0 to 10 scale", () => {
    expect(curve[0].x).toBe(0);
    expect(curve[curve.length - 1].x).toBe(10);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].x).toBeGreaterThan(curve[i - 1].x);
    }
  });

  it("peaks at the mean, at height 1", () => {
    const peak = curve.reduce((best, point) =>
      point.y > best.y ? point : best,
    );
    expect(peak.x).toBeCloseTo(6, 0);
    expect(normalCurve(5, 2).find((p) => p.x === 5)?.y).toBe(1);
    for (const point of curve) expect(point.y).toBeLessThanOrEqual(1);
  });

  it("is symmetrical about the mean", () => {
    const at = (x: number) =>
      normalCurve(5, 2).find((point) => Math.abs(point.x - x) < 1e-9)!.y;
    expect(at(3)).toBeCloseTo(at(7), 10);
  });

  // About 61% of the peak height one standard deviation out.
  it("has the shape of a normal distribution", () => {
    const at = (x: number) =>
      normalCurve(5, 2).find((point) => Math.abs(point.x - x) < 1e-9)!.y;
    expect(at(7)).toBeCloseTo(Math.exp(-0.5), 10);
  });
});

describe("describeSpread (R74)", () => {
  it("says the average and where most scores lie", () => {
    expect(describeSpread("Quality", [2, 4, 4, 4, 5, 5, 7, 9])).toBe(
      "Quality: average 5, most scores between 3 and 7",
    );
  });

  it("rounds to one decimal place", () => {
    // mean 6.4, sd ≈ 1.625: 4.775 → 4.8 and 8.025 → 8
    expect(describeSpread("Enjoyment", [4, 6, 6, 7, 9])).toBe(
      "Enjoyment: average 6.4, most scores between 4.8 and 8",
    );
  });

  it("keeps the range within 0 to 10", () => {
    // mean 8, sd 4: 4 to 12, kept to 10
    expect(describeSpread("Quality", [0, 10, 10, 10, 10])).toBe(
      "Quality: average 8, most scores between 4 and 10",
    );
    // mean 2, sd 4: -2 to 6, kept to 0
    expect(describeSpread("Quality", [0, 0, 0, 0, 10])).toBe(
      "Quality: average 2, most scores between 0 and 6",
    );
  });

  // E56: no spread to draw, so say it plainly.
  it("says so when everyone gave the same score", () => {
    expect(describeSpread("Quality", [7, 7, 7, 7, 7])).toBe(
      "Everyone gave Quality 7",
    );
  });
});
