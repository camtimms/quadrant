import Link from "next/link";
import { PendingMark } from "@/components/PendingMark";
import type { ChartFilm } from "@/components/chart/QuadrantChart";
import { formatScore } from "@/components/chart/scale";
import { PosterImage } from "@/components/film/PosterImage";
import { classify, PLACEMENT_LABELS } from "@/lib/quadrant";

type Props = {
  /** Every film at the selected point: one, or a whole cluster. */
  films: ChartFilm[];
  onClose: () => void;
};

/**
 * What opens under the chart when a point is selected (R32): each film at
 * that point with its poster, title, year, both scores and placement, and a
 * link to its page.
 *
 * For a cluster this is the answer to "which films are under that dot?".
 * Every one is listed, so no film is ever hidden behind another (R31).
 */
export function PointPanel({ films, onClose }: Props) {
  return (
    <section
      // A labelled <section> is a "region" that screen reader users can jump
      // to; the label says what it is.
      aria-label={films.length === 1 ? "Selected film" : "Selected films"}
      className="flex flex-col gap-2 rounded border border-foreground/20 p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">
          {films.length === 1 ? "1 film" : `${films.length} films`} at this
          point
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-foreground/30 px-2 py-1 text-sm hover:bg-foreground/10 active:bg-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Close
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {films.map((film) => (
          <li key={film.tmdbId}>
            <Link
              href={`/film/${film.tmdbId}`}
              className="flex items-center gap-3 rounded p-1 hover:bg-foreground/10 active:bg-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <PosterImage
                posterPath={film.posterPath}
                title={film.title}
                size="list"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium break-words">{film.title}</span>
                <span className="text-sm opacity-70">
                  {film.year ?? "Year unknown"}
                </span>
                <span className="text-sm">
                  Quality {formatScore(film.point.quality)} · Enjoyment{" "}
                  {formatScore(film.point.enjoyment)}
                </span>
                {/* Each film is classified by its OWN scores. Films sharing
                    a marker on the group chart can still differ here. */}
                <span className="text-sm font-medium">
                  {PLACEMENT_LABELS[classify(film.point)]}
                </span>
              </span>
              {/* Spins while this film's page is loading. "ml-auto" pushes it
                  to the right-hand end of the row. */}
              <PendingMark className="ml-auto" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
