import { disagreement } from "@/lib/quadrant/disagreement";
import type { Point } from "@/lib/quadrant/types";

/** One spoke: a line from the hub to somebody else's rating. */
export type Spoke<T> = {
  /** Whatever was passed in for this friend, untouched. */
  item: T;
  /**
   * The spoke's length: how far this rating is from the hub. Not rounded;
   * round with roundToOneDecimal only when it is shown.
   */
  disagreement: number;
  /** True for the longest spoke (or spokes, if several tie). */
  isLargest: boolean;
};

/**
 * The spokes of a film's spoke map: one from the viewer's rating (the hub)
 * to each friend's, with its length, and the longest marked (R39, R41).
 *
 * Two details that are easy to get wrong:
 *
 *  - Friends tied for furthest are ALL marked. Scores are whole numbers, so
 *    ties are common (2/9 and 8/1 are both exactly 5 away from 5/5), and
 *    choosing one of them would be arbitrary.
 *  - A spoke of length 0 is never marked. If every friend gave the viewer's
 *    exact scores, the largest "disagreement" is 0, which is agreement, and
 *    calling it the biggest disagreement would be nonsense (E13).
 *
 * Comparing the lengths with === is safe here: equal distances between
 * whole-number points come out of Math.hypot as identical numbers.
 */
export function spokesFrom<T extends { point: Point }>(
  hub: Point,
  others: readonly T[],
): Spoke<T>[] {
  const lengths = others.map((other) => disagreement(hub, other.point));
  // Math.max() of nothing is -Infinity, so start the comparison at 0.
  const largest = Math.max(0, ...lengths);

  return others.map((item, index) => ({
    item,
    disagreement: lengths[index],
    isLargest: largest > 0 && lengths[index] === largest,
  }));
}
