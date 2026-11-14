"use client";

// "use client" because the chart remembers which point is selected.

import { useState } from "react";
import { PointPanel } from "@/components/chart/PointPanel";
import {
  CHART_SIZE,
  chartX,
  chartY,
  formatScore,
  toPercent,
} from "@/components/chart/scale";
import {
  classify,
  clusterPoints,
  EXTREME_HIGH,
  EXTREME_LOW,
  MIDPOINT,
  PLACEMENT_LABELS,
  type Cluster,
  type Placement,
  type Point,
} from "@/lib/quadrant";

/** A film as the chart needs it: what to show, and where to put it. */
export type ChartFilm = {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  /** A member's own scores, or a group average. */
  point: Point;
};

// ---------------------------------------------------------------------------
// The frame: everything that is the same on every chart
// ---------------------------------------------------------------------------

/**
 * The four outer corners (R25): both scores extreme. Each is described by the
 * range of scores it covers, taken from the SAME constants classify() uses,
 * so the shaded squares can never disagree with the rule that names films.
 */
const CORNERS: {
  placement: Placement;
  quality: [number, number];
  enjoyment: [number, number];
}[] = [
  {
    placement: "masterpieces",
    quality: [EXTREME_HIGH, 10],
    enjoyment: [EXTREME_HIGH, 10],
  },
  {
    placement: "guilty-pleasures",
    quality: [0, EXTREME_LOW],
    enjoyment: [EXTREME_HIGH, 10],
  },
  {
    placement: "serious-watches",
    quality: [EXTREME_HIGH, 10],
    enjoyment: [0, EXTREME_LOW],
  },
  {
    placement: "dumpster-fires",
    quality: [0, EXTREME_LOW],
    enjoyment: [0, EXTREME_LOW],
  },
];

/**
 * The four inner bands (R52): off the midpoint but not in a corner.
 *
 * Where each name goes is chosen to stay clear of the points. A member's
 * scores are whole numbers, so their points sit in rows at 0, 1, 2 ... 10.
 * The names are written on the half-score lines (6.5 and 3.5), in the gap
 * BETWEEN two rows, and centred across the band (5 to 7.5, or 2.5 to 5).
 */
const INNER_BANDS: {
  placement: Placement;
  quality: number;
  enjoyment: number;
}[] = [
  { placement: "worth-watching", quality: 6.25, enjoyment: 6.5 },
  { placement: "cheap-thrills", quality: 3.75, enjoyment: 6.5 },
  { placement: "respectable", quality: 6.25, enjoyment: 3.5 },
  { placement: "not-worth-watching", quality: 3.75, enjoyment: 3.5 },
];

/** Font sizes, in chart units (the chart is 120 units wide). */
const NAME_FONT = 3.3;
const BAND_FONT = 2.6;

/** How far outside the plot the names in the margin are written. */
const MARGIN_OFFSET = 5;

/** One name on the chart, centred on (x, y), optionally turned on its side. */
function ChartLabel({
  placement,
  x,
  y,
  fontSize,
  className,
  rotate,
}: {
  placement: Placement;
  x: number;
  y: number;
  fontSize: number;
  className: string;
  rotate?: number;
}) {
  return (
    <text
      // data-label lets the tests find each name without depending on the
      // wording, which the owner expects to change (NFR22).
      data-label={placement}
      x={x}
      y={y}
      fontSize={fontSize}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      className={className}
    >
      {PLACEMENT_LABELS[placement]}
    </text>
  );
}

/**
 * The chart with no points on it: the grid, the two lines at 5, the four
 * shaded corners and all the names (R28).
 *
 * It is exported separately because the film page's spoke map (task T28)
 * draws different things on top of the same frame.
 *
 * Colours are all the page's own text colour at different strengths
 * ("foreground/15" = 15% opacity), so the chart follows light and dark mode
 * by itself, and nothing relies on telling two hues apart (NFR14).
 */
