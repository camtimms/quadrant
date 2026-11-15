// Reads with the member's session, so server only.
import "server-only";

import type { RatingRow } from "@/lib/data/groupFilms";
import { fetchAllPages } from "@/lib/data/paging";
import { createClient } from "@/lib/supabase/server";

/**
 * The columns the Friends' films page needs from each rating: whose it is,
 * the two scores, the review, when it was first made, and nested inside it
 * the film and the member's name and picture address (see ratings.ts for
 * how "titles (...)" works; "profiles (...)" is the same idea).
 *
 * The member and review are for the panel that opens from a point (R57,
 * R59). Whole reviews are read here, on the server; groupFilms cuts them
 * short before anything is sent to the browser.
 *
 * The same text is repeated in tests/rls/all-ratings.test.ts, which runs it
 * against the real database, and must stay in step with it.
 */
const ALL_RATINGS_SELECT =
  "user_id, quality, enjoyment, review, created_at, titles (tmdb_id, title, release_year, poster_path), profiles (display_name, avatar_url)";

/**
 * Every member's current rating of every film: the data behind Friends'
 * films (R43).
 *
 * It reads with the signed-in member's own session, so the database's rules
 * decide what comes back: a member sees every member's ratings, anyone else
 * sees none. It runs on every visit and nothing is kept between visits,
 * which is why a rating saved on one device shows up for everyone else the
 * next time they load the page (R47).
 *
 * The rows are read in pages, because one request returns at most 1,000 of
 * them (see paging.ts). At the size this app is built for (about 5,000
 * ratings) that is a handful of requests.
 */
export async function loadAllRatings(): Promise<RatingRow[]> {
  const supabase = await createClient();

  const rows = await fetchAllPages((from, to) =>
    supabase
      .from("ratings")
      // count: "exact" asks the database to also say how many rows match
      // in total, which tells the paging when it has them all.
      .select(ALL_RATINGS_SELECT, { count: "exact" })
      .eq("is_current", true)
      // Pages only fit together if every request sees the rows in the same
      // order. Without an ORDER BY a database may return rows in any order
      // it likes, and a row could then appear on two pages or on none. The
      // id never changes and is never repeated, so it is a safe order.
      .order("id")
      .range(from, to),
  );

  return rows.map((row) => ({
    tmdbId: row.titles.tmdb_id,
    title: row.titles.title,
    year: row.titles.release_year,
    posterPath: row.titles.poster_path,
    point: { quality: row.quality, enjoyment: row.enjoyment },
    // When the member FIRST rated the film, as on My films (R36).
    ratedAt: row.created_at,
    userId: row.user_id,
    displayName: row.profiles.display_name,
    avatarUrl: row.profiles.avatar_url,
    // "No review" is stored as null; treat empty text the same way.
    review: row.review || null,
  }));
}
