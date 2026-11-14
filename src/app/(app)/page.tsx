import type { Metadata } from "next";
import { QuadrantChart } from "@/components/chart/QuadrantChart";
import { EmptyState } from "@/components/EmptyState";
import { FilmList } from "@/components/film/FilmList";
import { FilterChips } from "@/components/film/FilterChips";
import { getCurrentMember } from "@/lib/auth/member";
import { loadMemberFilms } from "@/lib/data/ratings";
import {
  filterFilms,
  filterHref,
  newestFirst,
  parseFilter,
} from "@/lib/filters";
import { classify, countByPlacement, PLACEMENT_LABELS } from "@/lib/quadrant";
import { parseTmdbId } from "@/lib/validation/rating";

export const metadata: Metadata = { title: "My films" };

/**
 * "/" — My films: everything the member has rated, as a chart and as a
 * filterable list (R30–R36, R53).
 *
 * The page is a Server Component and follows the same three steps as every
 * data page in the app (design section 6):
 *   1. fetch plain rows with the member's own session,
 *   2. pass them through the pure functions in lib/ (classify, count,
 *      filter, sort),
 *   3. hand the results to components to draw.
 * No calculation happens in the components, and none in the database.
 *
 * Two settings can be in the address:
 *   ?filter=masterpieces   show only that placement (and zoom the chart)
 *   ?rated=10999           a film that was just rated, to be pointed out
 * Both are typed by whoever wrote the address, so both are checked.
 */
export default async function MyFilmsPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const ratedId =
    typeof params.rated === "string" ? parseTmdbId(params.rated) : null;

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

  // One filtered list feeds BOTH the chart and the list below it, so the
  // two can never show different films (R34).
  const shown = filterFilms(films, filter);

  // Where the in-place editor returns to after saving: this page, with the
  // same filter still on (R51).
  const here = filterHref("/", filter);

  // The film the member has just rated, if the address names one and it
  // really is among their films. Looked up in ALL their films, so it is
  // found whatever filter is on.
  const justRated =
    ratedId === null ? undefined : films.find((f) => f.tmdbId === ratedId);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">My films</h1>

      {justRated ? (
        // R23: say where the film landed. The placement is worked out here,
        // from the stored scores, with the same classify() as everything
        // else on the page; nothing about it is taken from the address.
        // role="status" makes screen readers announce it.
        <p
          role="status"
          className="rounded border border-foreground/30 px-3 py-2 text-sm"
        >
          Saved. <strong className="font-semibold">{justRated.title}</strong> is{" "}
          {justRated.point.quality} / {justRated.point.enjoyment}:{" "}
          <strong className="font-semibold">
            {PLACEMENT_LABELS[classify(justRated.point)]}
          </strong>
          .
        </p>
      ) : null}

      <QuadrantChart
        films={shown}
        // With a filter on, the chart zooms to that placement's part (R53).
        zoomTo={filter}
        // Open the just-rated film's point, so it is easy to spot.
        initialSelectedId={justRated?.tmdbId ?? null}
        // This is the member's own chart, so scores can be changed in place.
        editReturnTo={here}
      />

      <section aria-labelledby="film-list" className="flex flex-col gap-4">
        <h2 id="film-list" className="text-lg font-semibold">
          {filter ? PLACEMENT_LABELS[filter] : "All films"}{" "}
          <span className="font-normal opacity-70">
            ({shown.length === 1 ? "1 film" : `${shown.length} films`})
          </span>
        </h2>
        <FilterChips
          // Counted over ALL the films, not the filtered ones, so every
          // chip keeps its number whichever is chosen.
          counts={countByPlacement(films.map((film) => film.point))}
          active={filter}
          basePath="/"
        />
        <FilmList films={shown} editReturnTo={here} />
      </section>
    </main>
  );
}
