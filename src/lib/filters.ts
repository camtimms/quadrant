import {
  classify,
  PLACEMENTS,
  type Placement,
  type Point,
} from "@/lib/quadrant";

/**
 * Filtering and ordering a list of films (R34, R36).
 *
 * The chosen filter lives in the page address, for example
 * /?filter=guilty-pleasures, so it survives a refresh, works with the Back
 * button and can be bookmarked (design section 6). That also means the value
 * is typed by whoever wrote the address, so it is checked before use.
 *
 * Pure functions, no React: tested on their own in filters.test.ts.
 */

/**
 * Read the filter from the address. Returns the placement, or null for "no
 * filter" when the value is missing or is not one of the thirteen names.
 *
 * `raw` may be a list because an address can repeat a setting
 * (?filter=a&filter=b); the first one is used.
 */
export function parseFilter(
  raw: string | string[] | undefined,
): Placement | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  // .find() on the list of real names, rather than looking the value up as
  // a key of an object. A lookup would "find" words like "constructor" or
  // "toString", which every JavaScript object has built in.
  return PLACEMENTS.find((placement) => placement === value) ?? null;
}

/** Keep only the films with the chosen placement; all of them if none. */
export function filterFilms<T extends { point: Point }>(
  films: readonly T[],
  filter: Placement | null,
): T[] {
  if (filter === null) return [...films];
  // The same classify() the chips' counts use (countByPlacement), so the
  // list under a chip is always exactly as long as the number on it.
  return films.filter((film) => classify(film.point) === filter);
}

/**
 * Most recently rated first (R36). `ratedAt` is a timestamp as the database
 * writes it.
 *
 * The times are turned into real moments (Date.parse) before comparing.
 * Comparing them as text looks tempting and usually works, but goes wrong as
 * soon as two times are written with different offsets.
 *
 * Returns a new list; the one passed in is left alone.
 */
export function newestFirst<T extends { ratedAt: string }>(
  films: readonly T[],
): T[] {
  // toSorted() is the copy-then-sort version of sort(). JavaScript's sort is
  // "stable": films with equal times keep the order they came in.
  return films.toSorted(
    (a, b) => Date.parse(b.ratedAt) - Date.parse(a.ratedAt),
  );
}

/**
 * The filter chips, in the three rows they are shown in. Written out by hand
 * (rather than sliced from PLACEMENTS) so the grouping is plain to read; a
 * test checks that every placement appears exactly once.
 */
export const FILTER_ROWS: readonly {
  name: string;
  placements: readonly Placement[];
}[] = [
  {
    name: "Corners",
    placements: [
      "masterpieces",
      "guilty-pleasures",
      "serious-watches",
      "dumpster-fires",
    ],
  },
  {
    name: "Inner bands",
    placements: [
      "worth-watching",
      "cheap-thrills",
      "respectable",
      "not-worth-watching",
    ],
  },
  {
    name: "On a line",
    placements: ["good", "bad", "enjoyable", "not-enjoyable", "on-the-fence"],
  },
];

/**
 * The address for a page with a filter chosen (or with none, for "All").
 *
 * `otherParams` are settings already in the address that must be kept, such
 * as the sort order on the friends page.
 */
export function filterHref(
  basePath: string,
  filter: Placement | null,
  otherParams: Record<string, string> = {},
): string {
  const params = new URLSearchParams(otherParams);
  if (filter) params.set("filter", filter);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
