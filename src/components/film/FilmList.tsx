import Link from "next/link";
import type { ChartFilm } from "@/components/chart/QuadrantChart";
import { formatScore } from "@/components/chart/scale";
import { PosterImage } from "@/components/film/PosterImage";
import { classify, PLACEMENT_LABELS } from "@/lib/quadrant";

/**
 * A film in a list: everything the chart needs, plus when it was rated,
 * which the list is ordered by (R36).
 */
export type ListFilm = ChartFilm & {
  /** A timestamp as the database writes it. */
  ratedAt: string;
};

/**
 * The same films as the chart, as a list: poster, title, year, both scores
 * and placement (R33).
 *
 * The chart is never the only way to get at the information (NFR13).
 * Anything a member can learn by looking at a dot, they can read here.
 *
 * Films are shown in the order given. Filtering and "newest first" are done
 * by the page, with the functions in src/lib/filters.ts, before the list
 * gets here.
 */
export function FilmList({ films }: { films: ListFilm[] }) {
  if (films.length === 0) {
    return <p className="text-sm opacity-70">No films to show here.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {films.map((film) => (
        <li key={film.tmdbId}>
          <Link
            href={`/film/${film.tmdbId}`}
            className="flex items-center gap-4 rounded p-2 hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <PosterImage
              posterPath={film.posterPath}
              title={film.title}
              size="list"
            />
            {/* min-w-0 lets a long title wrap instead of widening the row. */}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span
                data-testid="film-title"
                className="font-medium break-words"
              >
                {film.title}
              </span>
              <span className="text-sm opacity-70">
                {film.year ?? "Year unknown"}
              </span>
              <span className="text-sm">
                Quality {formatScore(film.point.quality)} · Enjoyment{" "}
                {formatScore(film.point.enjoyment)}
              </span>
              {/* Worked out from the scores every time, never stored, so a
                  renamed or re-drawn placement applies to old ratings too. */}
              <span className="text-sm font-medium">
                {PLACEMENT_LABELS[classify(film.point)]}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
