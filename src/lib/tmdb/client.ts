// The TMDB token is a secret, so this file must only ever run on the server
// (design section 1, point 3). This import makes the build fail otherwise.
import "server-only";

import { getServerEnv } from "@/lib/env.server";
import {
  parseMovie,
  parseSearchResponse,
  type TmdbFilm,
} from "@/lib/tmdb/schema";

/**
 * The only place in the app that talks to TMDB (design section 4).
 *
 * Two calls:
 *   searchMovies("commando") -> a page of matching films
 *   getMovie(10999)          -> one film, or null if TMDB has no such id
 *
 * Anything else that goes wrong (TMDB down, too slow, rate limited, a rejected
 * token, a body we cannot read) is reported the same way: a
 * TmdbUnavailableError. Callers only need one question answered, "did it
 * work?", because the member sees the same "unavailable, try again" message
 * whatever the cause (R12).
 */

const API_BASE_URL = "https://api.themoviedb.org/3";

/** Give up after this long, so a slow TMDB cannot hang a page (design section 9). */
export const TMDB_TIMEOUT_MS = 5_000;

/** TMDB could not give us a usable answer. The cause is kept for server logs. */
export class TmdbUnavailableError extends Error {
  constructor(reason: string, options?: ErrorOptions) {
    super(`TMDB is unavailable: ${reason}`, options);
    this.name = "TmdbUnavailableError";
  }
}

/**
 * Make one GET request and return the HTTP status with the decoded body.
 * Throws TmdbUnavailableError if no readable answer arrives in time.
 */
async function tmdbGet(
  path: string,
  params: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  // URLSearchParams escapes the values, so a search for "fast & furious"
  // cannot break the address or smuggle in extra parameters.
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}${path}${query ? `?${query}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${getServerEnv().TMDB_API_READ_ACCESS_TOKEN}`,
        Accept: "application/json",
      },
      // Cancels the request after the timeout; fetch then rejects.
      signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
      // Search results are never stored (design section 4.2).
      cache: "no-store",
    });
    return { status: response.status, body: await response.json() };
  } catch (cause) {
    // Network failure, timeout, or a body that is not JSON. The message says
    // which request, never the token.
    throw new TmdbUnavailableError(`no usable response from ${path}`, {
      cause,
    });
  }
}

/**
 * Search films by title (R9). Returns TMDB's first page, at most 20 films, in
 * TMDB's own order. An empty list means "no matches", not an error (R11).
 *
 * `/search/movie` returns films only, which is what keeps TV series out, and
 * `include_adult=false` asks TMDB to leave adult titles out.
 */
export async function searchMovies(query: string): Promise<TmdbFilm[]> {
  const { status, body } = await tmdbGet("/search/movie", {
    query,
    include_adult: "false",
    page: "1",
  });
  // 429 means rate limited, 401 a rejected token, 5xx a TMDB fault. All of
  // them are "unavailable" as far as a member is concerned.
  if (status !== 200) {
    throw new TmdbUnavailableError(`search returned HTTP ${status}`);
  }
  try {
    return parseSearchResponse(body);
  } catch (cause) {
    throw new TmdbUnavailableError("search returned an unexpected shape", {
      cause,
    });
  }
}

/**
 * Fetch one film's details by its TMDB id. Returns null when TMDB says the id
 * does not exist (HTTP 404), which is a normal answer rather than a failure:
 * the browser sends us the id, so it may be anything.
 */
export async function getMovie(tmdbId: number): Promise<TmdbFilm | null> {
  const { status, body } = await tmdbGet(`/movie/${tmdbId}`);
  if (status === 404) return null;
  if (status !== 200) {
    throw new TmdbUnavailableError(`film details returned HTTP ${status}`);
  }
  try {
    return parseMovie(body);
  } catch (cause) {
    throw new TmdbUnavailableError("film details had an unexpected shape", {
      cause,
    });
  }
}
