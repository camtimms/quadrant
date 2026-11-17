import type { Metadata } from "next";
import { QuadrantChart } from "@/components/chart/QuadrantChart";
import { EmptyState } from "@/components/EmptyState";
import { FilmList } from "@/components/film/FilmList";
import { FilterChips } from "@/components/film/FilterChips";
import { RecentRatings } from "@/components/film/RecentRatings";
import { SortLinks } from "@/components/film/SortLinks";
import { getCurrentMember } from "@/lib/auth/member";
import { loadAllRatings } from "@/lib/data/allRatings";
import {
  FEED_STEP,
  groupFilms,
  parseShown,
  parseSort,
  recentFeed,
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
 *   ?shown=100             in most-recent order, how many ratings the feed
 *                          shows (R77, E61)
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
  const shown = parseShown(params.shown);

  // The layout sends anyone who is not a member elsewhere; while it does,
  // this page simply shows nothing.
  const member = await getCurrentMember();
  if (!member?.isMember) return null;

  const rows = await loadAllRatings();
  const films = sortGroupFilms(groupFilms(rows), sort);

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
  const filmsShown = filterFilms(films, filter);

  // R77: in most-recent order, the list under the chart is a feed of
  // ratings, filtered by the same group placement as the chart (E62).
  const feed =
    sort === "recent" ? recentFeed(rows, films, filter, shown) : null;
  const moreParams = new URLSearchParams({
    ...(filter ? { filter } : {}),
    shown: String(shown + FEED_STEP),
  });

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
        films={filmsShown}
        // Averages have one decimal place, so two films can be almost on
        // top of each other without being at the same spot. A cell of half
        // a point merges those into one marker with a count (R31).
        mergeWithin={0.5}
        zoomTo={filter}
        initialSelectedId={null}
        // No editReturnTo: an average is nobody's rating to edit.
      />

      <section aria-labelledby="film-list" className="flex flex-col gap-4">
        <h2 id="film-list" className="text-lg font-semibold">
          {feed ? (
            // A list of ratings, not films, so no film count; the filter,
            // when there is one, is named instead.
            <>
              Recent ratings
              {filter ? (
                <span className="font-normal text-ink-muted">
                  {" "}
                  · {PLACEMENT_LABELS[filter]}
                </span>
              ) : null}
            </>
          ) : (
            <>
              {filter ? PLACEMENT_LABELS[filter] : "All films"}{" "}
              <span className="font-normal text-ink-muted">
                (
                {filmsShown.length === 1
                  ? "1 film"
                  : `${filmsShown.length} films`}
                )
              </span>
            </>
          )}
        </h2>
        <FilterChips
          counts={countByPlacement(films.map((film) => film.point))}
          active={filter}
          basePath="/friends"
          // Choosing a filter keeps the order the list is in.
          otherParams={sortParams(sort)}
        />
        <SortLinks active={sort} filter={filter} />
        {feed ? (
          <RecentRatings
            entries={feed.entries}
            more={feed.more}
            moreHref={`/friends?${moreParams}`}
            viewer={{
              userId: member.userId,
              displayName: member.displayName ?? "You",
            }}
          />
        ) : (
          <FilmList films={filmsShown} />
        )}
      </section>
    </main>
  );
}
