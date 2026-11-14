import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TmdbUnavailableError } from "@/lib/tmdb/client";
import type { TmdbFilm } from "@/lib/tmdb/schema";
import {
  ensureTitle,
  TITLE_MAX_AGE_DAYS,
  type EnsureTitleDeps,
} from "@/lib/titles/ensureTitle";
import type { StoredTitle } from "@/lib/titles/store";

// ensureTitle is given its three outside connections (look a film up in our
// database, save one, ask TMDB) as arguments. Here they are replaced with
// stand-ins, so the DECISIONS it makes can be tested with no network and no
// database. The real database calls are tested separately, against the dev
// project, in tests/rls/titles-store.test.ts.

const NOW = new Date("2026-11-14T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const COMMANDO: TmdbFilm = {
  tmdbId: 10999,
  title: "Commando",
  year: 1985,
  posterPath: "/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg",
};

/** Our stored copy of Commando, last refreshed `daysAgo` days ago. */
function stored(daysAgo: number, overrides: Partial<StoredTitle> = {}) {
  return {
    id: 42,
    media_type: "movie",
    tmdb_id: 10999,
    title: "Commando",
    release_year: 1985,
    poster_path: "/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg",
    fetched_at: new Date(NOW.getTime() - daysAgo * DAY_MS).toISOString(),
    ...overrides,
  } satisfies StoredTitle;
}

let deps: {
  [K in keyof EnsureTitleDeps]: ReturnType<typeof vi.fn<EnsureTitleDeps[K]>>;
};

