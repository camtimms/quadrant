import { describe, expect, it, vi } from "vitest";
import {
  REFRESH_AFTER_DAYS,
  refreshCutoff,
  refreshStaleTitles,
  type RefreshDeps,
} from "@/lib/titles/refreshStale";
import type { StoredTitle } from "@/lib/titles/store";
import type { TmdbFilmDetails } from "@/lib/tmdb/schema";

// The refresh script's decisions, tested with stand-ins for the database
// and TMDB, in the same way as ensureTitle.test.ts. The real query is
// checked against the dev project in tests/rls/titles-store.test.ts.

const NOW = new Date("2026-11-16T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function stored(tmdbId: number, title: string): StoredTitle {
  return {
    id: tmdbId + 1000,
    media_type: "movie",
    tmdb_id: tmdbId,
    title,
    release_year: 1990,
    poster_path: null,
    overview: "",
    fetched_at: new Date(NOW.getTime() - 200 * DAY_MS).toISOString(),
  };
}

function details(tmdbId: number, title: string): TmdbFilmDetails {
  return { tmdbId, title, year: 1990, posterPath: null, overview: "New." };
}

/** Stand-ins where every film is found on TMDB and saves cleanly. */
function deps(stale: StoredTitle[], overrides: Partial<RefreshDeps> = {}) {
  return {
    findTitlesFetchedBefore: vi.fn(async () => stale),
    getMovie: vi.fn(async (tmdbId: number) =>
      details(tmdbId, `Fresh ${tmdbId}`),
    ),
    saveTitle: vi.fn(async (film: TmdbFilmDetails) =>
      stored(film.tmdbId, film.title),
    ),
    now: () => NOW,
    pause: vi.fn(async () => {}),
    ...overrides,
  } satisfies RefreshDeps;
}

describe("refreshCutoff", () => {
  it("is 150 days before now", () => {
    expect(REFRESH_AFTER_DAYS).toBe(150);
    expect(refreshCutoff(NOW).toISOString()).toBe("2026-06-19T12:00:00.000Z");
  });

  it("leaves a month's margin inside TMDB's six-month limit", () => {
    // Six months is at least 181 days; the owner runs the script now and
    // then, so a copy must be caught well before it reaches that.
    expect(181 - REFRESH_AFTER_DAYS).toBeGreaterThanOrEqual(30);
  });
});

describe("refreshStaleTitles", () => {
  it("asks only for copies older than the cutoff", async () => {
    const d = deps([]);
    await refreshStaleTitles(d);
    expect(d.findTitlesFetchedBefore).toHaveBeenCalledWith(refreshCutoff(NOW));
  });

  it("fetches each stale film again and stores it, stamped now", async () => {
    const d = deps([stored(1, "Heat"), stored(2, "Alien")]);
    const report = await refreshStaleTitles(d);

    expect(vi.mocked(d.getMovie).mock.calls.map(([id]) => id)).toEqual([1, 2]);
    expect(d.saveTitle).toHaveBeenCalledWith(details(1, "Fresh 1"), NOW);
    expect(d.saveTitle).toHaveBeenCalledWith(details(2, "Fresh 2"), NOW);
    expect(report).toEqual({
      checked: 2,
      refreshed: ["Heat (1990)", "Alien (1990)"],
      notOnTmdb: [],
      failed: [],
    });
  });

  it("does nothing when no copy is stale", async () => {
    const d = deps([]);
    const report = await refreshStaleTitles(d);
    expect(d.getMovie).not.toHaveBeenCalled();
    expect(report).toEqual({
      checked: 0,
      refreshed: [],
      notOnTmdb: [],
      failed: [],
    });
  });

  it("keeps the old copy of a film TMDB no longer has, and reports it", async () => {
    const d = deps([stored(1, "Heat"), stored(2, "Gone")], {
      getMovie: vi.fn(async (tmdbId: number) =>
        tmdbId === 2 ? null : details(tmdbId, "Heat"),
      ),
    });
    const report = await refreshStaleTitles(d);

    expect(d.saveTitle).toHaveBeenCalledTimes(1);
    expect(report.refreshed).toEqual(["Heat (1990)"]);
    expect(report.notOnTmdb).toEqual(["Gone (1990), TMDB id 2"]);
  });

  it("carries on past a failure and reports it", async () => {
    const d = deps([stored(1, "Heat"), stored(2, "Alien"), stored(3, "Jaws")], {
      getMovie: vi.fn(async (tmdbId: number) => {
        if (tmdbId === 1) throw new Error("TMDB is unavailable: timeout");
        return details(tmdbId, `Fresh ${tmdbId}`);
      }),
      saveTitle: vi.fn(async (film: TmdbFilmDetails) => {
        if (film.tmdbId === 3) throw new Error("Could not store the film.");
        return stored(film.tmdbId, film.title);
      }),
    });
    const report = await refreshStaleTitles(d);

    expect(report.refreshed).toEqual(["Alien (1990)"]);
    expect(report.failed).toEqual([
      "Heat (1990), TMDB id 1: TMDB is unavailable: timeout",
      "Jaws (1990), TMDB id 3: Could not store the film.",
    ]);
  });

  it("pauses between requests to TMDB, not before the first", async () => {
    const order: string[] = [];
    const d = deps([stored(1, "Heat"), stored(2, "Alien")], {
      getMovie: vi.fn(async (tmdbId: number) => {
        order.push(`get ${tmdbId}`);
        return details(tmdbId, "x");
      }),
      pause: vi.fn(async () => {
        order.push("pause");
      }),
    });
    await refreshStaleTitles(d);
    expect(order).toEqual(["get 1", "pause", "get 2"]);
  });

  it("names a film with no year without a stray bracket", async () => {
    const d = deps([{ ...stored(1, "Untitled"), release_year: null }], {
      getMovie: vi.fn(async () => null),
    });
    const report = await refreshStaleTitles(d);
    expect(report.notOnTmdb).toEqual(["Untitled, TMDB id 1"]);
  });
});
