import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QuadrantChart } from "@/components/chart/QuadrantChart";
import { FilmList } from "@/components/film/FilmList";
import { FilterChips } from "@/components/film/FilterChips";
import { getCurrentMember } from "@/lib/auth/member";
import { loadMemberName } from "@/lib/data/member";
import { loadMemberFilms } from "@/lib/data/ratings";
import { filterFilms, newestFirst, parseFilter } from "@/lib/filters";
import { countByPlacement, PLACEMENT_LABELS } from "@/lib/quadrant";
import { parseMemberId } from "@/lib/validation/memberId";

export const metadata: Metadata = { title: "Member" };

/**
 * /members/<id> — another member's films: the same chart, filters and list
 * as My films, but read-only (R46).
 *
 * It is built from the very same components as My films. The only
 * difference is one prop: My films passes `editReturnTo`, which is what
 * makes "Update scores" appear, and this page does not. So there is no
 * second, read-only copy of the chart to keep in step.
 *
 * Leaving the button out is a courtesy, not the protection. Even a forged
 * request could not change someone else's rating: the database only lets a
 * member write rows carrying their own id (design section 3.5).
 */
export default async function MemberPage({
  params,
  searchParams,
}: PageProps<"/members/[id]">) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);

  // The id is text from the address bar, so it is checked first.
  const memberId = parseMemberId(rawId);
  if (memberId === null) notFound();

  // The layout sends anyone who is not a member elsewhere; while it does,
  // this page simply shows nothing.
  const viewer = await getCurrentMember();
  if (!viewer?.isMember) return null;

  // Your own page is My films, where your scores can be changed.
  if (memberId === viewer.userId) redirect("/");

  const name = await loadMemberName(memberId);
  // A well-formed id that belongs to nobody.
  if (name === null) notFound();

  const filter = parseFilter(query.filter);
  const films = newestFirst(await loadMemberFilms(memberId));
  const basePath = `/members/${memberId}`;

  if (films.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold break-words">
          {name}&apos;s films
        </h1>
        <p className="break-words text-ink-muted">
          {name} hasn&apos;t rated anything yet.
        </p>
      </main>
    );
  }

  // One filtered list feeds both the chart and the list, as on My films.
  const shown = filterFilms(films, filter);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold break-words">
        {name}&apos;s films
      </h1>

      {/* No editReturnTo here or on the list below: that is what keeps
          this page read-only. */}
      <QuadrantChart films={shown} zoomTo={filter} initialSelectedId={null} />

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
          // Filter links stay on this member's page.
          basePath={basePath}
        />
        <FilmList films={shown} />
      </section>
    </main>
  );
}
