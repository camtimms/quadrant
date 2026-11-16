import type { ListFilm } from "@/components/film/FilmList";
import type { FilmRater } from "@/components/film/RaterLines";
import { filterHref, newestFirst } from "@/lib/filters";
import {
  classify,
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
  /** Who made the rating (R57). */
  userId: string;
  displayName: string;
  /** The address of their Google picture, or null (R61). */
  avatarUrl: string | null;
  /** Their written review in full, or null when they wrote none. */
  review: string | null;
  /** The rating's id, which its review's likes point at (R78). */
  ratingId: number;
  /** Who liked the review, sorted by name (R78). */
  likes: readonly { userId: string; displayName: string }[];
  /** How many times the member has watched the film (R84); 1 if left out. */
  timesWatched?: number;
};

/** How many raters the Friends' films panel lists for one film (R58). */
export const PANEL_RATERS = 3;

/** How many characters of a review the panel is given (R59). */
export const REVIEW_START = 200;

/**
 * The first REVIEW_START characters of a review, with "…" when it was cut.
 *
 * Why cut here, on the server: the chart runs in the browser, so everything
 * handed to it is sent with the page. Uncut, every review of every film
 * would be downloaded just to draw Friends' films (design 16.5).
 */
function reviewStart(review: string | null): string | null {
  if (!review) return null;
  // Spreading a string into a list splits it into whole characters. Slicing
  // the string itself counts in smaller units and could cut an emoji in
  // half (the same reason characterCount exists in validation/text.ts).
  const characters = [...review];
  if (characters.length <= REVIEW_START) return review;
  // trimEnd: no stray space between the last word and the ellipsis.
  return `${characters.slice(0, REVIEW_START).join("").trimEnd()}…`;
}

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
  /**
   * Who rated it: at most PANEL_RATERS members, the most recently rated
   * first. `ratedBy` minus this list's length is how many are left out.
   */
  raters: FilmRater[];
};

/**
 * Group the rows by film. Each film comes out with:
 *  - `point`: the group average of its ratings, rounded to one decimal;
 *  - `ratedBy`: the number of ratings;
 *  - `disagreement`: its biggest clash (see GroupFilm);
 *  - `ratedAt`: the most recent time any member first rated it;
 *  - `raters`: the few most recent raters, for the panel (see GroupFilm).
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

    // Newest first, compared as moments in time, not as text (see
    // newestFirst). toSorted returns a new list and leaves filmRows alone.
    const recent = filmRows.toSorted(
      (a, b) => Date.parse(b.ratedAt) - Date.parse(a.ratedAt),
    );

    return {
      tmdbId: first.tmdbId,
      title: first.title,
      year: first.year,
      posterPath: first.posterPath,
      // Never null here: every film in the map has at least one rating. The
      // "!" tells TypeScript so.
      point: groupAverage(points)!,
      ratedAt: recent[0].ratedAt,
      ratedBy: filmRows.length,
      disagreement: filmDisagreement(points),
      raters: recent.slice(0, PANEL_RATERS).map((row) => ({
        userId: row.userId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        point: row.point,
        reviewStart: reviewStart(row.review),
      })),
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

// ---------------------------------------------------------------------------
// The recent-ratings feed (R77, R78, design 22)
// ---------------------------------------------------------------------------

/** How many feed entries are shown at a time ("Show 50 more", E61). */
export const FEED_STEP = 50;

/** The most the address may ask for: 20 steps. */
const FEED_MAX = 1000;

/**
 * How many feed entries to show, from the address (?shown=100). Anything
 * that is not a whole step between FEED_STEP and FEED_MAX counts as the
 * first step, like the other settings read from the address.
 */
export function parseShown(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) return FEED_STEP;
  const shown = Number(value);
  return shown >= FEED_STEP && shown <= FEED_MAX && shown % FEED_STEP === 0
    ? shown
    : FEED_STEP;
}

/** One entry in the feed: a rating, with its review cut short. */
export type FeedEntry = Omit<RatingRow, "review"> & {
  /** The start of the review, as the panel's (REVIEW_START), or null. */
  reviewStart: string | null;
};

/**
 * The feed under Friends' films in most-recent order: one entry per rating,
 * newest first by when it was first made (E64: editing does not move it),
 * ties by rating id. With a placement filter, only ratings of films whose
 * GROUP average is in it (E62), so the feed agrees with the chart and the
 * chips. `more` says whether "Show 50 more" is needed (E61).
 *
 * Reviews are cut here, on the server, for the same reason as the panel's:
 * the page should not carry every review in full.
 */
export function recentFeed(
  rows: readonly RatingRow[],
  films: readonly GroupFilm[],
  filter: Placement | null,
  shown: number,
): { entries: FeedEntry[]; more: boolean } {
  const inFilter = filter
    ? new Set(
        films
          .filter((film) => classify(film.point) === filter)
          .map((film) => film.tmdbId),
      )
    : null;

  const matching = rows
    .filter((row) => !inFilter || inFilter.has(row.tmdbId))
    .sort(
      (a, b) =>
        Date.parse(b.ratedAt) - Date.parse(a.ratedAt) ||
        b.ratingId - a.ratingId,
    );

  return {
    entries: matching.slice(0, shown).map(({ review, ...rest }) => ({
      ...rest,
      reviewStart: reviewStart(review),
    })),
    more: matching.length > shown,
  };
}
