import type { Metadata } from "next";
import { QuadrantChart } from "@/components/chart/QuadrantChart";
import { EmptyState } from "@/components/EmptyState";
import { FilmList } from "@/components/film/FilmList";
import { FilterChips } from "@/components/film/FilterChips";
import { getCurrentMember } from "@/lib/auth/member";
import { loadMemberFilms } from "@/lib/data/ratings";
import { filterFilms, newestFirst, parseFilter } from "@/lib/filters";
import { countByPlacement, PLACEMENT_LABELS } from "@/lib/quadrant";

export const metadata: Metadata = { title: "My films" };

/**
 * "/" — My films: everything the member has rated, as a chart and as a
 * filterable list (R30–R36).
 *
 * The page is a Server Component and follows the same three steps as every
 * data page in the app (design section 6):
 *   1. fetch plain rows with the member's own session,
 *   2. pass them through the pure functions in lib/ (classify, count,
 *      filter, sort),
 *   3. hand the results to components to draw.
 * No calculation happens in the components, and none in the database.
 */
export default async function MyFilmsPage({ searchParams }: PageProps<"/">) {
  // The chosen filter lives in the address: /?filter=masterpieces
  const { filter: rawFilter } = await searchParams;
  const filter = parseFilter(rawFilter);

  // The layout sends anyone who is not a member elsewhere; while it does,
  // this page simply shows nothing.
  const member = await getCurrentMember();
  if (!member?.isMember) return null;

  const films = newestFirst(await loadMemberFilms(member.userId));

  if (films.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">My films</h1>
        <EmptyState />
      </main>
    );
  }

  const listed = filterFilms(films, filter);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">My films</h1>

      {/* The chart always shows every film. The filter narrows the LIST
          below, so the whole picture stays in view while reading one part
          of it. */}
      <QuadrantChart films={films} />

      <section aria-labelledby="film-list" className="flex flex-col gap-4">
        <h2 id="film-list" className="text-lg font-semibold">
          {filter ? PLACEMENT_LABELS[filter] : "All films"}{" "}
          <span className="font-normal opacity-70">
            ({listed.length === 1 ? "1 film" : `${listed.length} films`})
          </span>
        </h2>
        <FilterChips
          // Counted over ALL the films, not the filtered ones, so every
          // chip keeps its number whichever is chosen.
          counts={countByPlacement(films.map((film) => film.point))}
          active={filter}
          basePath="/"
        />
        <FilmList films={listed} />
      </section>
    </main>
  );
}
