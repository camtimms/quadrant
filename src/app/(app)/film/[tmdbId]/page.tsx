import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpokeMapSwitch } from "@/components/chart/SpokeMapSwitch";
import { GroupAverage } from "@/components/film/GroupAverage";
import { PosterImage } from "@/components/film/PosterImage";
import { RatingCards } from "@/components/film/RatingCards";
import { SpreadCurves } from "@/components/film/SpreadCurves";
import { DeleteRatingButton } from "@/components/rating/DeleteRatingButton";
import { EarlierViewings } from "@/components/rating/EarlierViewings";
import { MyRatingSection } from "@/components/rating/MyRatingSection";
import { RatingForm } from "@/components/rating/RatingForm";
import { RewatchSwitch } from "@/components/rating/RewatchSwitch";
import { getCurrentMember } from "@/lib/auth/member";
import { loadFilmPage } from "@/lib/data/filmPage";
import { MIN_RATINGS_FOR_SPREAD } from "@/lib/quadrant/spread";
import { textLink } from "@/components/ui/styles";
import { parseTmdbId } from "@/lib/validation/rating";

export const metadata: Metadata = { title: "Film" };

/**
 * /film/10999 — one film: its poster, title and year, the member's own
 * rating form (R13, R15–R21), and what everyone made of it: the group
 * average, the spoke map and a card for each member's rating (R37–R42, R60).
 *
 * "[tmdbId]" in the folder name is a dynamic segment: whatever is in that
 * position of the address arrives here as params.tmdbId. It is text typed
 * into an address bar, so it is checked before it is used for anything.
 */
