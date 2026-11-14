/**
 * Shared types for the quadrant maths (design section 7).
 *
 * Everything in src/lib/quadrant is "pure": no database, no React, no dates.
 * Give a function the same input and it always returns the same output, which
 * is what makes this the easiest part of the app to test.
 */

/** A score a member can give: a whole number from 0 to 10. */
export type Score = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * A position on the chart.
 *
 * Typed as `number`, not `Score`, because a group average (for example 6.3)
 * is also a Point and is classified by exactly the same rule as one member's
 * whole-number rating.
 */
export type Point = { quality: number; enjoyment: number };

/** Where one value sits relative to the midpoint of 5. */
export type Level = "low" | "neutral" | "high";

/** Both scores are off the midpoint: the film is in one of the four corners. */
export type Quadrant =
  | "masterpieces"
  | "guilty-pleasures"
  | "serious-watches"
  | "not-worth-watching";

/** Exactly one score is 5, so only the other one says anything. */
export type AxisLabel = "good" | "bad" | "enjoyable" | "not-enjoyable";

/** Every label a point can get. Each point gets exactly one. */
export type Placement = Quadrant | AxisLabel | "on-the-fence";

/**
 * All nine placements, in the order they are shown (filter chips, counts):
 * the four quadrants first, then the four single-scale labels, then 5/5.
 *
 * `satisfies` makes TypeScript check every entry is a real Placement while
 * keeping the exact literal types, so a typo here is a compile error.
 */
export const PLACEMENTS = [
  "masterpieces",
  "guilty-pleasures",
  "serious-watches",
  "not-worth-watching",
  "good",
  "bad",
  "enjoyable",
  "not-enjoyable",
  "on-the-fence",
] as const satisfies readonly Placement[];