beforeEach(() => {
  // ensureTitle logs the cause of a failed fetch for the server logs.
  // Silence it so the expected failures do not clutter the test output.
  vi.spyOn(console, "error").mockImplementation(() => {});
  deps = {
    findTitle: vi.fn<EnsureTitleDeps["findTitle"]>().mockResolvedValue(null),
    // Saving hands back the row as the database would store it.
    saveTitle: vi
      .fn<EnsureTitleDeps["saveTitle"]>()
      .mockImplementation(async (film, fetchedAt) => ({
        id: 42,
        media_type: "movie",
        tmdb_id: film.tmdbId,
        title: film.title,
        release_year: film.year,
        poster_path: film.posterPath,
        fetched_at: fetchedAt.toISOString(),
      })),
    getMovie: vi.fn<EnsureTitleDeps["getMovie"]>().mockResolvedValue(COMMANDO),
    now: vi.fn<EnsureTitleDeps["now"]>().mockReturnValue(NOW),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ensureTitle", () => {
  describe("a film nobody has rated before (R14)", () => {
    it("fetches it from TMDB and stores it", async () => {
      const result = await ensureTitle(10999, deps);

      expect(deps.getMovie).toHaveBeenCalledWith(10999);
      expect(deps.saveTitle).toHaveBeenCalledWith(COMMANDO, NOW);
      expect(result).toEqual({
        ok: true,
        title: expect.objectContaining({
          id: 42,
          tmdb_id: 10999,
          title: "Commando",
          release_year: 1985,
          fetched_at: NOW.toISOString(),
        }),
      });
    });

    // The details come from TMDB, never from the browser. All the browser
    // supplies is a number.
    it("stores what TMDB says, with no title or poster passed in", async () => {
      await ensureTitle(10999, deps);
      expect(deps.saveTitle.mock.calls[0][0]).toBe(COMMANDO);
    });

    it("stores a film that has no poster or year (R10)", async () => {
      const bare = { ...COMMANDO, year: null, posterPath: null };
      deps.getMovie.mockResolvedValue(bare);

      const result = await ensureTitle(10999, deps);

      expect(deps.saveTitle).toHaveBeenCalledWith(bare, NOW);
      expect(result).toMatchObject({
        ok: true,
        title: { release_year: null, poster_path: null },
      });
    });

    it("reports 'not-found' when TMDB has no such film, and stores nothing", async () => {
      deps.getMovie.mockResolvedValue(null);

      expect(await ensureTitle(999999999, deps)).toEqual({
        ok: false,
        reason: "not-found",
      });
      expect(deps.saveTitle).not.toHaveBeenCalled();
    });

    // E9: with no copy of our own to fall back on, the film cannot be rated
    // until TMDB is back.
    it("reports 'unavailable' when TMDB is down, and stores nothing", async () => {
      deps.getMovie.mockRejectedValue(new TmdbUnavailableError("down"));

      expect(await ensureTitle(10999, deps)).toEqual({
        ok: false,
        reason: "unavailable",
      });
      expect(deps.saveTitle).not.toHaveBeenCalled();
    });
  });

  describe("a film we already have", () => {
    it("returns our copy without asking TMDB", async () => {
      const copy = stored(3);
      deps.findTitle.mockResolvedValue(copy);

      expect(await ensureTitle(10999, deps)).toEqual({ ok: true, title: copy });
      expect(deps.getMovie).not.toHaveBeenCalled();
      expect(deps.saveTitle).not.toHaveBeenCalled();
    });

    it("still does not ask TMDB at exactly 30 days old", async () => {
      expect(TITLE_MAX_AGE_DAYS).toBe(30);
      deps.findTitle.mockResolvedValue(stored(30));

      await ensureTitle(10999, deps);

      expect(deps.getMovie).not.toHaveBeenCalled();
    });
  });

  // E10: TMDB's terms forbid keeping their data for more than six months,
  // so an old copy is refreshed when someone next uses it.
  describe("a copy older than 30 days", () => {
    it("is refreshed from TMDB", async () => {
      deps.findTitle.mockResolvedValue(stored(31, { title: "Comando" }));

      const result = await ensureTitle(10999, deps);

      expect(deps.getMovie).toHaveBeenCalledWith(10999);
      expect(deps.saveTitle).toHaveBeenCalledWith(COMMANDO, NOW);
      expect(result).toMatchObject({
        ok: true,
        title: { title: "Commando", fetched_at: NOW.toISOString() },
      });
    });

    it("keeps the old copy when TMDB is down", async () => {
      const old = stored(90);
      deps.findTitle.mockResolvedValue(old);
      deps.getMovie.mockRejectedValue(new TmdbUnavailableError("down"));

      expect(await ensureTitle(10999, deps)).toEqual({ ok: true, title: old });
      expect(deps.saveTitle).not.toHaveBeenCalled();
    });

    // A film can be removed from TMDB. Ratings of it must not break.
    it("keeps the old copy when TMDB no longer has the film", async () => {
      const old = stored(90);
      deps.findTitle.mockResolvedValue(old);
      deps.getMovie.mockResolvedValue(null);

      expect(await ensureTitle(10999, deps)).toEqual({ ok: true, title: old });
      expect(deps.saveTitle).not.toHaveBeenCalled();
    });

    it("keeps the old copy when saving the refreshed one fails", async () => {
      const old = stored(90);
      deps.findTitle.mockResolvedValue(old);
      deps.saveTitle.mockRejectedValue(new Error("database hiccup"));

      expect(await ensureTitle(10999, deps)).toEqual({ ok: true, title: old });
    });
  });

  describe("things that are not film ids", () => {
    // The id arrives from the browser, so it could be anything. Nothing
    // below should reach the database or TMDB.
    it.each([[0], [-1], [1.5], [Number.NaN], [2 ** 31]])(
      "treats %s as 'not-found' without looking anything up",
      async (id) => {
        expect(await ensureTitle(id, deps)).toEqual({
          ok: false,
          reason: "not-found",
        });
        expect(deps.findTitle).not.toHaveBeenCalled();
        expect(deps.getMovie).not.toHaveBeenCalled();
      },
    );
  });

  describe("unexpected failures", () => {
    it("lets a database failure on first save surface as an error", async () => {
      deps.saveTitle.mockRejectedValue(new Error("database is down"));
      await expect(ensureTitle(10999, deps)).rejects.toThrow(
        "database is down",
      );
    });

    it("lets a failed lookup surface as an error", async () => {
      deps.findTitle.mockRejectedValue(new Error("database is down"));
      await expect(ensureTitle(10999, deps)).rejects.toThrow(
        "database is down",
      );
    });
  });
});
