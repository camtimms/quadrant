import {
  classify,
  PLACEMENT_LABELS,
  PLACEMENTS,
  type Corner,
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

/** The four quadrants of the chart (R88). */
export type Quarter = "top-right" | "top-left" | "bottom-right" | "bottom-left";

/**
 * Each quadrant, the corner whose name its chip carries, and the four
 * placements it holds in the order its finer chips are shown: the corner,
 * the inner band, then the two "on a line" placements along its edges
 * (R89, R91). A line placement is in BOTH quadrants it borders. On the
 * fence (5 / 5) is in none: it has a chip of its own (R90).
 *
 * Written out by hand so it reads like the chart; tests check that every
 * placement but On the fence is in at least one quadrant.
 */
export const QUARTERS: readonly {
  quarter: Quarter;
  corner: Corner;
  placements: readonly Placement[];
}[] = [
  {
    quarter: "top-right",
    corner: "masterpieces",
    placements: ["masterpieces", "worth-watching", "good", "enjoyable"],
  },
  {
    quarter: "top-left",
    corner: "guilty-pleasures",
    placements: ["guilty-pleasures", "cheap-thrills", "bad", "enjoyable"],
  },
  {
    quarter: "bottom-right",
    corner: "serious-watches",
    placements: ["serious-watches", "respectable", "good", "not-enjoyable"],
  },
  {
    quarter: "bottom-left",
    corner: "dumpster-fires",
    placements: [
      "dumpster-fires",
      "not-worth-watching",
      "bad",
      "not-enjoyable",
    ],
  },
];

/**
 * What the member has chosen: a quadrant, a placement, both (a finer chip
 * inside a quadrant), or neither (All). Kept in the address as ?quarter=
 * and ?filter= (design 25.1).
 */
export type FilmFilter = {
  quarter: Quarter | null;
  placement: Placement | null;
};

/** "All": nothing chosen. */
export const NO_FILTER: FilmFilter = { quarter: null, placement: null };

/** The placements a quadrant holds. */
function placementsOf(quarter: Quarter): readonly Placement[] {
  return QUARTERS.find((q) => q.quarter === quarter)!.placements;
}

/**
 * Read the filter from the address: ?quarter= and ?filter=. Anything
 * unrecognised is ignored, as for the placement on its own.
 *
 *  - A placement outside the named quadrant is dropped (E75).
 *  - A placement with no quadrant (an address from before quadrants, E74)
 *    gets the first quadrant that holds it: the upper or right-hand one
 *    for a line placement, because QUARTERS lists those first.
 *  - On the fence has no quadrant (R90).
 */
export function parseFilmFilter(
  rawQuarter: string | string[] | undefined,
  rawPlacement: string | string[] | undefined,
): FilmFilter {
  const value = Array.isArray(rawQuarter) ? rawQuarter[0] : rawQuarter;
  const quarter = QUARTERS.find((q) => q.quarter === value)?.quarter ?? null;
  const placement = parseFilter(rawPlacement);

  if (quarter) {
    return {
      quarter,
      placement:
        placement && placementsOf(quarter).includes(placement)
          ? placement
          : null,
    };
  }
  if (placement) {
    const home = QUARTERS.find((q) => q.placements.includes(placement));
    return { quarter: home?.quarter ?? null, placement };
  }
  return NO_FILTER;
}

/**
 * Does a point belong under this filter? The chosen placement if there is
 * one, else the quadrant's four placements, else everything.
 *
 * The same classify() the chips' counts use (countByPlacement), so the list
 * under a chip is always exactly as long as the number on it.
 */
export function matchesFilter(point: Point, filter: FilmFilter): boolean {
  if (filter.placement) return classify(point) === filter.placement;
  if (filter.quarter) {
    return placementsOf(filter.quarter).includes(classify(point));
  }
  return true;
}

/** Keep only the films the filter matches, in their original order. */
export function filterFilms<T extends { point: Point }>(
  films: readonly T[],
  filter: FilmFilter,
): T[] {
  return films.filter((film) => matchesFilter(film.point, filter));
}

/**
 * What the list's heading calls the filter: "All films", "Masterpieces
 * quadrant" for a whole quadrant (its chip says only "Masterpieces", but the
 * list holds the whole quarter), "Only Masterpieces" for the corner chosen
 * inside it, or the placement's own name.
 */
export function filterTitle(filter: FilmFilter): string {
  const quarter = QUARTERS.find((q) => q.quarter === filter.quarter);
  if (filter.placement) {
    return quarter && filter.placement === quarter.corner
      ? `Only ${PLACEMENT_LABELS[filter.placement]}`
      : PLACEMENT_LABELS[filter.placement];
  }
  if (quarter) return `${PLACEMENT_LABELS[quarter.corner]} quadrant`;
  return "All films";
}

/**
 * The number on a quadrant's chip: the sum of its four placements' counts.
 * Each film has one placement, so nothing is counted twice within one
 * quadrant; a film on a line is counted once in each quadrant it borders.
 */
export function quarterCount(
  counts: Record<Placement, number>,
  quarter: Quarter,
): number {
  return placementsOf(quarter).reduce(
    (sum, placement) => sum + counts[placement],
    0,
  );
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
 * The address for a page with a filter chosen (or with none, for "All").
 *
 * `otherParams` are settings already in the address that must be kept, such
 * as the sort order on the friends page.
 */
export function filterHref(
  basePath: string,
  filter: FilmFilter,
  otherParams: Record<string, string> = {},
): string {
  const params = new URLSearchParams(otherParams);
  if (filter.quarter) params.set("quarter", filter.quarter);
  if (filter.placement) params.set("filter", filter.placement);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
