import type { ListFilm } from "@/components/film/FilmList";
import { filterHref, newestFirst } from "@/lib/filters";
import {
  filmDisagreement,
  groupAverage,
  type Placement,
  type Point,
} from "@/lib/quadrant";

/**
 * Turning every member's ratings into one entry per film, for the Friends'
 * films page (R43–R45).
 *
 * Pure functions: rows in, films out, no database and no React. The page
 * fetches the rows (allRatings.ts), passes them through here, and draws the
 * result. All the arithmetic is done by the tested functions in
 * src/lib/quadrant, so this page, the film page and the charts can never
 * disagree about an average (NFR17).
 */

/** One member's current rating of one film, with the film's details. */
export type RatingRow = {
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  /** That member's two scores. */
  point: Point;
  /** When that member first rated the film, as the database writes it. */
  ratedAt: string;
};

/** A film as the group sees it. */
export type GroupFilm = ListFilm & {
  /** How many members have rated it. Always at least 1. */
  ratedBy: number;
  /**
   * The biggest disagreement between any two members' ratings, or null when
   * only one member has rated it. Null is not 0: zero means "they agree
   * exactly", and one rating is nobody agreeing or disagreeing (R45).
   */
  disagreement: number | null;
};

/**
 * Group the rows by film. Each film comes out with:
 *  - `point`: the group average of its ratings, rounded to one decimal;
 *  - `ratedBy`: the number of ratings;
 *  - `disagreement`: its biggest clash (see GroupFilm);
 *  - `ratedAt`: the most recent time any member first rated it.
 *
 * Films come out in the order each first appears in the rows.
 */
export function groupFilms(rows: readonly RatingRow[]): GroupFilm[] {
  // A Map remembers the order keys were added, which keeps the films in
  // the order they first appeared.
  const rowsByFilm = new Map<number, RatingRow[]>();
  for (const row of rows) {
    const sameFilm = rowsByFilm.get(row.tmdbId);
    if (sameFilm) sameFilm.push(row);
    else rowsByFilm.set(row.tmdbId, [row]);
  }

  return Array.from(rowsByFilm.values(), (filmRows) => {
    const [first] = filmRows;
    const points = filmRows.map((row) => row.point);

    // Compared as moments in time, not as text (see newestFirst).
    let latest = first.ratedAt;
    for (const row of filmRows) {
      if (Date.parse(row.ratedAt) > Date.parse(latest)) latest = row.ratedAt;
    }

    return {
      tmdbId: first.tmdbId,
      title: first.title,
      year: first.year,
      posterPath: first.posterPath,
      // Never null here: every film in the map has at least one rating. The
      // "!" tells TypeScript so.
      point: groupAverage(points)!,
      ratedAt: latest,
      ratedBy: filmRows.length,
      disagreement: filmDisagreement(points),
    };
  });
}

// ---------------------------------------------------------------------------
// The order of the list (R44)
// ---------------------------------------------------------------------------

/** The two orders the list can be shown in. */
export type GroupSort = "recent" | "disagreement";

/** What the list shows when the address does not say. */
export const DEFAULT_SORT: GroupSort = "recent";

/**
 * Read the order from the address (?sort=disagreement). Anything missing or
 * unrecognised means the default, as with the filter (see parseFilter).
 */
export function parseSort(raw: string | string[] | undefined): GroupSort {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "disagreement" ? "disagreement" : DEFAULT_SORT;
}

/**
 * The films in the chosen order. Returns a new list.
 *
 *  - "recent": the most recently rated film first.
 *  - "disagreement": the largest disagreement first. Films only one member
 *    has rated have no disagreement and go last, AFTER a film everyone
 *    agrees on exactly (0): that film has an answer, these have none yet.
 *    Films that tie are in most-recent order.
 */
export function sortGroupFilms(
  films: readonly GroupFilm[],
  sort: GroupSort,
): GroupFilm[] {
  const recent = newestFirst(films);
  if (sort === "recent") return recent;

  // -1 is below every real disagreement (the smallest is 0), so films with
  // none sink to the bottom. The sort is "stable": films that compare equal
  // keep the most-recent order they already have.
  const value = (film: GroupFilm) => film.disagreement ?? -1;
  return recent.toSorted((a, b) => value(b) - value(a));
}

/**
 * The address of the Friends' films page in a given order, keeping the
 * chosen filter. The default order is left out, so the plain address
 * "/friends" stays the default view.
 */
export function sortHref(sort: GroupSort, filter: Placement | null): string {
  return filterHref("/friends", filter, sortParams(sort));
}

/** The order as an address setting, for links that must keep it. */
export function sortParams(sort: GroupSort): Record<string, string> {
  return sort === DEFAULT_SORT ? {} : { sort };
}
