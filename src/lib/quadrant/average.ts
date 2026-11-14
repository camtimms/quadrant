import type { Point } from "@/lib/quadrant/types";

/**
 * Round a number to one decimal place, with halves rounding up (4.95 -> 5.0).
 * Used wherever a calculated value is shown to a member.
 */
export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * The mean of whole-number scores, rounded to one decimal place.
 *
 * Why not just `roundToOneDecimal(sum / count)`? Computers store most
 * decimals only approximately: 101 / 20 is held as 5.04999999..., not 5.05,
 * and whether that rounds to 5.0 or 5.1 would then be down to luck.
 * Multiplying the whole-number sum by 10 BEFORE dividing keeps the half cases
 * exact (1010 / 20 is exactly 50.5), so they reliably round up.
 */
function meanToOneDecimal(sum: number, count: number): number {
  return Math.round((sum * 10) / count) / 10;
}

/**
 * A film's group average: the mean quality and the mean enjoyment across
 * everyone's ratings, each rounded to one decimal place (R27).
 *
 * Returns null when there are no ratings, because a film nobody has rated has
 * no average. (It must not be 0: zero is a real score.)
 *
 * The rounded numbers are what the app both displays AND classifies. That is
 * deliberate: if a true mean of 5.04 were shown as "5.0" but classified from
 * 5.04, the page would say "5.0" next to a label that only applies above 5.
 *
 * Averages are never stored. They are worked out from the individual ratings
 * every time, so nothing can drift out of date (NFR21).
 */
export function groupAverage(ratings: readonly Point[]): Point | null {
  const count = ratings.length;
  if (count === 0) return null;

  let qualitySum = 0;
  let enjoymentSum = 0;
  for (const rating of ratings) {
    qualitySum += rating.quality;
    enjoymentSum += rating.enjoyment;
  }

  return {
    quality: meanToOneDecimal(qualitySum, count),
    enjoyment: meanToOneDecimal(enjoymentSum, count),
  };
}
