import Link from "next/link";
import { PendingMark } from "@/components/PendingMark";
import { pill, pillCurrent } from "@/components/ui/styles";
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

// The chips are the theme's pills (design 17.4), a little smaller than the
// navigation's. Exported so the order links on Friends' films look the
// same (SortLinks).
export const LINK_CHIP = `${pill} text-sm`;
// The chosen chip is yellow, bold and (in light mode) outlined. It is ALSO
// marked with aria-current, so it is not told apart by colour alone (NFR14).
export const ACTIVE_CHIP = `${pillCurrent} text-sm`;
// A placement with no films: drawn, but not a link. An outline instead of a
// fill, and the muted text colour, which still reads at 4.5 : 1.
const EMPTY_CHIP =
  "inline-flex items-center gap-1 rounded-full border border-well px-3 py-1.5 text-sm text-ink-muted";

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
          All <span className="tabular-nums">{total}</span>
          <PendingMark />
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
                <span className="tabular-nums">{count}</span>
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
                    className={EMPTY_CHIP}
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
                    {/* Spins on the chip that was tapped while the filtered
                        page loads. The chart stays on screen meanwhile so
                        its zoom can animate. */}
                    <PendingMark />
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
