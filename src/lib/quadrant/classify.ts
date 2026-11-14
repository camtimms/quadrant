import type { Level, Placement, Point } from "@/lib/quadrant/types";

/** The neutral value on both scales: "a perfectly fine film". */
export const MIDPOINT = 5;

/**
 * The cut-offs for "extreme". Together with MIDPOINT they split each scale
 * into four equal bands of 2.5. Both are inclusive: 7.5 is extreme, 7.4 is not.
 *
 * A member's own score is a whole number, so for one person this simply means
 * 8, 9, 10 or 0, 1, 2. The half-points only ever decide a group average.
 *
 * To move the corners, change these two numbers (and the tests beside them).
 */
export const EXTREME_HIGH = 7.5;
export const EXTREME_LOW = 2.5;

/** R24: which of the five levels a single value falls in. */
export function levelOf(value: number): Level {
  // Checked from the outside in, so each line only has to rule out one thing.
  if (value >= EXTREME_HIGH) return "very-high";
  if (value <= EXTREME_LOW) return "very-low";
  if (value > MIDPOINT) return "high";
  if (value < MIDPOINT) return "low";
  return "neutral";
}

/**
 * The whole classification rule as a lookup table: quality level first,
 * then enjoyment level. It is the 5 x 5 table from design section 7, written
 * as data rather than as nested ifs so it can be read (and checked) at a glance.
 *
 * Because the type is Record<Level, Record<Level, Placement>>, TypeScript
 * refuses to compile if any of the 25 combinations is missing.
 *
 * Things worth noticing in the table:
 *  - each corner label appears exactly once: BOTH scores must be extreme;
 *  - the "neutral" row and column ignore how extreme the other score is,
 *    so a 9/5 is "good", the same as a 6/5 (requirements E26).
 */
const PLACEMENT_BY_LEVELS: Record<Level, Record<Level, Placement>> = {
  "very-high": {
    "very-high": "masterpieces",
    high: "worth-watching",
    neutral: "good",
    low: "respectable",
    "very-low": "serious-watches",
  },
  high: {
    "very-high": "worth-watching",
    high: "worth-watching",
    neutral: "good",
    low: "respectable",
    "very-low": "respectable",
  },
  neutral: {
    "very-high": "enjoyable",
    high: "enjoyable",
    neutral: "on-the-fence",
    low: "not-enjoyable",
    "very-low": "not-enjoyable",
  },
  low: {
    "very-high": "cheap-thrills",
    high: "cheap-thrills",
    neutral: "bad",
    low: "not-worth-watching",
    "very-low": "not-worth-watching",
  },
  "very-low": {
    "very-high": "guilty-pleasures",
    high: "cheap-thrills",
    neutral: "bad",
    low: "not-worth-watching",
    "very-low": "dumpster-fires",
  },
};

/**
 * Give a point its one placement (R25, R52, R26, R50).
 *
 * This is the only place in the app that decides a placement (R29). Pages,
 * charts and filters all call this; nothing stores the answer, so changing
 * the rule here changes it everywhere at once.
 */
export function classify(point: Point): Placement {
  return PLACEMENT_BY_LEVELS[levelOf(point.quality)][levelOf(point.enjoyment)];
}
