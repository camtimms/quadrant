import Link from "next/link";
import { PendingMark } from "@/components/PendingMark";
import { ACTIVE_CHIP, LINK_CHIP } from "@/components/film/FilterChips";
import { sortHref, type GroupSort } from "@/lib/data/groupFilms";
import type { FilmFilter } from "@/lib/filters";

/** The two orders, in the order they are offered, with their wording. */
const SORTS: readonly { sort: GroupSort; label: string }[] = [
  { sort: "recent", label: "Most recent" },
  { sort: "disagreement", label: "Biggest disagreement" },
];

type Props = {
  /** The order the list is in now. */
  active: GroupSort;
  /** The filter chosen in the address, which the links must keep. */
  filter: FilmFilter;
};

/**
 * The two ways to order the Friends' films list (R44).
 *
 * Like the filter chips, each is a plain link to the same page with the
 * choice in the address (?sort=disagreement). No JavaScript: Back, refresh
 * and bookmarks all work, and the choice survives choosing a filter.
 */
export function SortLinks({ active, filter }: Props) {
  return (
    <nav aria-label="Order" className="flex flex-wrap items-center gap-2">
      {/* Hidden from screen readers: the nav's own label already says it. */}
      <span aria-hidden="true" className="text-sm text-ink-muted">
        Order
      </span>
      {SORTS.map(({ sort, label }) => (
        <Link
          key={sort}
          href={sortHref(sort, filter)}
          // The chosen order is filled in AND marked for screen readers, so
          // it is not told apart by colour alone (NFR14).
          aria-current={active === sort ? "true" : undefined}
          className={active === sort ? ACTIVE_CHIP : LINK_CHIP}
        >
          {label}
          {/* Spins while the re-ordered page loads (NFR23). */}
          <PendingMark />
        </Link>
      ))}
    </nav>
  );
}
