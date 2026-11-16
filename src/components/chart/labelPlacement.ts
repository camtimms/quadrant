/**
 * Where each name goes on the spoke map (R66, design 17.6), so that no two
 * names overlap and no name covers a point.
 *
 * Everything here is in PIXELS on the narrowest chart the app draws:
 * REFERENCE_SIZE across, a 375 px phone less the page's margins. That is
 * the hardest case. On a wider screen the chart grows but a name stays the
 * same size in pixels, so every gap worked out here only gets bigger.
 * Labels are positioned by their top-left corner, so a name that turns out
 * narrower than estimated also only leaves a bigger gap.
 *
 * Text is never measured in the browser: its size is estimated from the
 * number of characters. That keeps the spoke map a server component, with
 * no jump after the page appears.
 */

/** The chart's width and height in pixels on a 375 px phone. */
export const REFERENCE_SIZE = 343;

/** Names longer than this are cut short on the chart (the table has them). */
const MAX_NAME_LENGTH = 16;

// The label pill: 12 px text (Tailwind's text-xs), 6 px padding each side.
// Geist averages about 0.58 of its size per character; 0.62 is allowed, so
// the estimate errs wide.
const CHARACTER_WIDTH = 12 * 0.62;
const SIDE_PADDING = 6;
const LABEL_HEIGHT = 18;

/** The space left between a point's edge and its name. */
const GAP = 4;

/** A point on the chart: its centre and how far its marker reaches. */
export type Marker = { x: number; y: number; radius: number };

/** A name to place, beside the point it belongs to. */
export type LabelRequest = { id: string; text: string; point: Marker };

export type PlacedLabel = {
  id: string;
  /** Top-left corner and size, in pixels on the reference chart. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** The same corner as CSS percentages of the chart, for drawing. */
  left: string;
  top: string;
  /** A line from the point to the label, when it had to move further out. */
  leader: { x1: number; y1: number; x2: number; y2: number } | null;
  /** True only when no clear place existed (E39). */
  overlaps: boolean;
};

/** A name as the chart shows it: cut to 16 characters, ending in "…". */
export function chartName(name: string): string {
  return name.length <= MAX_NAME_LENGTH
    ? name
    : `${name.slice(0, MAX_NAME_LENGTH - 1)}…`;
}

/** The estimated size of a label pill holding this text. */
export function labelSize(text: string): { width: number; height: number } {
  return {
    width: Math.ceil(text.length * CHARACTER_WIDTH + 2 * SIDE_PADDING),
    height: LABEL_HEIGHT,
  };
}

type Box = { left: number; top: number; right: number; bottom: number };

/**
 * The places tried for one label, best first: right, left, below, above,
 * then the four diagonals, each at the normal distance, then at two,
 * three, four and five times it. Right comes first because names read left to right from
 * their point.
 */
function candidates(point: Marker, width: number, height: number) {
  const places: { box: Box; step: number }[] = [];
  // Up to five times out: in a 3 x 3 block of neighbouring scores (about
  // 29 px apart here) the middle name finds no clear place within three.
  for (const step of [1, 2, 3, 4, 5]) {
    const d = (point.radius + GAP) * step;
    const diagonal = d * 0.7;
    const corners: [number, number][] = [
      [point.x + d, point.y - height / 2], // right
      [point.x - d - width, point.y - height / 2], // left
      [point.x - width / 2, point.y + d], // below
      [point.x - width / 2, point.y - d - height], // above
      [point.x + diagonal, point.y - diagonal - height], // up and right
      [point.x + diagonal, point.y + diagonal], // down and right
      [point.x - diagonal - width, point.y + diagonal], // down and left
      [point.x - diagonal - width, point.y - diagonal - height], // up and left
    ];
    for (const [left, top] of corners) {
      places.push({
        box: { left, top, right: left + width, bottom: top + height },
        step,
      });
    }
  }
  return places;
}

const inside = (box: Box) =>
  box.left >= 0 &&
  box.top >= 0 &&
  box.right <= REFERENCE_SIZE &&
  box.bottom <= REFERENCE_SIZE;

/** How much two boxes overlap, in square pixels (0 when apart). */
function overlapArea(a: Box, b: Box): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}

/** Whether a box touches a round marker. */
function touches(box: Box, marker: Marker): boolean {
  const nearestX = Math.max(box.left, Math.min(marker.x, box.right));
  const nearestY = Math.max(box.top, Math.min(marker.y, box.bottom));
  return Math.hypot(marker.x - nearestX, marker.y - nearestY) < marker.radius;
}

/** A marker as a square box, to measure how much a label covers it. */
const markerBox = (marker: Marker): Box => ({
  left: marker.x - marker.radius,
  top: marker.y - marker.radius,
  right: marker.x + marker.radius,
  bottom: marker.y + marker.radius,
});

/** The point on a box's edge nearest to (x, y): where a leader line ends. */
function nearestEdge(box: Box, x: number, y: number) {
  return {
    x: Math.max(box.left, Math.min(x, box.right)),
    y: Math.max(box.top, Math.min(y, box.bottom)),
  };
}

/** Pull a box back inside the chart, keeping its size. */
function clamp(box: Box): Box {
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const left = Math.min(Math.max(box.left, 0), REFERENCE_SIZE - width);
  const top = Math.min(Math.max(box.top, 0), REFERENCE_SIZE - height);
  return { left, top, right: left + width, bottom: top + height };
}

/**
 * Place every label, one at a time, in the order given: the caller puts
 * the most important first ("You", then friends from the longest spoke).
 *
 * Each label takes the first of its candidate places that stays inside the
 * chart and touches no label already placed and no marker. `markers` is
 * every point on the chart, including ones without a label of their own
 * (the group average); it defaults to the labels' own points.
 *
 * If no place is clear (E39), the label takes the place inside the chart
 * that overlaps least, and is marked `overlaps`.
 */
export function placeLabels(
  labels: readonly LabelRequest[],
  markers: readonly Marker[] = labels.map((label) => label.point),
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  const taken: Box[] = [];

  for (const { id, text, point } of labels) {
    const { width, height } = labelSize(text);
    const options = candidates(point, width, height);

    let chosen = options.find(
      ({ box }) =>
        inside(box) &&
        taken.every((other) => overlapArea(box, other) === 0) &&
        markers.every((marker) => !touches(box, marker)),
    );
    let overlaps = false;

    if (!chosen) {
      overlaps = true;
      const crowding = (box: Box) =>
        taken.reduce((sum, other) => sum + overlapArea(box, other), 0) +
        markers.reduce(
          (sum, marker) => sum + overlapArea(box, markerBox(marker)),
          0,
        );
      const within = options
        .filter(({ box }) => inside(box))
        .sort((a, b) => crowding(a.box) - crowding(b.box));
      chosen = within[0] ?? { box: clamp(options[0].box), step: 1 };
    }

    const { box, step } = chosen;
    taken.push(box);
    const end = nearestEdge(box, point.x, point.y);
    placed.push({
      id,
      x: box.left,
      y: box.top,
      width,
      height,
      left: `${(box.left / REFERENCE_SIZE) * 100}%`,
      top: `${(box.top / REFERENCE_SIZE) * 100}%`,
      leader:
        step > 1 ? { x1: point.x, y1: point.y, x2: end.x, y2: end.y } : null,
      overlaps,
    });
  }

  return placed;
}