export function ChartFrame() {
  const middleX = chartX(MIDPOINT);
  const middleY = chartY(MIDPOINT);

  return (
    <svg
      viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
      // The drawing is scenery. The information is in the point buttons on
      // top of it and in the list below the chart (NFR13), so screen readers
      // skip it rather than reading out a dozen stray words.
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    >
      {/* The plot's outer edge. */}
      <rect
        x={chartX(0)}
        y={chartY(10)}
        width={chartX(10) - chartX(0)}
        height={chartY(0) - chartY(10)}
        className="fill-none stroke-foreground/30"
        strokeWidth={0.3}
      />

      {/* The four outer corners: lightly shaded, with a thin outline. Each
          one's name is written in the margin directly above or below it,
          not inside it. Inside, it would sit exactly where the points for
          scores of 8, 9 and 10 (or 0, 1 and 2) are drawn, and be hidden by
          the very films it describes. */}
      {CORNERS.map(({ placement, quality, enjoyment }) => {
        const left = chartX(quality[0]);
        const right = chartX(quality[1]);
        // y grows downwards, so the HIGH enjoyment score is the top edge.
        const top = chartY(enjoyment[1]);
        const bottom = chartY(enjoyment[0]);
        const isTopCorner = enjoyment[1] === 10;
        return (
          <g key={placement}>
            <rect
              data-corner={placement}
              x={left}
              y={top}
              width={right - left}
              height={bottom - top}
              className="fill-foreground/10 stroke-foreground/40"
              strokeWidth={0.3}
            />
            <ChartLabel
              placement={placement}
              x={(left + right) / 2}
              y={isTopCorner ? top - MARGIN_OFFSET : bottom + MARGIN_OFFSET}
              fontSize={NAME_FONT}
              className="fill-foreground font-semibold"
            />
          </g>
        );
      })}

      {/* The inner-band names: smaller and quieter. On a phone they are
          dropped ("hidden"), because the chart is too small to fit them
          without crowding the dots; from the "sm" width (640px) up they are
          shown ("sm:block"). The list and filter chips still name them. */}
      <g data-inner-band-labels className="hidden sm:block">
        {INNER_BANDS.map(({ placement, quality, enjoyment }) => (
          <ChartLabel
            key={placement}
            placement={placement}
            x={chartX(quality)}
            y={chartY(enjoyment)}
            fontSize={BAND_FONT}
            className="fill-foreground/60"
          />
        ))}
      </g>

      {/* The dividing lines at 5. A film with a 5 sits ON a line, belonging
          to neither side. */}
      <line
        data-divider="quality"
        x1={middleX}
        x2={middleX}
        y1={chartY(10)}
        y2={chartY(0)}
        className="stroke-foreground/60"
        strokeWidth={0.4}
      />
      <line
        data-divider="enjoyment"
        x1={chartX(0)}
        x2={chartX(10)}
        y1={middleY}
        y2={middleY}
        className="stroke-foreground/60"
        strokeWidth={0.4}
      />

      {/* A name at the outer end of each half-line, in the margin, so a
          point sitting on a line can be read without a legend. The two at
          the sides are turned to run along the edge. */}
      <ChartLabel
        placement="enjoyable"
        x={middleX}
        y={chartY(10) - MARGIN_OFFSET}
        fontSize={NAME_FONT}
        className="fill-foreground"
      />
      <ChartLabel
        placement="not-enjoyable"
        x={middleX}
        y={chartY(0) + MARGIN_OFFSET}
        fontSize={NAME_FONT}
        className="fill-foreground"
      />
      <ChartLabel
        placement="bad"
        x={chartX(0) - MARGIN_OFFSET}
        y={middleY}
        fontSize={NAME_FONT}
        rotate={-90}
        className="fill-foreground"
      />
      <ChartLabel
        placement="good"
        x={chartX(10) + MARGIN_OFFSET}
        y={middleY}
        fontSize={NAME_FONT}
        rotate={90}
        className="fill-foreground"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// The points
// ---------------------------------------------------------------------------

/** Do all the films in a cluster sit at exactly the same scores? */
function sameSpot(films: ChartFilm[]): boolean {
  const first = films[0].point;
  return films.every(
    (film) =>
      film.point.quality === first.quality &&
      film.point.enjoyment === first.enjoyment,
  );
}

/**
 * A point's name in words, for screen readers and as a hover tooltip
 * (NFR12). For example:
 *   "Commando (1985): quality 3, enjoyment 9, Cheap Thrills"
 *   "3 films at quality 9, enjoyment 9, Masterpieces"
 *   "2 films near quality 6.2, enjoyment 6.1"   (group averages that differ)
 */
function describePoint(cluster: Cluster<ChartFilm>): string {
  const { items, point } = cluster;
  const scores = `quality ${formatScore(point.quality)}, enjoyment ${formatScore(point.enjoyment)}`;

  if (items.length === 1) {
    const film = items[0];
    const name =
      film.year === null ? film.title : `${film.title} (${film.year})`;
    return `${name}: ${scores}, ${PLACEMENT_LABELS[classify(film.point)]}`;
  }
  // Films with identical scores share one placement, so it can be named.
  // Nearby averages may fall either side of a cut-off, so there it is left
  // to the panel, which gives each film its own.
  return sameSpot(items)
    ? `${items.length} films at ${scores}, ${PLACEMENT_LABELS[classify(point)]}`
    : `${items.length} films near ${scores}`;
}

type Props = {
  films: ChartFilm[];
  /**
   * How close two films must be to share a point: 1 for a member's own
   * whole-number scores (only identical scores merge), 0.5 for group
   * averages. See clusterPoints.
   */
  cellSize?: number;
};

/**
 * The quadrant chart: the frame, one point per film (or per group of films
 * at the same spot), and a panel under it for whichever point is selected
 * (R30–R32).
 *
 * The points are ordinary HTML <button>s laid over the drawing, not shapes
 * inside the SVG. Buttons come with everything a point needs for free: they
 * can be reached with Tab, pressed with Enter or Space, and are announced by
 * screen readers (NFR12). Rebuilding that on an SVG circle is possible but
 * easy to get subtly wrong.
 */
export function QuadrantChart({ films, cellSize = 1 }: Props) {
  // Which point is open, remembered by position in the list of clusters.
  const [selected, setSelected] = useState<number | null>(null);

  const clusters = clusterPoints(films, cellSize);
  // If the films change (after a delete, say), the remembered position may
  // no longer exist.
  const open = selected !== null ? clusters[selected] : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* aspect-square keeps the chart square at any width. "relative" lets
          the drawing and the buttons be stacked on top of each other. */}
      <div className="relative mx-auto aspect-square w-full max-w-xl">
        <ChartFrame />
        {clusters.map((cluster, index) => {
          const count = cluster.items.length;
          const label = describePoint(cluster);
          const isOpen = selected === index;
          return (
            <button
              // Films keep their order, so the first film's id is a stable
              // name for the point it belongs to.
              key={cluster.items[0].tmdbId}
              type="button"
              aria-label={label}
              title={label}
              // Tells a screen reader this button opens something, and
              // whether it is open now.
              aria-expanded={isOpen}
              onClick={() => setSelected(isOpen ? null : index)}
              style={{
                left: toPercent(chartX(cluster.point.quality)),
                top: toPercent(chartY(cluster.point.enjoyment)),
              }}
              // The button is centred on its position (the two translates).
              // A cluster is larger and shows its count, so "several films
              // here" is told by size and a number, not by colour (NFR14).
              // The selected point gets a ring.
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background bg-foreground text-xs leading-none font-semibold text-background hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                count > 1 ? "h-7 w-7" : "h-4 w-4"
              } ${isOpen ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
            >
              {count > 1 ? count : null}
            </button>
          );
        })}
      </div>

      {open ? (
        <PointPanel films={open.items} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
