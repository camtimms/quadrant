// Reaches the secret-key store and the TMDB client, so server only.
import "server-only";

import { getMovie } from "@/lib/tmdb/client";
import type { TmdbFilmDetails } from "@/lib/tmdb/schema";
import {
  findTitlesFetchedBefore,
  saveTitle,
  type StoredTitle,
} from "@/lib/titles/store";

/**
 * Refresh every stored film copy that nobody has opened for a long time
 * (E10, NFR18, design section 4.3). Run by `npm run refresh-titles`.
 *
 * TMDB's terms forbid keeping their data for more than six months. A film
 * page refreshes its own copy when it is over 30 days old (ensureTitle.ts),
 * but a film nobody opens would never be refreshed that way. This catches
 * those.
 */

/**
 * How old a copy must be before the script refreshes it. Well inside six
 * months, so that running the script every month or two is enough; but
 * well past the film page's 30 days, so the script leaves alone the copies
 * that pages are already keeping fresh.
 */
export const REFRESH_AFTER_DAYS = 150;

/**
 * Wait this long between requests to TMDB: at most ten a second, a quarter
 * of TMDB's documented limit (design section 4.4). With a few hundred films
 * the whole run still takes under a minute.
 */
export const PAUSE_BETWEEN_REQUESTS_MS = 100;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Copies fetched before this moment are refreshed. */
export function refreshCutoff(now: Date): Date {
  return new Date(now.getTime() - REFRESH_AFTER_DAYS * DAY_MS);
}

/** What happened, film by film, for the script to print. */
export type RefreshReport = {
  checked: number;
  refreshed: string[];
  /** Films TMDB no longer has. Their old copy is kept (see below). */
  notOnTmdb: string[];
  /** Films that could not be refreshed this time, with the reason. */
  failed: string[];
};

/** The outside world, passed in so the tests can use stand-ins. */
export type RefreshDeps = {
  findTitlesFetchedBefore: (cutoff: Date) => Promise<StoredTitle[]>;
  getMovie: (tmdbId: number) => Promise<TmdbFilmDetails | null>;
  saveTitle: (film: TmdbFilmDetails, fetchedAt: Date) => Promise<StoredTitle>;
  now: () => Date;
  pause: () => Promise<void>;
};

const realDeps: RefreshDeps = {
  findTitlesFetchedBefore,
  getMovie,
  saveTitle,
  now: () => new Date(),
  pause: () =>
    new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_REQUESTS_MS)),
};

export async function refreshStaleTitles(
  deps: RefreshDeps = realDeps,
): Promise<RefreshReport> {
  const now = deps.now();
  const stale = await deps.findTitlesFetchedBefore(refreshCutoff(now));
  const report: RefreshReport = {
    checked: stale.length,
    refreshed: [],
    notOnTmdb: [],
    failed: [],
  };

  for (const [index, title] of stale.entries()) {
    if (index > 0) await deps.pause();
    const name = describe(title);

    // One film's problem must not stop the rest being refreshed, so each
    // is tried on its own and the outcome noted.
    try {
      const film = await deps.getMovie(title.tmdb_id);
      if (film) {
        await deps.saveTitle(film, now);
        report.refreshed.push(name);
      } else {
        // TMDB has removed the film. Members' ratings point at our copy,
        // so deleting it would delete their ratings too. It is kept, and
        // listed so the owner can decide what to do (design section 4.3).
        report.notOnTmdb.push(`${name}, TMDB id ${title.tmdb_id}`);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      report.failed.push(`${name}, TMDB id ${title.tmdb_id}: ${reason}`);
    }
  }

  return report;
}

/** "Heat (1995)", or just "Heat" when the year is unknown. */
function describe(title: StoredTitle): string {
  return title.release_year === null
    ? title.title
    : `${title.title} (${title.release_year})`;
}
