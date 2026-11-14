import { classify } from "@/lib/quadrant/classify";
import { PLACEMENTS, type Placement, type Point } from "@/lib/quadrant/types";

/**
 * How many points fall under each placement, for the filter chips (R34).
 *
 * Every one of the thirteen placements is always present in the result, at 0
 * if nothing landed there, so the page can show a greyed-out chip instead of
 * having to check whether a key exists. Because each point gets exactly one
 * placement, the counts always add up to the number of points.
 */
export function countByPlacement(
  points: readonly Point[],
): Record<Placement, number> {
  // Start every placement at 0. Object.fromEntries builds
  // { masterpieces: 0, "guilty-pleasures": 0, ... } from the PLACEMENTS list.
  const counts = Object.fromEntries(
    PLACEMENTS.map((placement) => [placement, 0]),
  ) as Record<Placement, number>;

  for (const point of points) {
    counts[classify(point)] += 1;
  }
  return counts;
}
