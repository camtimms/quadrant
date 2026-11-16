import Link from "next/link";
import { ArrowKeyList } from "@/components/ArrowKeyList";
import { PendingMark } from "@/components/PendingMark";
import type { ChartFilm } from "@/components/chart/QuadrantChart";
import { formatScore } from "@/components/chart/scale";
import { FilmPageButton } from "@/components/film/FilmPageButton";
import { PosterImage } from "@/components/film/PosterImage";
import { GroupLine } from "@/components/film/RaterLines";
import { InlineRatingEditor } from "@/components/rating/InlineRatingEditor";
import { ARROW_ITEM } from "@/lib/arrowKeys";
import { classify, PLACEMENT_LABELS } from "@/lib/quadrant";

/**
 * A film in a list: everything the chart needs, plus when it was rated,
 * which the list is ordered by (R36).
 */
export type ListFilm = ChartFilm & {
  /** A timestamp as the database writes it. */
  ratedAt: string;
};

type Props = {
  films: ListFilm[];
  /**
   * Give this, and each film gets an "Update scores" control that saves and
   * comes back to this address (R51). Leave it out for a list that is not
   * the viewer's own, such as another member's films or group averages:
   * there is then no way to edit anything (R46).
   */
  editReturnTo?: string;
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
export function FilmList({ films, editReturnTo }: Props) {
  if (films.length === 0) {
    return <p className="text-sm opacity-70">No films to show here.</p>;
  }

  // ArrowKeyList: Up and Down move between the films, as Tab does (R64).
  return (
    <ArrowKeyList className="flex flex-col gap-1">
      {films.map((film) => (
        <li key={film.tmdbId} className="flex flex-col gap-1">
          <Link
            href={`/film/${film.tmdbId}`}
            {...ARROW_ITEM}
            className="flex items-center gap-4 rounded p-2 hover:bg-foreground/10 active:bg-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2"
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
              {/* Group lists only. Who the raters were is NOT repeated
                  here: that is in the panel, where a member has asked about
                  one film (design 16.5). */}
              {film.ratedBy !== undefined ? (
                <GroupLine
                  ratedBy={film.ratedBy}
                  disagreement={film.disagreement}
                />
              ) : null}
            </span>
            {/* Spins while this film's page is loading. "ml-auto" pushes it
                to the right-hand end of the row. */}
            <PendingMark className="ml-auto" />
          </Link>

          {/* The row's buttons. They sit beside the link above, never
              inside it: a button inside a link would also follow the link
              when pressed. flex-wrap lets the open editor take a full line
              of its own, with "Film page" dropping below it. */}
          <div className="flex flex-wrap items-start gap-2 px-2 pb-2">
            {editReturnTo !== undefined ? (
              <InlineRatingEditor
                // The key changes whenever the rating is saved (changedAt is
                // stamped by the database on every save). A new key makes
                // React replace the editor with a fresh, closed one, which
                // is how it shuts after a successful save.
                key={film.changedAt}
                film={film}
                returnTo={editReturnTo}
              />
            ) : null}
            <FilmPageButton tmdbId={film.tmdbId} title={film.title} />
          </div>
        </li>
      ))}
    </ArrowKeyList>
  );
}
