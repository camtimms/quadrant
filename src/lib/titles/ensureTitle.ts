// Reaches the secret-key store and the TMDB client, so server only.
import "server-only";

import { getMovie, TmdbUnavailableError } from "@/lib/tmdb/client";
import { findTitle, saveTitle, type StoredTitle } from "@/lib/titles/store";

/**
 * "Make sure we have our own copy of this film" (R14, design section 4.2).
 *
 * A rating points at a row in our `titles` table, so that row must exist
 * before a film can be rated. This is called with nothing but a TMDB id:
 *
 *   - we already have a recent copy  -> use it; TMDB is not contacted
 *   - we have none                   -> fetch from TMDB, store, use that
 *   - our copy is over 30 days old,  -> try to refresh it; if that fails for
 *     or has no description yet         any reason, carry on with the old one
 *
 * The film's title, year and poster always come from TMDB, fetched by the
 * server. The browser only ever supplies the id, so a member cannot make the
 * app store a film under a name of their choosing.
 *
 * This does not check who is asking. The caller (the save-rating action)
 * must already have confirmed the visitor is a member.
 */

/**
 * How old a stored copy may get before we refresh it. TMDB's terms forbid
 * keeping their data for more than six months; refreshing at 30 days, when a
 * film is next used, stays far inside that (E10, design section 4.3).
 */
export const TITLE_MAX_AGE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The largest value the tmdb_id column (a 32-bit integer) can hold. */
const MAX_TMDB_ID = 2 ** 31 - 1;

/**
 * Is a stored copy old enough to need refreshing? Exactly 30 days is still
 * fine; a moment over is stale.
 */
export function isStale(fetchedAt: string, now: Date): boolean {
  return now.getTime() - Date.parse(fetchedAt) > TITLE_MAX_AGE_DAYS * DAY_MS;
}

export type EnsureTitleResult =
  | { ok: true; title: StoredTitle }
  // "not-found": TMDB has no such film (or the id is not an id at all).
  // "unavailable": TMDB could not be reached and we have no copy (E9).
  | { ok: false; reason: "not-found" | "unavailable" };

/**
 * The outside world, as far as this function is concerned. Passing these in
 * (rather than calling them directly) is what lets the tests swap in
 * stand-ins and check the logic without a database or a network. In the app
 * the defaults below are always used.
 */
export type EnsureTitleDeps = {
  findTitle: (tmdbId: number) => Promise<StoredTitle | null>;
  saveTitle: (
    film: NonNullable<Awaited<ReturnType<typeof getMovie>>>,
    fetchedAt: Date,
  ) => Promise<StoredTitle>;
  getMovie: typeof getMovie;
  now: () => Date;
};

const realDeps: EnsureTitleDeps = {
  findTitle,
  saveTitle,
  getMovie,
  now: () => new Date(),
};

export async function ensureTitle(
  tmdbId: number,
  deps: EnsureTitleDeps = realDeps,
): Promise<EnsureTitleResult> {
  // The id comes from the browser. Anything that cannot be a TMDB id is
  // turned away before it reaches the database or TMDB.
  if (!Number.isInteger(tmdbId) || tmdbId < 1 || tmdbId > MAX_TMDB_ID) {
    return { ok: false, reason: "not-found" };
  }

  const existing = await deps.findTitle(tmdbId);
  const now = deps.now();

  if (existing) {
    // "overview === null" means this film was stored before descriptions
    // were kept (migration 4). It is fetched again once, to fill that in;
    // after that the column holds a string, even if an empty one.
    if (!isStale(existing.fetched_at, now) && existing.overview !== null) {
      return { ok: true, title: existing };
    }

    // Stale, or missing its description. Try to refresh, but a film that has ratings must keep working
    // whatever happens: TMDB down, the film removed from TMDB, or our own
    // save failing. In every such case the old copy is still good enough.
    try {
      const film = await deps.getMovie(tmdbId);
      if (film) {
        return { ok: true, title: await deps.saveTitle(film, now) };
      }
    } catch (error) {
      console.error(
        `Could not refresh film ${tmdbId}; keeping the old copy.`,
        error,
      );
    }
    return { ok: true, title: existing };
  }

  // We have never stored this film, so there is nothing to fall back on.
  let film;
  try {
    film = await deps.getMovie(tmdbId);
  } catch (error) {
    // Only "TMDB is unavailable" is an expected problem with a message for
    // the member. Anything else is a bug and should surface as one.
    if (!(error instanceof TmdbUnavailableError)) throw error;
    console.error(`Could not fetch film ${tmdbId} from TMDB.`, error);
    return { ok: false, reason: "unavailable" };
  }
  if (!film) return { ok: false, reason: "not-found" };

  // A database failure here is unexpected, so it is allowed to throw and
  // show the error page rather than being dressed up as "unavailable".
  return { ok: true, title: await deps.saveTitle(film, now) };
}
