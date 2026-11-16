import { formatScore } from "@/components/chart/scale";
import { mutedText } from "@/components/ui/styles";
import { classify, PLACEMENT_LABELS, type Point } from "@/lib/quadrant";
import { viewingDate } from "@/lib/rewatch";

/** One of the member's earlier viewings of a film (R85). */
export type EarlierViewing = {
  /** When it was logged, as the database writes it. */
  watchedAt: string;
  point: Point;
  /** null when they wrote no review that time. */
  review: string | null;
};

type Props = {
  /** Newest first; the loader decides the order. */
  viewings: readonly EarlierViewing[];
};

/**
 * The member's own earlier viewings of a film, under their rating (R85):
 * the date, both scores, where that put the film, and what they wrote.
 * Shown to the member only; friends see the count (R84).
 *
 * No "use client": it only displays what it is given.
 */
export function EarlierViewings({ viewings }: Props) {
  if (viewings.length === 0) return null;

  return (
    <section
      aria-labelledby="earlier-viewings"
      className="flex flex-col gap-2 border-t border-well pt-4"
    >
      <h3 id="earlier-viewings" className="font-semibold">
        Earlier viewings
      </h3>
      <ul className="flex flex-col gap-3">
        {viewings.map((viewing) => (
          <li
            key={viewing.watchedAt}
            className="flex flex-col gap-1 rounded-xl bg-well p-3 text-sm"
          >
            <p className="font-medium">
              {viewingDate(viewing.watchedAt)} ·{" "}
              {PLACEMENT_LABELS[classify(viewing.point)]}
            </p>
            {/* Each number carries its label, as on the cards. */}
            <p className={mutedText}>
              Quality {formatScore(viewing.point.quality)} · Enjoyment{" "}
              {formatScore(viewing.point.enjoyment)}
            </p>
            {viewing.review ? (
              <p className="break-words whitespace-pre-line">
                {viewing.review}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
