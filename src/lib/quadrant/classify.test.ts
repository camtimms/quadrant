import { describe, expect, it } from "vitest";
import {
  classify,
  EXTREME_HIGH,
  EXTREME_LOW,
  levelOf,
  MIDPOINT,
} from "@/lib/quadrant/classify";
import { PLACEMENT_LABELS, SCALE_END_LABELS } from "@/lib/quadrant/labels";
import { PLACEMENTS, type Placement } from "@/lib/quadrant/types";

describe("levelOf", () => {
  it("splits each scale into four equal bands around the midpoint", () => {
    expect(EXTREME_LOW).toBe(2.5);
    expect(MIDPOINT).toBe(5);
    expect(EXTREME_HIGH).toBe(7.5);
  });

  // R24: above/below/exactly 5, plus "extreme" at 7.5 or more and 2.5 or less.
  // The values either side of each cut-off are the ones most likely to break.
  it.each([
    [0, "very-low"],
    [2, "very-low"],
    [2.4, "very-low"],
    [2.5, "very-low"], // the cut-off itself is inclusive (E24)
    [2.6, "low"],
    [3, "low"],
    [4.9, "low"],
    [5, "neutral"],
    [5.1, "high"],
    [7, "high"],
    [7.4, "high"],
    [7.5, "very-high"], // inclusive (E24)
    [7.6, "very-high"],
    [8, "very-high"],
    [10, "very-high"],
  ] as const)("treats %s as %s", (value, expected) => {
    expect(levelOf(value)).toBe(expected);
  });
});

describe("classify", () => {
  // R25: an outer corner needs BOTH scores to be extreme.
  it.each([
    [{ quality: 9, enjoyment: 9 }, "masterpieces"],
    [{ quality: 8, enjoyment: 8 }, "masterpieces"],
    [{ quality: 1, enjoyment: 9 }, "guilty-pleasures"],
    [{ quality: 9, enjoyment: 1 }, "serious-watches"],
    [{ quality: 2, enjoyment: 2 }, "dumpster-fires"],
    [{ quality: 0, enjoyment: 0 }, "dumpster-fires"],
  ] as const)("puts %o in the corner %s", (point, expected) => {
    expect(classify(point)).toBe(expected);
  });

  // R52: off the midpoint but not in a corner.
  it.each([
    [{ quality: 6, enjoyment: 6 }, "worth-watching"],
    [{ quality: 7, enjoyment: 7 }, "worth-watching"],
    [{ quality: 4, enjoyment: 6 }, "cheap-thrills"],
    [{ quality: 3, enjoyment: 7 }, "cheap-thrills"],
    [{ quality: 6, enjoyment: 4 }, "respectable"],
    [{ quality: 7, enjoyment: 3 }, "respectable"],
    [{ quality: 4, enjoyment: 4 }, "not-worth-watching"],
    [{ quality: 3, enjoyment: 3 }, "not-worth-watching"],
  ] as const)("puts %o in the inner band %s", (point, expected) => {
    expect(classify(point)).toBe(expected);
  });

  // E25: one extreme score is not enough to reach a corner.
  it.each([
    [{ quality: 6, enjoyment: 9 }, "worth-watching"],
    [{ quality: 9, enjoyment: 6 }, "worth-watching"],
    [{ quality: 1, enjoyment: 6 }, "cheap-thrills"],
    [{ quality: 4, enjoyment: 10 }, "cheap-thrills"],
    [{ quality: 10, enjoyment: 4 }, "respectable"],
    [{ quality: 6, enjoyment: 0 }, "respectable"],
    [{ quality: 0, enjoyment: 4 }, "not-worth-watching"],
    [{ quality: 4, enjoyment: 0 }, "not-worth-watching"],
  ] as const)("keeps %o out of the corner (%s)", (point, expected) => {
    expect(classify(point)).toBe(expected);
  });

  // R26: exactly one score at 5, so the other score alone decides.
  it.each([
    [{ quality: 6, enjoyment: 5 }, "good"],
    [{ quality: 4, enjoyment: 5 }, "bad"],
    [{ quality: 5, enjoyment: 6 }, "enjoyable"],
    [{ quality: 5, enjoyment: 4 }, "not-enjoyable"],
  ] as const)("gives %o the single-scale label %s", (point, expected) => {
    expect(classify(point)).toBe(expected);
  });

  // E26: a 5 on one scale gives the plain label however extreme the other is.
  it.each([
    [{ quality: 10, enjoyment: 5 }, "good"],
    [{ quality: 0, enjoyment: 5 }, "bad"],
    [{ quality: 5, enjoyment: 10 }, "enjoyable"],
    [{ quality: 5, enjoyment: 0 }, "not-enjoyable"],
  ] as const)("keeps the plain label for %o (%s)", (point, expected) => {
    expect(classify(point)).toBe(expected);
  });

  // R50: only a true 5/5 is on the fence.
  it("puts 5/5 on the fence", () => {
    expect(classify({ quality: 5, enjoyment: 5 })).toBe("on-the-fence");
  });

  // Group averages have one decimal place (R27) and use the same rule. This
  // is the only place the half-point cut-offs can actually be hit (E24).
  it.each([
    [{ quality: 7.5, enjoyment: 7.5 }, "masterpieces"],
    [{ quality: 7.4, enjoyment: 7.5 }, "worth-watching"],
    [{ quality: 7.5, enjoyment: 7.4 }, "worth-watching"],
    [{ quality: 2.5, enjoyment: 2.5 }, "dumpster-fires"],
    [{ quality: 2.6, enjoyment: 2.5 }, "not-worth-watching"],
    [{ quality: 2.5, enjoyment: 7.5 }, "guilty-pleasures"],
    [{ quality: 2.6, enjoyment: 7.5 }, "cheap-thrills"],
    [{ quality: 7.5, enjoyment: 2.5 }, "serious-watches"],
    [{ quality: 7.5, enjoyment: 2.6 }, "respectable"],
    [{ quality: 5.1, enjoyment: 4.9 }, "respectable"],
    [{ quality: 5, enjoyment: 7.2 }, "enjoyable"],
    [{ quality: 4.9, enjoyment: 5 }, "bad"],
  ] as const)("classifies the average %o as %s", (point, expected) => {
    expect(classify(point)).toBe(expected);
  });

  // Exhaustive check of every rating a member can give. The expected value is
  // worked out here with plain whole-number comparisons, deliberately written
  // differently from classify() so a mistake in one does not hide in the other.
  it("classifies all 121 whole-number ratings correctly", () => {
    const counts: Partial<Record<Placement, number>> = {};

    for (let quality = 0; quality <= 10; quality++) {
      for (let enjoyment = 0; enjoyment <= 10; enjoyment++) {
        const qTop = quality >= 8;
        const qBottom = quality <= 2;
        const eTop = enjoyment >= 8;
        const eBottom = enjoyment <= 2;

        let expected: Placement;
        if (quality === 5 && enjoyment === 5) expected = "on-the-fence";
        else if (enjoyment === 5) expected = quality > 5 ? "good" : "bad";
        else if (quality === 5)
          expected = enjoyment > 5 ? "enjoyable" : "not-enjoyable";
        else if (qTop && eTop) expected = "masterpieces";
        else if (qBottom && eTop) expected = "guilty-pleasures";
        else if (qTop && eBottom) expected = "serious-watches";
        else if (qBottom && eBottom) expected = "dumpster-fires";
        else if (quality > 5)
          expected = enjoyment > 5 ? "worth-watching" : "respectable";
        else expected = enjoyment > 5 ? "cheap-thrills" : "not-worth-watching";

        const actual = classify({ quality, enjoyment });
        expect(actual, `quality ${quality}, enjoyment ${enjoyment}`).toBe(
          expected,
        );
        counts[actual] = (counts[actual] ?? 0) + 1;
      }
    }

    // 36 in corners, 64 in inner bands, 20 on a line, 1 on the fence = 121.
    expect(counts).toEqual({
      masterpieces: 9,
      "guilty-pleasures": 9,
      "serious-watches": 9,
      "dumpster-fires": 9,
      "worth-watching": 16,
      "cheap-thrills": 16,
      respectable: 16,
      "not-worth-watching": 16,
      good: 5,
      bad: 5,
      enjoyable: 5,
      "not-enjoyable": 5,
      "on-the-fence": 1,
    });
  });
});

