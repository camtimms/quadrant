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

/**
 * Where one value sits on its 0-10 scale. The scale is cut at 2.5, 5 and 7.5
 * into four equal bands, with 5 itself as its own "neutral" level.
 * "very-" means extreme: 7.5 or more, or 2.5 or less.
 */
export type Level = "very-low" | "low" | "neutral" | "high" | "very-high";

/** Both scores are extreme. The rare, stand-out films. */
export type Corner =
  | "masterpieces" // both extremely high
  | "guilty-pleasures" // quality extremely low, enjoyment extremely high
  | "serious-watches" // quality extremely high, enjoyment extremely low
  | "dumpster-fires"; // both extremely low

/** Neither score is 5, and the film is not in a corner. */
export type InnerBand =
  | "worth-watching" // both above 5
  | "cheap-thrills" // quality below 5, enjoyment above 5
  | "respectable" // quality above 5, enjoyment below 5
  | "not-worth-watching"; // both below 5

/** Exactly one score is 5, so only the other one says anything. */
export type AxisLabel = "good" | "bad" | "enjoyable" | "not-enjoyable";

/** Every label a point can get. Each point gets exactly one. */
export type Placement = Corner | InnerBand | AxisLabel | "on-the-fence";

/**
 * All thirteen placements, in the order they are shown (filter chips, counts):
 * the four corners, the four inner bands, then the five that sit on a line.
 *
 * `satisfies` makes TypeScript check every entry is a real Placement while
 * keeping the exact literal types, so a typo here is a compile error.
 */
export const PLACEMENTS = [
  "masterpieces",
  "guilty-pleasures",
  "serious-watches",
  "dumpster-fires",
  "worth-watching",
  "cheap-thrills",
  "respectable",
  "not-worth-watching",
  "good",
  "bad",
  "enjoyable",
  "not-enjoyable",
  "on-the-fence",
] as const satisfies readonly Placement[];
