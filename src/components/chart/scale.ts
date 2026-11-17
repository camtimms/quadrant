import type { FilmFilter, Quarter } from "@/lib/filters";
import type { Placement, Point } from "@/lib/quadrant";

/**
 * Turning scores into positions on the chart (design section 8).
 *
 * The chart is an SVG drawn on its own little grid of 120 × 120 units, which
 * the browser then stretches to whatever size the chart is on screen. Working
 * in those units means none of the drawing code has to know about pixels.
 *
 *     0        10                                  110      120
 *     ├─margin─┼──────────── the plot ──────────────┼─margin─┤
 *              score 0                         score 10
 *
 * The 10-unit margin on each side is where the words at the ends of the two
 * lines go (Bad, Good, Enjoyable, Not Enjoyable).
 *
 * These are pure functions with no React in them, so they are tested on
 * their own in scale.test.ts.
 */

/** The width and height of the whole drawing, margins included. */
export const CHART_SIZE = 120;

/** Where the plot starts and ends, on both axes. */
export const PLOT_START = 10;
export const PLOT_END = 110;

/** How many chart units one point of score takes up: (110 - 10) / 10. */
const UNITS_PER_SCORE = (PLOT_END - PLOT_START) / 10;

/** Horizontal position of a Quality score: 0 on the left, 10 on the right. */
export function chartX(quality: number): number {
  return PLOT_START + quality * UNITS_PER_SCORE;
}

/**
 * Vertical position of an Enjoyment score: 10 at the TOP, 0 at the bottom.
 *
 * Screens measure y downwards from the top edge, the opposite of a chart,
 * so the score is subtracted from the bottom of the plot instead of being
 * added to the top.
 */
export function chartY(enjoyment: number): number {
  return PLOT_END - enjoyment * UNITS_PER_SCORE;
}

/**
 * A chart position as a percentage of the chart's size, for placing ordinary
 * HTML elements (the point buttons) on top of the SVG with CSS.
 */
export function toPercent(units: number): string {
  return `${(units / CHART_SIZE) * 100}%`;
}

// A score as text ("7", or "6.3" for an average). It lives in the quadrant
// library, which uses it too; passed on here so the chart code and the
// components that import it from this file are unchanged.
export { formatScore } from "@/lib/quadrant/format";

// ---------------------------------------------------------------------------
// Zooming in on one placement (R53)
// ---------------------------------------------------------------------------

/**
 * How much of each scale is in view when zoomed in: 6.5 of the 0–10 points.
 * That is one half of the chart (5 points) plus 0.75 either side, so points
 * on the edge of the view are not cut in half and the names written in the
 * margin beside it stay visible.
 */
export const ZOOM_SPAN = 6.5;

/**
 * The middle of each placement's part of the chart, in scores.
 *
 * A corner and its neighbouring inner band share a view (the quarter they
 * are both in), so Masterpieces and Worth Watching both centre on 7.5 / 7.5.
 * The four "on a line" placements centre on their half of a dividing line,
 * and On the fence on the crossing itself. Because every view is the same
 * size, every filter zooms by the same amount.
 */
const ZOOM_CENTRES: Record<Placement, Point> = {
  masterpieces: { quality: 7.5, enjoyment: 7.5 },
  "worth-watching": { quality: 7.5, enjoyment: 7.5 },
  "guilty-pleasures": { quality: 2.5, enjoyment: 7.5 },
  "cheap-thrills": { quality: 2.5, enjoyment: 7.5 },
  "serious-watches": { quality: 7.5, enjoyment: 2.5 },
  respectable: { quality: 7.5, enjoyment: 2.5 },
  "dumpster-fires": { quality: 2.5, enjoyment: 2.5 },
  "not-worth-watching": { quality: 2.5, enjoyment: 2.5 },
  good: { quality: 7.5, enjoyment: 5 },
  bad: { quality: 2.5, enjoyment: 5 },
  enjoyable: { quality: 5, enjoyment: 7.5 },
  "not-enjoyable": { quality: 5, enjoyment: 2.5 },
  "on-the-fence": { quality: 5, enjoyment: 5 },
};

/** The square part of the drawing that is in view, in chart units. */
export type ZoomWindow = { left: number; top: number; size: number };

/** The middle of each quadrant (R89): the centres its corner uses. */
const QUARTER_CENTRES: Record<Quarter, Point> = {
  "top-right": ZOOM_CENTRES.masterpieces,
  "top-left": ZOOM_CENTRES["guilty-pleasures"],
  "bottom-right": ZOOM_CENTRES["serious-watches"],
  "bottom-left": ZOOM_CENTRES["dumpster-fires"],
};

/**
 * Which part of the chart to show for a chosen filter, or null (the whole
 * chart) when there is none.
 *
 * A quadrant decides the view, whichever of its finer chips is chosen, so
 * moving between them does not move the chart (R89): Good chosen in the top
 * right stays on the top right, and in the bottom right on the bottom right.
 * Only a placement with no quadrant (On the fence) uses its own centre.
 */
export function zoomWindow(filter: FilmFilter | null): ZoomWindow | null {
  if (filter === null) return null;
  const centre = filter.quarter
    ? QUARTER_CENTRES[filter.quarter]
    : filter.placement
      ? ZOOM_CENTRES[filter.placement]
      : null;
  if (centre === null) return null;
  const half = ZOOM_SPAN / 2;
  return {
    left: chartX(centre.quality - half),
    // The TOP edge of the view is the HIGHEST enjoyment score in it.
    top: chartY(centre.enjoyment + half),
    size: chartX(ZOOM_SPAN) - chartX(0),
  };
}

/** How many times bigger things are drawn when zoomed to a window. */
export function zoomScale(window: ZoomWindow | null): number {
  return window ? CHART_SIZE / window.size : 1;
}

/**
 * The CSS `transform` that brings a window into view, or "none".
 *
 * Read it right to left, which is the order CSS applies it: first slide the
 * drawing so the window's top-left corner is at the top-left of the chart,
 * then enlarge everything from that corner until the window fills the chart.
 * The percentages are of the chart's own size, so this works at any width.
 */
export function zoomTransform(window: ZoomWindow | null): string {
  if (!window) return "none";
  return `scale(${zoomScale(window)}) translate(-${toPercent(window.left)}, -${toPercent(window.top)})`;
}
