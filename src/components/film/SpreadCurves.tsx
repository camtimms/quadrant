import {
  describeSpread,
  MIN_RATINGS_FOR_SPREAD,
  normalCurve,
  spreadOf,
  type Point,
} from "@/lib/quadrant";

type Props = {
  /** Every member's current scores for this film. */
  points: readonly Point[];
};

/**
 * How spread out the group's scores are, one curve per scale (R73, R74,
 * design 21.1). Shown only from five ratings (E55): with fewer, a "spread"
 * says more about chance than about the film.
 *
 * Each scale gets a sentence first, which is the information (NFR13), then
 * a small drawing of it, which is decoration: a bell curve from the group's
 * mean and standard deviation, a tick at the mean, and a dot for each
 * member's score. Server-drawn; nothing here runs in the browser.
 */
export function SpreadCurves({ points }: Props) {
  if (points.length < MIN_RATINGS_FOR_SPREAD) return null;

  return (
    <div className="flex flex-col gap-3">
      <Scale name="Quality" scores={points.map((point) => point.quality)} />
      <Scale name="Enjoyment" scores={points.map((point) => point.enjoyment)} />
    </div>
  );
}

// The drawing's own units: 200 across, 0–10 mapped onto 10–190.
const WIDTH = 200;
const HEIGHT = 64;
const BASELINE = 44; // where the curve meets the axis
const CURVE_HEIGHT = 36;
const DOT_ROW = 54;
const xOf = (score: number) => 10 + score * 18;

function Scale({
  name,
  scores,
}: {
  name: "Quality" | "Enjoyment";
  scores: readonly number[];
}) {
  const spread = spreadOf(scores)!;
  const key = name.toLowerCase();

  // Members on the same score share one dot, with a count (as on charts).
  const counts = new Map<number, number>();
  for (const score of scores) counts.set(score, (counts.get(score) ?? 0) + 1);
  const dots = [...counts].sort(([a], [b]) => a - b);

  // E56: no spread, so no curve; the sentence says everyone agreed.
  const curve =
    spread.sd > 0
      ? normalCurve(spread.mean, spread.sd)
          .map(
            ({ x, y }, index) =>
              `${index === 0 ? "M" : "L"}${xOf(x).toFixed(2)},${(BASELINE - y * CURVE_HEIGHT).toFixed(2)}`,
          )
          .join(" ")
      : null;

  return (
    <figure data-scale={key} className="flex flex-col gap-1">
      <figcaption className="text-sm">
        {describeSpread(name, scores)}
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        aria-hidden="true"
        className="w-full max-w-sm"
      >
        {curve ? (
          <path
            data-curve={key}
            // Closed along the axis so the area under the curve can be filled.
            d={`${curve} L${xOf(10)},${BASELINE} L${xOf(0)},${BASELINE} Z`}
            className="fill-well stroke-ink"
            strokeWidth={1}
          />
        ) : null}
        {/* The axis, with 0, 5 and 10 marked. */}
        <line
          x1={xOf(0)}
          x2={xOf(10)}
          y1={BASELINE}
          y2={BASELINE}
          className="stroke-ink-muted"
          strokeWidth={0.75}
        />
        {[0, 5, 10].map((tick) => (
          <text
            key={tick}
            x={xOf(tick)}
            y={HEIGHT - 1}
            textAnchor="middle"
            fontSize={7}
            className="fill-ink-muted"
          >
            {tick}
          </text>
        ))}
        {/* The mean, where the curve peaks. */}
        <line
          x1={xOf(spread.mean)}
          x2={xOf(spread.mean)}
          y1={BASELINE - CURVE_HEIGHT - 2}
          y2={BASELINE}
          className="stroke-ink"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
        {dots.map(([score, count]) => (
          <g key={score} data-dot={score} data-count={count}>
            <circle
              cx={xOf(score)}
              cy={DOT_ROW - 6}
              r={count > 1 ? 3.5 : 2.5}
              className="fill-ink"
            />
            {count > 1 ? (
              <text
                x={xOf(score) + 5}
                y={DOT_ROW - 4}
                fontSize={6}
                className="fill-ink-muted"
              >
                ×{count}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </figure>
  );
}
