import type { Level, Placement, Point } from "@/lib/quadrant/types";

/** The neutral value on both scales: "a perfectly fine film". */
export const MIDPOINT = 5;

/** R24: above 5 is high, below 5 is low, exactly 5 is neutral. */
export function levelOf(value: number): Level {
  if (value > MIDPOINT) return "high";
  if (value < MIDPOINT) return "low";
  return "neutral";
}

/**
 * The whole classification rule as a lookup table: quality level first,
 * then enjoyment level. It is the table from design section 7, written as
 * data rather than as nested ifs so it can be read (and checked) at a glance.
 *
 * Because the type is Record<Level, Record<Level, Placement>>, TypeScript
 * refuses to compile if any of the 3 x 3 = 9 combinations is missing.
 */
const PLACEMENT_BY_LEVELS: Record<Level, Record<Level, Placement>> = {
  high: {
    high: "masterpieces",
    low: "serious-watches",
    neutral: "good",
  },
  low: {
    high: "guilty-pleasures",
    low: "not-worth-watching",
    neutral: "bad",
  },
  neutral: {
    high: "enjoyable",
    low: "not-enjoyable",
    neutral: "on-the-fence",
  },
};

/**
 * Give a point its one placement (R25, R26, R50).
 *
 * This is the only place in the app that decides a placement (R29). Pages,
 * charts and filters all call this; nothing stores the answer, so changing
 * the rule here changes it everywhere at once.
 */
export function classify(point: Point): Placement {
  return PLACEMENT_BY_LEVELS[levelOf(point.quality)][levelOf(point.enjoyment)];
}
