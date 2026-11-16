import { roundToOneDecimal } from "@/lib/quadrant/average";
import { formatScore } from "@/lib/quadrant/format";

/**
 * How spread out a group's scores are on one scale (R73, R74, design 21.1).
 *
 * The film page draws a curve for Quality and one for Enjoyment from the
 * group's mean and standard deviation, once enough members have rated the
 * film for a spread to mean something.
 */

/** Below this many ratings a spread is mostly noise (E55, owner's choice). */
export const MIN_RATINGS_FOR_SPREAD = 5;

/**
 * The mean and the standard deviation of some scores, or null for none.
 *
 * The standard deviation is "how far a typical score sits from the mean":
 * the square root of the average squared distance from it. It is divided by
 * n, the number of scores, not n - 1. Statistics courses often use n - 1
 * when a handful of scores stands in for a much larger crowd; here the
 * scores ARE the whole group being described, so n is the honest divisor
 * (and it never divides by zero).
 */
export function spreadOf(
  scores: readonly number[],
): { mean: number; sd: number } | null {
  const n = scores.length;
  if (n === 0) return null;
  const mean = scores.reduce((sum, score) => sum + score, 0) / n;
  const variance =
    scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / n;
  return { mean, sd: Math.sqrt(variance) };
}

/** How many points along 0–10 the curve is drawn with. */
const CURVE_STEPS = 100;

/**
 * Points for drawing a normal ("bell") curve with this mean and standard
 * deviation across the 0–10 scale, scaled so its peak is 1. (The true
 * normal density has a peak that depends on the spread; only the shape
 * matters for drawing, and a fixed peak keeps both curves the same height.)
 *
 * `sd` must be above 0: with no spread there is no curve (E56).
 */
export function normalCurve(
  mean: number,
  sd: number,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let step = 0; step <= CURVE_STEPS; step++) {
    const x = (step / CURVE_STEPS) * 10;
    points.push({ x, y: Math.exp(-((x - mean) ** 2) / (2 * sd ** 2)) });
  }
  // The mean itself, exactly, so the drawn peak is never cut short between
  // two steps. Kept in order along the scale.
  if (!points.some((point) => point.x === mean) && mean >= 0 && mean <= 10) {
    points.push({ x: mean, y: 1 });
    points.sort((a, b) => a.x - b.x);
  }
  return points;
}

/**
 * The curve in words (R74, NFR13): "Quality: average 6.4, most scores
 * between 4.8 and 8". "Most" is the mean plus or minus one standard
 * deviation, where about two thirds of a normal spread lies; it is kept
 * within 0–10. With no spread at all: "Everyone gave Quality 7" (E56).
 */
export function describeSpread(
  scale: "Quality" | "Enjoyment",
  scores: readonly number[],
): string {
  const spread = spreadOf(scores);
  if (!spread) return "";
  const { mean, sd } = spread;
  if (sd === 0) return `Everyone gave ${scale} ${formatScore(mean)}`;

  const show = (value: number) =>
    formatScore(roundToOneDecimal(Math.min(10, Math.max(0, value))));
  return `${scale}: average ${show(mean)}, most scores between ${show(mean - sd)} and ${show(mean + sd)}`;
}
