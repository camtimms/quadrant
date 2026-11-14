import type { TmdbFilm } from "@/lib/tmdb/schema";

/**
 * The rules and shapes shared by the search endpoint (/api/search) and the
 * search page that calls it. Keeping them in one file means the browser and
 * the server cannot drift apart on, say, how short a query may be.
 *
 * No secrets here: safe to import from browser code.
 */

/** R9: a search needs at least this many characters. */
export const SEARCH_QUERY_MIN_LENGTH = 2;

/**
 * Nobody types a film title this long. The cap just stops a huge value being
 * passed on to TMDB.
 */
export const SEARCH_QUERY_MAX_LENGTH = 100;

/**
 * Tidy a raw query and decide whether it may be searched for. Returns the
 * trimmed query, or null if it is too short (or absurdly long).
 */
export function parseSearchQuery(
  raw: string | null | undefined,
): string | null {
  const query = (raw ?? "").trim();
  // Array.from splits by whole characters, so an emoji counts as one. The
  // plain .length would count it as two (same reasoning as the display name).
  const length = Array.from(query).length;
  if (length < SEARCH_QUERY_MIN_LENGTH || length > SEARCH_QUERY_MAX_LENGTH) {
    return null;
  }
  return query;
}

/**
 * Why a search was refused or failed. The page turns each into a sentence;
 * the endpoint never sends wording, and never says what went wrong inside.
 */
export type SearchError =
  | "signed-out" // no session (HTTP 401)
  | "not-a-member" // signed in, but not on the invite list (403)
  | "query-too-short" // fewer than two characters (400)
  | "unavailable"; // TMDB is down, slow or rate limiting us (503) — R12

/** What GET /api/search sends back: results, or one error code. */
export type SearchResponse = { results: TmdbFilm[] } | { error: SearchError };
