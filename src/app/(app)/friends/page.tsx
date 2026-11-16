import type { Metadata } from "next";
import { QuadrantChart } from "@/components/chart/QuadrantChart";
import { EmptyState } from "@/components/EmptyState";
import { FilmList } from "@/components/film/FilmList";
import { FilterChips } from "@/components/film/FilterChips";
import { SortLinks } from "@/components/film/SortLinks";
import { getCurrentMember } from "@/lib/auth/member";
import { loadAllRatings } from "@/lib/data/allRatings";
import {
  groupFilms,
  parseSort,
  sortGroupFilms,
  sortParams,
} from "@/lib/data/groupFilms";
import { filterFilms, parseFilter } from "@/lib/filters";
import { countByPlacement, PLACEMENT_LABELS } from "@/lib/quadrant";

export const metadata: Metadata = { title: "Friends' films" };

/**
 * /friends — Friends' films: every film anyone in the group has rated, each
 * placed at the group's AVERAGE of it, as a chart and a list (R43–R45).
 *
 * It follows the same three steps as My films: fetch plain rows, pass them
 * through pure functions, draw the result. The difference is the middle
 * step. My films has one rating per film; here every member's ratings of a
 * film are first folded into one entry (groupFilms), and everything after
 * that — counting, filtering, the chart — works on the average exactly as
 * it works on a single rating.
 *
 * Two settings can be in the address, both checked before use:
 *   ?filter=masterpieces   show only that placement (and zoom the chart)
 *   ?sort=disagreement     list the most argued-over films first
 *
 * Nothing is remembered between visits: the ratings are read afresh every
 * time, so a rating a friend saved a moment ago is included (R47).
 */
export default async function FriendsFilmsPage({
  searchParams,
}: PageProps<"/friends">) {
  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const sort = parseSort(params.sort);

  // The layout sends anyone who is not a member elsewhere; while it does,
  // this page simply shows nothing.
  const member = await getCurrentMember();
  if (!member?.isMember) return null;

  const films = sortGroupFilms(groupFilms(await loadAllRatings()), sort);

  if (films.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">Friends&apos; films</h1>
        <EmptyState heading="Nobody has rated a film yet" />
      </main>
    );
  }

  // One filtered list feeds both the chart and the list, as on My films.
  // The filter looks at each film's average (R43).
  const shown = filterFilms(films, filter);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Friends&apos; films</h1>
        <p className="text-sm text-ink-muted">
          Every film anyone here has rated, yours included, placed at the
          group&apos;s average score.
        </p>
      </div>

      <QuadrantChart
        films={shown}
        // Averages have one decimal place, so two films can be almost on
        // top of each other without being at the same spot. A cell of half
        // a point merges those into one marker with a count (R31).
        cellSize={0.5}
        zoomTo={filter}
        initialSelectedId={null}
        // No editReturnTo: an average is nobody's rating to edit.
      />

      <section aria-labelledby="film-list" className="flex flex-col gap-4">
        <h2 id="film-list" className="text-lg font-semibold">
          {filter ? PLACEMENT_LABELS[filter] : "All films"}{" "}
          <span className="font-normal text-ink-muted">
            ({shown.length === 1 ? "1 film" : `${shown.length} films`})
          </span>
        </h2>
        <FilterChips
          counts={countByPlacement(films.map((film) => film.point))}
          active={filter}
          basePath="/friends"
          // Choosing a filter keeps the order the list is in.
          otherParams={sortParams(sort)}
        />
        <SortLinks active={sort} filter={filter} />
        <FilmList films={shown} />
      </section>
    </main>
  );
}
