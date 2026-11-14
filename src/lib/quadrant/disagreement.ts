import type { Point } from "@/lib/quadrant/types";

/**
 * How far apart two ratings of the same film are: the straight-line distance
 * between the two points on the chart (Pythagoras). On the film page this is
 * literally the length of the spoke drawn between two members (R41).
 *
 * 0 means identical scores. The result is NOT rounded here, so that sorting
 * and comparing use the exact value; round with roundToOneDecimal only at the
 * moment it is shown to a member.
 */
export function disagreement(a: Point, b: Point): number {
  // Math.hypot(x, y) is the square root of (x squared + y squared).
  return Math.hypot(a.quality - b.quality, a.enjoyment - b.enjoyment);
}

/**
 * The largest disagreement possible: opposite corners of the chart, about 14.1.
 * Useful for showing a disagreement as a proportion of the worst case.
 */
export const MAX_DISAGREEMENT = disagreement(
  { quality: 0, enjoyment: 0 },
  { quality: 10, enjoyment: 10 },
);

/**
 * A film's disagreement: its single biggest clash, i.e. the largest
 * disagreement between any two of the members who rated it (R44).
 *
 * Returns null when fewer than two members have rated the film, because there
 * is nobody to disagree with. It must not be 0: zero means "everyone agrees
 * exactly", which is a real and different result (R45).
 *
 * This compares every pair, which is fine here: a friend group of 15 gives at
 * most 105 pairs per film.
 */
export function filmDisagreement(ratings: readonly Point[]): number | null {
  if (ratings.length < 2) return null;

  let largest = 0;
  for (let i = 0; i < ratings.length; i++) {
    // Start at i + 1 so each pair is compared once and nobody is compared
    // with themselves.
    for (let j = i + 1; j < ratings.length; j++) {
      largest = Math.max(largest, disagreement(ratings[i], ratings[j]));
    }
  }
  return largest;
}