describe("labels", () => {
  // NFR22: every placement has exactly one display name, defined in one place.
  it("has thirteen placements, each with a non-empty label", () => {
    expect(PLACEMENTS).toHaveLength(13);
    expect(new Set(PLACEMENTS).size).toBe(13);
    for (const placement of PLACEMENTS) {
      expect(PLACEMENT_LABELS[placement].length).toBeGreaterThan(0);
    }
  });

  it("uses the agreed display names", () => {
    expect(PLACEMENT_LABELS).toEqual({
      masterpieces: "Masterpieces",
      "guilty-pleasures": "Guilty Pleasures",
      "serious-watches": "Serious Watches",
      "dumpster-fires": "Dumpster Fires",
      "worth-watching": "Worth Watching",
      "cheap-thrills": "Cheap Thrills",
      respectable: "Respectable",
      "not-worth-watching": "Not Worth Watching",
      good: "Good",
      bad: "Bad",
      enjoyable: "Enjoyable",
      "not-enjoyable": "Not Enjoyable",
      "on-the-fence": "On the fence",
    });
  });

  // R49: the slider ends reuse the single-scale labels, so renaming one
  // renames it everywhere.
  it("labels the ends of each scale with the single-scale labels", () => {
    expect(SCALE_END_LABELS.quality).toEqual({
      low: PLACEMENT_LABELS.bad,
      high: PLACEMENT_LABELS.good,
    });
    expect(SCALE_END_LABELS.enjoyment).toEqual({
      low: PLACEMENT_LABELS["not-enjoyable"],
      high: PLACEMENT_LABELS.enjoyable,
    });
  });
});