export default async function FilmPage({
  params,
  searchParams,
}: PageProps<"/film/[tmdbId]">) {
  const { tmdbId: rawId } = await params;
  const tmdbId = parseTmdbId(rawId);
  // "?rated=10999" is added by the save action when it sends the member
  // back here (R23). Only a value naming THIS film counts; anything else
  // in the address is ignored, as everywhere.
  const { rated } = await searchParams;
  const justSaved = typeof rated === "string" && rated === String(tmdbId);
  // notFound() shows the "not found" page and stops here.
  if (tmdbId === null) notFound();

  // The layout also checks membership, but React renders this page at the
  // same time as that check, not after it. Loading the film can reach the
  // secret-key store (to refresh a stale copy), so this page makes sure for
  // itself. The layout handles sending a non-member somewhere useful.
  const member = await getCurrentMember();
  if (!member?.isMember || member.displayName === null) return null;

  const data = await loadFilmPage(tmdbId, member.userId);

  if (data.status === "not-found") notFound();

  if (data.status === "unavailable") {
    // E9: nobody has rated this film, so we have no copy to fall back on.
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">
          Can&apos;t load this film right now
        </h1>
        <p>
          The film database isn&apos;t answering. Nothing is wrong with your
          account, and your own films are unaffected.
        </p>
        <p className="flex gap-4">
          {/* A plain <a> (not <Link>) makes the browser load the page afresh,
              which is exactly what "try again" should mean. */}
          <a
            href={`/film/${tmdbId}`}
            className="underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Try again
          </a>
          <Link
            href="/search"
            className="underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Back to search
          </Link>
        </p>
      </main>
    );
  }

  const { film, titleId, myRating, ratings, earlierViewings } = data;
  const mine = ratings.find((rating) => rating.isViewer);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-start gap-4">
        <PosterImage
          posterPath={film.posterPath}
          title={film.title}
          size="page"
        />
        <div className="flex min-w-0 flex-col gap-1">
          {/* id="top": where "Back to top" at the end of the page leads. */}
          <h1
            id="top"
            className="scroll-mt-6 text-2xl font-semibold break-words"
          >
            {film.title}
          </h1>
          <p className="text-ink-muted">{film.year ?? "Year unknown"}</p>
          {/* R98: a short table of contents in the room beside the poster.
              Plain links to the sections' ids: the browser does the
              scrolling, no JavaScript needed. Only once someone has rated
              the film, as the sections are empty until then (E84). */}
          {ratings.length > 0 ? (
            <nav aria-label="On this page" className="mt-2 text-sm">
              <ul className="flex flex-col gap-1">
                <li>
                  <a href="#everyone" className={textLink}>
                    Everyone&apos;s ratings
                  </a>
                </li>
                <li>
                  <a href="#reviews" className={textLink}>
                    Reviews ({ratings.length})
                  </a>
                </li>
              </ul>
            </nav>
          ) : null}
        </div>
      </div>

      {/* TMDB's description of the film (R54). Shown only when there is
          one: an empty heading would be worse than no section. Rendered as
          plain text, so anything in it that looks like HTML is harmless.
          "whitespace-pre-line" keeps any line breaks TMDB put in. */}
      {film.overview ? (
        <section aria-labelledby="about-film" className="flex flex-col gap-2">
          <h2 id="about-film" className="text-lg font-semibold">
            About this film
          </h2>
          <p className="text-sm break-words whitespace-pre-line">
            {film.overview}
          </p>
        </section>
      ) : null}

      {/* Folds down to one line once the film is rated, so the form does
          not push everything else off a phone screen (R56). */}
      <MyRatingSection
        rating={myRating}
        changedAt={myRating?.changedAt}
        justSaved={justSaved}
        timesWatched={mine?.timesWatched}
      >
        {/* The form copies its starting values into its own state once,
            when it first appears. Changing `key` tells React "this is a
            different form now, start again", so after a delete, a rewatch
            (or a save made in another tab) it shows what is really stored
            instead of what it remembered. */}
        {myRating && titleId !== null ? (
          // A rated film: edit it, or log a rewatch (R83).
          <RewatchSwitch
            tmdbId={film.tmdbId}
            initialRating={myRating}
            key={`${myRating.changedAt}-${myRating.quality}-${myRating.enjoyment}-${myRating.review}`}
          >
            <DeleteRatingButton
              titleId={titleId}
              filmTitle={film.title}
              earlierViewings={earlierViewings.length}
            />
            {/* R85: only the member's own, under their rating. */}
            <EarlierViewings viewings={earlierViewings} />
          </RewatchSwitch>
        ) : (
          <RatingForm tmdbId={film.tmdbId} initialRating={null} key="unrated" />
        )}
      </MyRatingSection>

      {/* R98: the two parts about everyone's ratings, once there are any
          (E84). Shown whether or not the viewer has rated the film (E12). */}
      {ratings.length > 0 ? (
        <>
          {/* R99: the switch, the map, the group's numbers (with the curves
              folded under the two averages, R101), then the table, which
              follows the map's switch (R100). The chart is never the only
              way to read it: the numbers and the table say it in words
              (NFR13). scroll-mt keeps the heading clear of the top edge
              when a jump link brings it into view. */}
          <section
            id="everyone"
            aria-labelledby="everyone-heading"
            className="flex scroll-mt-6 flex-col gap-4"
          >
            <h2 id="everyone-heading" className="text-lg font-semibold">
              Everyone&apos;s ratings
            </h2>
            <SpokeMapSwitch
              ratings={ratings}
              between={
                <GroupAverage
                  points={ratings.map((rating) => rating.point)}
                  spread={
                    ratings.length >= MIN_RATINGS_FOR_SPREAD ? (
                      <SpreadCurves
                        points={ratings.map((rating) => rating.point)}
                      />
                    ) : undefined
                  }
                />
              }
            />
          </section>

          {/* One card per member: who they are, where they put the film,
              and what they wrote about it (R60), with likes (R69). */}
          <section
            id="reviews"
            aria-labelledby="reviews-heading"
            className="flex scroll-mt-6 flex-col gap-4"
          >
            <h2 id="reviews-heading" className="text-lg font-semibold">
              Reviews{" "}
              <span className="font-normal text-ink-muted">
                ({ratings.length})
              </span>
            </h2>
            <RatingCards
              ratings={ratings}
              // Who is looking, for the like buttons (R69).
              viewer={{
                userId: member.userId,
                displayName: member.displayName,
              }}
            />
            <a href="#top" className={`${textLink} self-start text-sm`}>
              Back to top
            </a>
          </section>
        </>
      ) : null}
    </main>
  );
}
