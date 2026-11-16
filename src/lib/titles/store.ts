// Uses the secret key (through admin.ts), so server only.
import "server-only";

import { fetchAllPages } from "@/lib/data/paging";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { TmdbFilmDetails } from "@/lib/tmdb/schema";

/**
 * Reading and writing our stored copies of films: the `titles` table.
 *
 * This is the ONLY place the app uses the secret-key client. It is kept tiny
 * on purpose (four queries, no decisions) so that everything done with that
 * much power can be read in one screen. The decisions about WHEN to fetch
 * and store live in ensureTitle.ts.
 *
 * No function here checks who is asking. Callers must have confirmed the
 * visitor is a member first (or, for countTitles, that the caller is
 * Vercel's scheduler).
 */

/**
 * How many films are stored. Asked by the keep-alive job (NFR26) as the
 * smallest real database query there is: a count, no rows sent back. It
 * reveals nothing about any member.
 */
export async function countTitles(): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("titles")
    // head: true asks for the count only, with no rows in the answer.
    .select("id", { count: "exact", head: true });
  if (error || count === null) {
    throw new Error("Could not count the films.", { cause: error });
  }
  return count;
}

/** A row of the `titles` table. */
export type StoredTitle = Database["public"]["Tables"]["titles"]["Row"];

/** Our copy of a film, looked up by TMDB's id, or null if we have none. */
export async function findTitle(tmdbId: number): Promise<StoredTitle | null> {
  const { data, error } = await createAdminClient()
    .from("titles")
    .select()
    .eq("media_type", "movie")
    .eq("tmdb_id", tmdbId)
    // One row or none; "none" is an ordinary answer, not an error.
    .maybeSingle();
  if (error) throw new Error("Could not look up the film.", { cause: error });
  return data;
}

/**
 * Every stored film last fetched before `cutoff`, oldest first, for the
 * refresh script (refreshStale.ts). Read a page at a time, since the API
 * stops at 1,000 rows without saying so.
 */
export async function findTitlesFetchedBefore(
  cutoff: Date,
): Promise<StoredTitle[]> {
  const admin = createAdminClient();
  try {
    return await fetchAllPages((from, to) =>
      admin
        .from("titles")
        .select("*", { count: "exact" })
        .eq("media_type", "movie")
        .lt("fetched_at", cutoff.toISOString())
        // A fixed order, so that pages never overlap or skip a row.
        .order("fetched_at")
        .order("id")
        .range(from, to),
    );
  } catch (error) {
    throw new Error("Could not look up the films to refresh.", {
      cause: error,
    });
  }
}

/**
 * Store a film, or refresh our copy of it, and return the stored row.
 *
 * "upsert" means insert-or-update: if a row for this film already exists
 * (same media_type and tmdb_id, the table's unique rule), it is updated
 * instead. That one step covers three cases: a brand-new film, a refresh of
 * an old copy, and two members rating the same new film at the same moment,
 * where the second save simply lands on the first one's row.
 */
export async function saveTitle(
  film: TmdbFilmDetails,
  fetchedAt: Date,
): Promise<StoredTitle> {
  const { data, error } = await createAdminClient()
    .from("titles")
    .upsert(
      {
        media_type: "movie",
        tmdb_id: film.tmdbId,
        title: film.title,
        release_year: film.year,
        poster_path: film.posterPath,
        // Always a string here ("" when TMDB has none), never null: null
        // is reserved for "not fetched yet" (see migration 4).
        overview: film.overview,
        fetched_at: fetchedAt.toISOString(),
      },
      { onConflict: "media_type,tmdb_id" },
    )
    .select()
    .single();
  if (error) throw new Error("Could not store the film.", { cause: error });
  return data;
}
