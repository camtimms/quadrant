import Link from "next/link";
import type { ReactNode } from "react";
import { PendingMark } from "@/components/PendingMark";
import { pill, pillCurrent } from "@/components/ui/styles";
import {
  filterHref,
  quarterCount,
  QUARTERS,
  type FilmFilter,
} from "@/lib/filters";
import { PLACEMENT_LABELS, PLACEMENTS, type Placement } from "@/lib/quadrant";

type Props = {
  /** How many films have each placement (from countByPlacement). */
  counts: Record<Placement, number>;
  /** The filter chosen in the address (NO_FILTER for "all films"). */
  active: FilmFilter;
  /** The page these chips are on: "/", "/friends", ... */
  basePath: string;
  /** Other settings in the address to keep, such as the sort order. */
  otherParams?: Record<string, string>;
};

// The chips are the theme's pills (design 17.4), a little smaller than the
// navigation's. Exported so the order links on Friends' films look the
// same (SortLinks).
export const LINK_CHIP = `${pill} text-sm`;
// A chosen chip is yellow, bold and (in light mode) outlined. The most
// specific one is ALSO marked with aria-current, so it is not told apart by
// colour alone (NFR14).
export const ACTIVE_CHIP = `${pillCurrent} text-sm`;
// A chip with no films: drawn, but not a link. An outline instead of a
// fill, and the muted text colour, which still reads at 4.5 : 1.
const EMPTY_CHIP =
  "inline-flex items-center gap-1 rounded-full border border-well px-3 py-1.5 text-sm text-ink-muted";

/**
 * The filter chips above a film list (R88–R91, design 25.3).
 *
 * Row one: All, the four quadrants (each named after its corner) and On the
 * fence. Choosing a quadrant shows every film in it and reveals row two:
 * "Only <corner>", the quadrant's inner band, and the two line placements
 * along its edges. Each chip shows how many films it holds.
 *
 * Every chip is a plain link to the same page with ?quarter= and ?filter=
 * in the address. There is no JavaScript here at all: choosing a filter is
 * just following a link, so Back, refresh and bookmarks all work.
 */
export function FilterChips({
  counts,
  active,
  basePath,
  otherParams = {},
}: Props) {
  // Each film has exactly one placement, so these add up to the total.
  const total = PLACEMENTS.reduce(
    (sum, placement) => sum + counts[placement],
    0,
  );
  const href = (filter: FilmFilter) =>
    filterHref(basePath, filter, otherParams);
  const open = QUARTERS.find((q) => q.quarter === active.quarter);

  return (
    <nav aria-label="Filter by placement" className="flex flex-col gap-2">
      <ul aria-label="Quadrants" className="flex flex-wrap gap-2">
        <Chip
          label="All"
          count={total}
          href={href({ quarter: null, placement: null })}
          chosen={active.quarter === null && active.placement === null}
          current={active.quarter === null && active.placement === null}
        />
        {QUARTERS.map(({ quarter, corner }) => (
          <Chip
            key={quarter}
            label={PLACEMENT_LABELS[corner]}
            count={quarterCount(counts, quarter)}
            href={href({ quarter, placement: null })}
            // Stays yellow while a finer chip inside it is chosen ("you are
            // in here"); aria-current only when it is the whole selection.
            chosen={active.quarter === quarter}
            current={active.quarter === quarter && active.placement === null}
            filterName={quarter}
          />
        ))}
        <Chip
          label={PLACEMENT_LABELS["on-the-fence"]}
          count={counts["on-the-fence"]}
          href={href({ quarter: null, placement: "on-the-fence" })}
          chosen={active.placement === "on-the-fence"}
          current={active.placement === "on-the-fence"}
          filterName="on-the-fence"
        />
      </ul>

      {open ? (
        // A shaded box with its own small heading, so the finer chips read
        // as belonging to the chosen quadrant rather than as more of row one.
        <div className="flex flex-col gap-2 rounded-2xl bg-card p-3">
          <p
            aria-hidden="true"
            className="text-xs font-semibold text-ink-muted"
          >
            Within {PLACEMENT_LABELS[open.corner]}
          </p>
          <ul
            // Names the row for screen readers ("Within Masterpieces, list,
            // 4 items"); the visible heading above says the same.
            aria-label={`Within ${PLACEMENT_LABELS[open.corner]}`}
            className="flex flex-wrap gap-2"
          >
            {open.placements.map((placement) => (
              <Chip
                key={placement}
                label={
                  placement === open.corner
                    ? `Only ${PLACEMENT_LABELS[placement]}`
                    : PLACEMENT_LABELS[placement]
                }
                count={counts[placement]}
                href={href({ quarter: open.quarter, placement })}
                chosen={active.placement === placement}
                current={active.placement === placement}
                filterName={placement}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}

/** One chip: a link with its count, or greyed out when it holds nothing. */
function Chip({
  label,
  count,
  href,
  chosen,
  current,
  filterName,
}: {
  label: string;
  count: number;
  href: string;
  /** Drawn as chosen (yellow). */
  chosen: boolean;
  /** The most specific choice: announced as the current one. */
  current: boolean;
  /** For tests and the end-to-end suite to find a chip by its name. */
  filterName?: string;
}) {
  const text: ReactNode = (
    <>
      {label} <span className="tabular-nums">{count}</span>
    </>
  );
  return (
    <li>
      {count === 0 && !chosen ? (
        // Nothing to show, so not a link, but still drawn (greyed out, with
        // its 0) so the rows keep their shape as films are added (E76).
        <span
          data-filter={filterName}
          aria-disabled="true"
          className={EMPTY_CHIP}
        >
          {text}
        </span>
      ) : (
        <Link
          data-filter={filterName}
          href={href}
          aria-current={current ? "true" : undefined}
          className={chosen ? ACTIVE_CHIP : LINK_CHIP}
        >
          {text}
          {/* Spins on the chip that was tapped while the filtered page
              loads. The chart stays on screen meanwhile so its zoom can
              animate. */}
          <PendingMark />
        </Link>
      )}
    </li>
  );
}
