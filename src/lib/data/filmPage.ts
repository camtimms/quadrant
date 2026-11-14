// Reads with the member's session and may refresh a film through the
// secret-key store, so server only.
import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getMovie, TmdbUnavailableError } from "@/lib/tmdb/client";
import type { TmdbFilm } from "@/lib/tmdb/schema";
import { ensureTitle, isStale } from "@/lib/titles/ensureTitle";
import type { RatingInput } from "@/lib/validation/rating";

/**
 * Everything the film page needs, gathered in one place (R13, R14, R19).
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
      film: TmdbFilm;
      /** OUR id for the film, or null if nobody has rated it yet. */
      titleId: number | null;
      /** This member's current rating, or null if they have not rated it. */
      myRating: RatingInput | null;
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
      return { status: "ok", film, titleId: null, myRating: null };
    } catch (error) {
      if (!(error instanceof TmdbUnavailableError)) throw error;
      console.error(`Could not load film ${tmdbId} from TMDB.`, error);
      return { status: "unavailable" };
    }
  }

  // Situation 1: we have a copy. Refresh it if it has gone stale; ensureTitle
  // falls back to the old copy by itself if the refresh fails.
  let title = stored;
  if (isStale(stored.fetched_at, new Date())) {
    const refreshed = await ensureTitle(tmdbId);
    if (refreshed.ok) title = refreshed.title;
  }

  const { data: rating, error: ratingError } = await supabase
    .from("ratings")
    .select("quality, enjoyment, review")
    .eq("user_id", userId)
    .eq("title_id", title.id)
    .eq("is_current", true)
    .maybeSingle();
  if (ratingError) {
    throw new Error("Could not load your rating.", { cause: ratingError });
  }

  return {
    status: "ok",
    film: {
      tmdbId: title.tmdb_id,
      title: title.title,
      year: title.release_year,
      posterPath: title.poster_path,
    },
    titleId: title.id,
    myRating: rating
      ? {
          // The database guarantees these are whole numbers from 0 to 10
          // (a CHECK constraint), which is what the Score type means.
          quality: rating.quality as RatingInput["quality"],
          enjoyment: rating.enjoyment as RatingInput["enjoyment"],
          // The form works with "" for "no review"; the database stores null.
          review: rating.review ?? "",
        }
      : null,
  };
}
