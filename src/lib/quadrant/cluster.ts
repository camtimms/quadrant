import type { Point } from "@/lib/quadrant/types";

/** One marker on a chart, standing for every item drawn at that spot. */
export type Cluster<T> = {
  /** Where to draw the marker: the mean position of its items. */
  point: Point;
  /** Everything the marker stands for, in the order it was given. */
  items: T[];
};

/** A value in whole tenths: chart positions never have more decimals. */
function tenths(value: number): number {
  return Math.round(value * 10);
}

/**
 * Are two points within `limitTenths` of each other, in a straight line?
 *
 * Worked in whole tenths and compared squared, so there is no square root
 * and no floating-point surprise (see average.ts): 0.5 apart is exactly
 * 25 = 5², never 0.5000000001.
 */
function isWithin(a: Point, b: Point, limitTenths: number): boolean {
  const across = tenths(a.quality) - tenths(b.quality);
  const up = tenths(a.enjoyment) - tenths(b.enjoyment);
  return across * across + up * up <= limitTenths * limitTenths;
}

/**
 * Group chart items that would be drawn on top of each other (R31).
 *
 * There are only 121 possible whole-number ratings, so a member with a long
 * log will often have several films at exactly the same spot. Rather than let
 * one dot hide another, each group becomes a single marker with a count, and
 * selecting it lists every film inside.
 *
 * mergeWithin is how close (straight-line distance) two points must be to
 * merge:
 *  - 0 on a member's own chart, where scores are whole numbers, so only
 *    identical scores merge;
 *  - 0.5 on the group-average chart, where positions have one decimal
 *    place. A dot is about that wide on a phone, so closer dots overlap.
 *
 * Each item joins the first group in which it is within mergeWithin of
 * EVERY item, or starts a new one. Asking for every item, not just the
 * nearest, stops a row of films each 0.4 from the next from chaining into
 * one marker stretched across the chart.
 *
 * (It used to drop items into the cells of a fixed grid. That split close
 * pairs lying either side of a cell edge, which is what the owner saw:
 * T29f, design 7.)
 *
 * Clustering is only about what is drawn where. It does not decide a film's
 * placement: each item keeps its own point, and classify() is still applied
 * to that. Two films either side of a cut-off can share a marker and still
 * carry different labels.
 *
 * `T extends { point: Point }` means "any object that has a point". Films,
 * members' ratings, anything: whatever is passed in comes back untouched.
 */
export function clusterPoints<T extends { point: Point }>(
  items: readonly T[],
  mergeWithin: number,
): Cluster<T>[] {
  if (!(mergeWithin >= 0)) {
    throw new Error(`mergeWithin must be 0 or more, got ${mergeWithin}`);
  }
  const limit = tenths(mergeWithin);

  // Groups in the order their first item appeared, items in the order given.
  // A few hundred films at most, so checking each against every group is
  // quick.
  const groups: T[][] = [];
  for (const item of items) {
    const group = groups.find((members) =>
      members.every((member) => isWithin(member.point, item.point, limit)),
    );
    if (group) group.push(item);
    else groups.push([item]);
  }

  return groups.map((groupItems) => ({
    point: meanPosition(groupItems),
    items: groupItems,
  }));
}

/** The middle of a group of items: the mean of each coordinate. */
function meanPosition(items: readonly { point: Point }[]): Point {
  let quality = 0;
  let enjoyment = 0;
  for (const item of items) {
    quality += item.point.quality;
    enjoyment += item.point.enjoyment;
  }
  return {
    quality: quality / items.length,
    enjoyment: enjoyment / items.length,
  };
}
