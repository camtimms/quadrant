import type { ReactNode } from "react";
import { formatScore } from "@/components/chart/scale";
import {
  classify,
  filmDisagreement,
  groupAverage,
  PLACEMENT_LABELS,
  roundToOneDecimal,
  type Point,
} from "@/lib/quadrant";

type Props = {
  /** Every member's current rating of one film. */
  points: readonly Point[];
  /**
   * The spread curves (R73), when the film has them. Given, they fold away
   * under the two averages, and pressing the averages opens them (R101).
   */
  spread?: ReactNode;
};

/**
 * What the group as a whole made of a film, in words and numbers: the
 * average of each score, how many members rated it, where the average falls
 * on the chart, and the biggest disagreement between any two members
 * (R42, R45).
 *
 * This component does no maths of its own. Every number comes from the
 * tested functions in src/lib/quadrant (NFR17), so the film page, the
 * Friends' films page and the chart can never disagree about an average.
 *
 * It renders nothing for a film nobody has rated: such a film has no
 * average, and "0" would be a lie because 0 is a real score.
 */
export function GroupAverage({ points, spread }: Props) {
  const average = groupAverage(points);
  if (average === null) return null;

  // null when fewer than two members have rated it: with nobody to disagree
  // with there is no disagreement to state. That is shown as a dash, never
  // as 0, because 0 means "they agree exactly" (R45).
  const disagreement = filmDisagreement(points);

  // The two averages. Plain list items without curves; with them, the
  // pressable line that opens the curves (R101).
  const averages = (
    <>
      <div>
        <dt className="text-ink-muted">Quality</dt>
        <dd className="text-lg font-semibold">
          {formatScore(average.quality)}
        </dd>
      </div>
      <div>
        <dt className="text-ink-muted">Enjoyment</dt>
        <dd className="text-lg font-semibold">
          {formatScore(average.enjoyment)}
        </dd>
      </div>
    </>
  );

  const rest = (
    // A <dl> is a list of label/value pairs: each <dt> names a value and the
    // <dd> after it gives the value. Screen readers announce them as pairs.
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
      {spread ? null : averages}
      <div>
        <dt className="text-ink-muted">Rated by</dt>
        <dd className="text-lg font-semibold">
          {points.length === 1 ? "1 member" : `${points.length} members`}
        </dd>
      </div>
      <div>
        <dt className="text-ink-muted">Placement</dt>
        {/* Classified from the rounded average, the same number shown
            above, so the label always matches what is on screen (R27). */}
        <dd className="text-lg font-semibold">
          {PLACEMENT_LABELS[classify(average)]}
        </dd>
      </div>
      <div className="col-span-2">
        <dt className="text-ink-muted">Biggest disagreement</dt>
        <dd>
          {disagreement === null ? (
            <>
              <span className="text-lg font-semibold">—</span>{" "}
              <span className="text-ink-muted">(needs two ratings)</span>
            </>
          ) : (
            // Rounded only here, at the moment it is shown.
            <span className="text-lg font-semibold">
              {formatScore(roundToOneDecimal(disagreement))}
            </span>
          )}
        </dd>
      </div>
    </dl>
  );

  if (!spread) return rest;

  return (
    <div className="flex flex-col gap-3">
      {/* The browser's own <details>, as for "Your rating": opens and closes
          with a tap, Enter or Space, and tells screen readers whether it is
          open, with no JavaScript. Closed when the page opens (R101). A
          <summary> may only hold text-like content, not a list, so the two
          averages are written as text here. */}
      <details className="group rounded-xl bg-well">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 rounded-xl p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-ink-muted">Quality</span>{" "}
            <span className="text-lg font-semibold">
              {formatScore(average.quality)}
            </span>
          </span>
          <span>
            <span className="text-ink-muted">Enjoyment</span>{" "}
            <span className="text-lg font-semibold">
              {formatScore(average.enjoyment)}
            </span>
          </span>
          <span className="ml-auto flex items-center gap-2">
            {/* Says what a press will do; the words change with CSS alone. */}
            <span className="underline underline-offset-4">
              <span className="group-open:hidden">
                Show how the scores spread
              </span>
              <span className="hidden group-open:inline">Hide the spread</span>
            </span>
            <span
              aria-hidden="true"
              className="transition-transform group-open:rotate-90 motion-reduce:transition-none"
            >
              ▸
            </span>
          </span>
        </summary>
        <div className="px-3 pb-3">{spread}</div>
      </details>
      {rest}
    </div>
  );
}
