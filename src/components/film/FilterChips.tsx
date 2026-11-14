import Link from "next/link";
import { FILTER_ROWS, filterHref } from "@/lib/filters";
import { PLACEMENT_LABELS, PLACEMENTS, type Placement } from "@/lib/quadrant";

type Props = {
  /** How many films have each placement (from countByPlacement). */
  counts: Record<Placement, number>;
  /** The filter chosen in the address, or null for "all films". */
  active: Placement | null;
  /** The page these chips are on: "/", "/friends", ... */
  basePath: string;
  /** Other settings in the address to keep, such as the sort order. */
  otherParams?: Record<string, string>;
};

// One look for every chip; the variations are added below.
const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm";
const LINK_CHIP = `${CHIP} border-foreground/30 hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2`;
// The chosen chip is filled in. It is ALSO marked with aria-current, so it
// is not told apart by colour alone (NFR14).
const ACTIVE_CHIP = `${CHIP} border-foreground bg-foreground text-background focus-visible:outline-2 focus-visible:outline-offset-2`;

/**
 * The filter chips above a film list: "All", then the thirteen placements
 * in three rows, each with the number of films it holds (R34).
 *
 * Every chip is a plain link to the same page with ?filter=... in the
 * address. There is no JavaScript here at all: choosing a filter is just
 * following a link, so Back, refresh and bookmarks all work as expected.
 */
export function FilterChips({
  counts,
  active,
  basePath,
  otherParams = {},
}: Props) {
  // The thirteen counts always add up to the number of films, because each
  // film has exactly one placement.
  const total = PLACEMENTS.reduce(
    (sum, placement) => sum + counts[placement],
    0,
  );

  return (
    <nav aria-label="Filter by placement" className="flex flex-col gap-2">
      <div>
        <Link
          href={filterHref(basePath, null, otherParams)}
          aria-current={active === null ? "true" : undefined}
          className={active === null ? ACTIVE_CHIP : LINK_CHIP}
        >
          All <span className="tabular-nums opacity-80">{total}</span>
        </Link>
      </div>

      {FILTER_ROWS.map((row) => (
        <ul
          key={row.name}
          // Names the row for screen readers ("Corners, list, 4 items").
          aria-label={row.name}
          className="flex flex-wrap gap-2"
        >
          {row.placements.map((placement) => {
            const count = counts[placement];
            const label = (
              <>
                {PLACEMENT_LABELS[placement]}{" "}
                <span className="tabular-nums opacity-80">{count}</span>
              </>
            );
            return (
              <li key={placement}>
                {count === 0 ? (
                  // Nothing to show, so not a link, but still drawn (greyed
                  // out, with its 0) so the rows keep the same shape as the
                  // member's log grows.
                  <span
                    data-filter={placement}
                    aria-disabled="true"
                    className={`${CHIP} border-foreground/15 opacity-50`}
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    data-filter={placement}
                    href={filterHref(basePath, placement, otherParams)}
                    aria-current={active === placement ? "true" : undefined}
                    className={active === placement ? ACTIVE_CHIP : LINK_CHIP}
                  >
                    {label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ))}
    </nav>
  );
}
