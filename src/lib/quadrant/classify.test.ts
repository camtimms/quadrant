import { describe, expect, it } from "vitest";
import { classify, levelOf, MIDPOINT } from "@/lib/quadrant/classify";
import { PLACEMENT_LABELS, SCALE_END_LABELS } from "@/lib/quadrant/labels";
import { PLACEMENTS, type Placement } from "@/lib/quadrant/types";

describe("levelOf", () => {
  it("has its midpoint at 5", () => {
    expect(MIDPOINT).toBe(5);
  });

  // R24: above 5 is high, below 5 is low, exactly 5 is neutral.
  it.each([
    [0, "low"],
    [4, "low"],
    [4.9, "low"],
    [5, "neutral"],
    [5.1, "high"],
    [6, "high"],
    [10, "high"],
  ] as const)("treats %s as %s", (value, expected) => {
    expect(levelOf(value)).toBe(expected);
  });
});

describe("classify", () => {
  // R25: the four quadrants.
  it.each([
    [{ quality: 9, enjoyment: 9 }, "masterpieces"],
    [{ quality: 3, enjoyment: 9 }, "guilty-pleasures"],
    [{ quality: 9, enjoyment: 2 }, "serious-watches"],
    [{ quality: 1, enjoyment: 1 }, "not-worth-watching"],
  ] as const)("puts %o in %s", (point, expected) => {
    expect(classify(point)).toBe(expected);
  });

  // R26: exactly one score at 5, so the other score alone decides.
  it.each([
    [{ quality: 8, enjoyment: 5 }, "good"],
    [{ quality: 2, enjoyment: 5 }, "bad"],
    [{ quality: 5, enjoyment: 8 }, "enjoyable"],
    [{ quality: 5, enjoyment: 2 }, "not-enjoyable"],
  ] as const)("gives %o the single-scale label %s", (point, expected) => {
    expect(classify(point)).toBe(expected);
  });

  // R50: only a true 5/5 is on the fence.
  it("puts 5/5 on the fence", () => {
    expect(classify({ quality: 5, enjoyment: 5 })).toBe("on-the-fence");
  });

  it("treats the nearest neighbours of 5 as off the fence", () => {
    expect(classify({ quality: 6, enjoyment: 6 })).toBe("masterpieces");
    expect(classify({ quality: 4, enjoyment: 4 })).toBe("not-worth-watching");
    expect(classify({ quality: 4, enjoyment: 6 })).toBe("guilty-pleasures");
    expect(classify({ quality: 6, enjoyment: 4 })).toBe("serious-watches");
  });

  // Group averages have one decimal place (R27) and use the same rule.
  it("classifies one-decimal averages by the same rule", () => {
    expect(classify({ quality: 5.1, enjoyment: 4.9 })).toBe("serious-watches");
    expect(classify({ quality: 5, enjoyment: 7.2 })).toBe("enjoyable");
    expect(classify({ quality: 4.9, enjoyment: 5 })).toBe("bad");
  });

  // Exhaustive check of every rating a member can give. The expected value is
  // worked out here in the most literal way possible (plain comparisons), on
  // purpose different from how classify() is written, so the two can disagree.
  it("classifies all 121 whole-number ratings correctly", () => {
    const counts: Partial<Record<Placement, number>> = {};

    for (let quality = 0; quality <= 10; quality++) {
      for (let enjoyment = 0; enjoyment <= 10; enjoyment++) {
        let expected: Placement;
        if (quality === 5 && enjoyment === 5) expected = "on-the-fence";
        else if (enjoyment === 5) expected = quality > 5 ? "good" : "bad";
        else if (quality === 5)
          expected = enjoyment > 5 ? "enjoyable" : "not-enjoyable";
        else if (quality > 5)
          expected = enjoyment > 5 ? "masterpieces" : "serious-watches";
        else
          expected = enjoyment > 5 ? "guilty-pleasures" : "not-worth-watching";

        const actual = classify({ quality, enjoyment });
        expect(actual, `quality ${quality}, enjoyment ${enjoyment}`).toBe(
          expected,
        );
        counts[actual] = (counts[actual] ?? 0) + 1;
      }
    }

    // 100 in quadrants, 20 with a single-scale label, 1 on the fence.
    expect(counts).toEqual({
      masterpieces: 25,
      "guilty-pleasures": 25,
      "serious-watches": 25,
      "not-worth-watching": 25,
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
  it("has nine placements, each with a non-empty label", () => {
    expect(PLACEMENTS).toHaveLength(9);
    for (const placement of PLACEMENTS) {
      expect(PLACEMENT_LABELS[placement].length).toBeGreaterThan(0);
    }
  });

  it("uses the agreed display names", () => {
    expect(PLACEMENT_LABELS).toEqual({
      masterpieces: "Masterpieces",
      "guilty-pleasures": "Guilty Pleasures",
      "serious-watches": "Serious Watches",
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
