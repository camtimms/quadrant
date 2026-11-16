import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QuadrantChart } from "@/components/chart/QuadrantChart";
import { CommonFilms } from "@/components/film/CommonFilms";
import { getCurrentMember } from "@/lib/auth/member";
import { loadMemberName } from "@/lib/data/member";
import { loadMemberFilms } from "@/lib/data/ratings";
import { filmsInCommon } from "@/lib/quadrant";
import { parseMemberId } from "@/lib/validation/memberId";

export const metadata: Metadata = { title: "Compare" };

/**
 * /members/<id>/compare — you and another member side by side (R75, R76,
 * design 21.2): both quadrant charts, then the films you have both rated,
 * the biggest disagreement first.
 *
 * Same checks as the member page it is reached from: an id that is not a
 * member's is "not found" (E60), and your own id sends you to My films
 * (E59). Both charts are read-only: no editReturnTo is given.
 */
export default async function ComparePage({
  params,
}: PageProps<"/members/[id]/compare">) {
  const memberId = parseMemberId((await params).id);
  if (memberId === null) notFound();

  const viewer = await getCurrentMember();
  if (!viewer?.isMember) return null;
  if (memberId === viewer.userId) redirect("/");

  const name = await loadMemberName(memberId);
  if (name === null) notFound();

  // Two queries, run at the same time: the same ones My films and the
  // member page make.
  const [mine, theirs] = await Promise.all([
    loadMemberFilms(viewer.userId),
    loadMemberFilms(memberId),
  ]);
  const pairs = filmsInCommon(mine, theirs);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold break-words">You and {name}</h1>

      {/* One column on a phone, where two charts side by side would each
          be too small to read; two from the "sm" width (640 px) up. */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section aria-labelledby="chart-you" className="flex flex-col gap-2">
          <h2 id="chart-you" className="text-lg font-semibold">
            You
          </h2>
          {mine.length > 0 ? (
            <QuadrantChart films={mine} initialSelectedId={null} />
          ) : (
            <p className="text-sm text-ink-muted">
              You haven&apos;t rated anything yet.
            </p>
          )}
        </section>
        <section aria-labelledby="chart-them" className="flex flex-col gap-2">
          <h2 id="chart-them" className="text-lg font-semibold break-words">
            {name}
          </h2>
          {theirs.length > 0 ? (
            <QuadrantChart films={theirs} initialSelectedId={null} />
          ) : (
            <p className="text-sm break-words text-ink-muted">
              {name} hasn&apos;t rated anything yet.
            </p>
          )}
        </section>
      </div>

      <section aria-labelledby="in-common" className="flex flex-col gap-3">
        <h2 id="in-common" className="text-lg font-semibold">
          Films you&apos;ve both rated{" "}
          <span className="font-normal text-ink-muted">
            ({pairs.length === 1 ? "1 film" : `${pairs.length} films`})
          </span>
        </h2>
        <CommonFilms pairs={pairs} theirName={name} />
      </section>
    </main>
  );
}
