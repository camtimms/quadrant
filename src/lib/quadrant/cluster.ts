import type { Point } from "@/lib/quadrant/types";

/** One marker on a chart, standing for every item drawn at that spot. */
export type Cluster<T> = {
  /** Where to draw the marker: the mean position of its items. */
  point: Point;
  /** Everything the marker stands for, in the order it was given. */
  items: T[];
};

/**
 * Which cell of the grid a value falls in, as a whole number.
 *
 * Cells are centred on multiples of cellSize: with a cell size of 0.5 the
 * values 6.1 and 6.2 both belong to the cell centred on 6.0, and 6.3 belongs
 * to the one centred on 6.5.
 *
 * The value is converted to whole tenths first. Chart positions never have
 * more than one decimal place, and working in whole numbers avoids the
 * floating-point surprises described in average.ts.
 */
function cellIndex(value: number, cellSize: number): number {
  const tenths = Math.round(value * 10);
  const cellTenths = Math.round(cellSize * 10);
  return Math.round(tenths / cellTenths);
}

/**
 * Group chart items that would be drawn on top of each other (R31).
 *
 * There are only 121 possible whole-number ratings, so a member with a long
 * log will often have several films at exactly the same spot. Rather than let
 * one dot hide another, each occupied cell becomes a single cluster: the chart
 * draws one marker with a count, and selecting it lists every film inside.
 *
 * cellSize is how close two points must be to merge:
 *  - 1 on a member's own chart, where scores are whole numbers, so only
 *    identical scores merge;
 *  - 0.5 on the group-average chart, where positions have one decimal place
 *    and near-identical averages would otherwise overlap.
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
  cellSize: number,
): Cluster<T>[] {
  if (!(cellSize > 0)) {
    throw new Error(`cellSize must be greater than 0, got ${cellSize}`);
  }

  // A Map remembers the order keys were first added, which is what keeps the
  // clusters in the order their first item appeared.
  const itemsByCell = new Map<string, T[]>();
  for (const item of items) {
    const key = `${cellIndex(item.point.quality, cellSize)}:${cellIndex(item.point.enjoyment, cellSize)}`;
    const cell = itemsByCell.get(key);
    if (cell) cell.push(item);
    else itemsByCell.set(key, [item]);
  }

  return Array.from(itemsByCell.values(), (cellItems) => ({
    point: meanPosition(cellItems),
    items: cellItems,
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
