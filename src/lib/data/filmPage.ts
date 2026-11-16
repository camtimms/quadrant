// Reads with the member's session and may refresh a film through the
// secret-key store, so server only.
import "server-only";
import { pictureAddress } from "@/lib/picture";
import { RATING_AUTHOR, REVIEW_LIKERS, toLikers } from "@/lib/data/embeds";

import type { MemberRating } from "@/components/film/RatingCards";
import { createClient } from "@/lib/supabase/server";
import { getMovie, TmdbUnavailableError } from "@/lib/tmdb/client";
import type { TmdbFilm } from "@/lib/tmdb/schema";
import { ensureTitle, isStale } from "@/lib/titles/ensureTitle";
import type { RatingInput } from "@/lib/validation/rating";

/**
 * Everything the film page needs, gathered in one place (R13, R14, R19,
 * R37).
 *
 * There are two quite different situations, and the difference matters:
 *
 *  1. Somebody has rated this film before. We have our own copy of it, so
 *     the page works even when TMDB is down (R14). If the copy is over 30
 *     days old we take the chance to refresh it (E10).
 *
 *  2. Nobody has rated it. We have no copy, so the details are fetched live
 *     from TMDB, and if TMDB is down the page cannot be shown (E9).
 *     Crucially, just LOOKING at a film stores nothing. A film is only
 *     stored when it is first rated (design section 4.2), otherwise every
 *     film anyone clicked on in a search would pile up in our database.
 *
 * The caller must already have confirmed that `userId` belongs to a member.
 */
export type FilmPageData =
  | {
      status: "ok";
      film: TmdbFilm & {
        /**
         * TMDB's description: "" when it has none, null when we have a copy
         * of the film but could not fetch its description yet.
         */
        overview: string | null;
      };
      /** OUR id for the film, or null if nobody has rated it yet. */
      titleId: number | null;
      /**
       * This member's current rating, or null if they have not rated it,
       * with when it was last saved (R23: every save folds the section).
       */
      myRating: (RatingInput & { changedAt: string }) | null;
      /**
       * Every member's current rating of the film, the viewer's included:
       * the viewer's first, then the others by name. Empty if nobody has
       * rated it.
       */
      ratings: MemberRating[];
    }
  // TMDB has no film with this id.
  | { status: "not-found" }
  // TMDB cannot be reached and we have no copy of our own.
  | { status: "unavailable" };

export async function loadFilmPage(
  tmdbId: number,
  userId: string,
): Promise<FilmPageData> {
  // The member's own client: row-level security applies to both reads.
  const supabase = await createClient();

  const { data: stored, error: titleError } = await supabase
    .from("titles")
    .select()
    .eq("media_type", "movie")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (titleError) {
    throw new Error("Could not load the film.", { cause: titleError });
  }

  // Situation 2: nobody has rated it. Ask TMDB, and store nothing.
  if (!stored) {
    try {
      const film = await getMovie(tmdbId);
      if (!film) return { status: "not-found" };
      return {
        status: "ok",
        film,
        titleId: null,
        myRating: null,
        ratings: [],
      };
    } catch (error) {
      if (!(error instanceof TmdbUnavailableError)) throw error;
      console.error(`Could not load film ${tmdbId} from TMDB.`, error);
      return { status: "unavailable" };
    }
  }

  // Situation 1: we have a copy. Refresh it if it has gone stale, or if it
  // was stored before descriptions were kept and so has none yet; ensureTitle
  // falls back to the old copy by itself if the refresh fails.
  let title = stored;
  if (isStale(stored.fetched_at, new Date()) || stored.overview === null) {
    const refreshed = await ensureTitle(tmdbId);
    if (refreshed.ok) title = refreshed.title;
  }

  // Everyone's current rating of this film, in one query (R37). There is no
  // filter on the member: row-level security already limits ratings to
  // members, and a member may see every member's ratings. The viewer's own
  // rating is picked out of the same rows below, which saves a second query.
  //
  // RATING_AUTHOR (embeds.ts) follows the link from ratings.user_id to the
  // profiles table, named because likes link them a second way, and nests
  // the member's name and picture address inside each row, so the cards
  // need no second query (R61). REVIEW_LIKERS adds who liked each review,
  // with their names, in the same query (R70); `id` is what a like points at.
  const { data: rows, error: ratingsError } = await supabase
    .from("ratings")
    .select(
      `id, user_id, quality, enjoyment, review, updated_at, ${RATING_AUTHOR}, ${REVIEW_LIKERS}` as const,
    )
    .eq("title_id", title.id)
    .eq("is_current", true);
  if (ratingsError) {
    throw new Error("Could not load the ratings.", { cause: ratingsError });
  }

  const ratings: MemberRating[] = rows
    .map((row) => ({
      userId: row.user_id,
      displayName: row.profiles.display_name,
      // The picture the member chose: Google's, their upload, or none
      // (R79); null shows their initial.
      avatarUrl: pictureAddress({
        userId: row.user_id,
        source: row.profiles.picture_source,
        googleUrl: row.profiles.avatar_url,
        version: row.profiles.picture_version,
      }),
      point: { quality: row.quality, enjoyment: row.enjoyment },
      // "No review" is stored as null; treat empty text the same way.
      review: row.review || null,
      isViewer: row.user_id === userId,
      ratingId: row.id,
      // Who liked the review, by name (embeds.ts).
      likes: toLikers(row.review_likes),
    }))
    // The viewer's own rating first, then everyone else by name. Sorting
    // here, not in the database, keeps "whose page is this" out of the query.
    // localeCompare with "base" sensitivity ignores capitals, so "bob" sorts
    // beside "Bob" instead of after "Zoe".
    .sort(
      (a, b) =>
        Number(b.isViewer) - Number(a.isViewer) ||
        a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        }),
    );

  const mine = ratings.find((rating) => rating.isViewer);
  // The save time is only needed for the viewer's own rating, so it is
  // taken from the raw row rather than added to every member's card.
  const myRow = rows.find((row) => row.user_id === userId);

  return {
    status: "ok",
    film: {
      tmdbId: title.tmdb_id,
      title: title.title,
      year: title.release_year,
      posterPath: title.poster_path,
      overview: title.overview,
    },
    titleId: title.id,
    myRating:
      mine && myRow
        ? {
            changedAt: myRow.updated_at,
            // The database guarantees these are whole numbers from 0 to 10
            // (a CHECK constraint), which is what the Score type means.
            quality: mine.point.quality as RatingInput["quality"],
            enjoyment: mine.point.enjoyment as RatingInput["enjoyment"],
            // The form works with "" for "no review"; the database stores null.
            review: mine.review ?? "",
          }
        : null,
    ratings,
  };
}
