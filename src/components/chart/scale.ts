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

/**
 * A score as text: "7" for a member's whole-number score, "6.3" for a group
 * average.
 */
export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
