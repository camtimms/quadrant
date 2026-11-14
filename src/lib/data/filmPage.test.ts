import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TmdbUnavailableError } from "@/lib/tmdb/client";
import type { TmdbFilm } from "@/lib/tmdb/schema";
import type { EnsureTitleResult } from "@/lib/titles/ensureTitle";
import { loadFilmPage } from "./filmPage";

// The database, TMDB and the film store are replaced with stand-ins, so
// these tests are about the loader's decisions: where the film's details
// come from in each situation, and above all that viewing stores nothing.

const mocks = vi.hoisted(() => ({
  // What each table's query should answer with: { data, error }.
  tables: {} as Record<string, { data: unknown; error: unknown }>,
  // Every filter applied, per table, so tests can check whose rating was read.
  filters: {} as Record<string, [string, unknown][]>,
  getMovie: vi.fn<(id: number) => Promise<TmdbFilm | null>>(),
  ensureTitle: vi.fn<(id: number) => Promise<EnsureTitleResult>>(),
}));

vi.mock("@/lib/supabase/server", () => ({
  // A pretend client supporting .from(t).select().eq()....maybeSingle()
  createClient: async () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq(column: string, value: unknown) {
          (mocks.filters[table] ??= []).push([column, value]);
          return query;
        },
        maybeSingle: async () => mocks.tables[table],
      };
      return query;
    },
  }),
}));
vi.mock("@/lib/tmdb/client", async (original) => ({
  // Keep the real error class; replace only the network call.
  ...(await original<typeof import("@/lib/tmdb/client")>()),
  getMovie: mocks.getMovie,
}));
vi.mock("@/lib/titles/ensureTitle", async (original) => ({
  // Keep the real isStale; replace only the function that writes.
  ...(await original<typeof import("@/lib/titles/ensureTitle")>()),
  ensureTitle: mocks.ensureTitle,
}));

const USER_ID = "00000000-0000-4000-8000-000000000001";
const DAY_MS = 24 * 60 * 60 * 1000;

const COMMANDO: TmdbFilm = {
  tmdbId: 10999,
  title: "Commando",
  year: 1985,
  posterPath: "/x.jpg",
};

function storedTitle(daysOld: number, title = "Commando") {
  return {
    id: 42,
    media_type: "movie",
    tmdb_id: 10999,
    title,
    release_year: 1985,
    poster_path: "/x.jpg",
    fetched_at: new Date(Date.now() - daysOld * DAY_MS).toISOString(),
  };
}

beforeEach(() => {
  mocks.tables.titles = { data: null, error: null };
  mocks.tables.ratings = { data: null, error: null };
  mocks.filters.titles = [];
  mocks.filters.ratings = [];
  mocks.getMovie.mockResolvedValue(COMMANDO);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("loadFilmPage", () => {
  describe("a film nobody has rated", () => {
    it("shows TMDB's details", async () => {
      expect(await loadFilmPage(10999, USER_ID)).toEqual({
        status: "ok",
        film: COMMANDO,
        titleId: null,
        myRating: null,
      });
    });

    // A film is stored when it is first RATED, not when it is looked at.
    it("stores nothing", async () => {
      await loadFilmPage(10999, USER_ID);
      expect(mocks.ensureTitle).not.toHaveBeenCalled();
    });

    it("is 'not-found' when TMDB has no such film", async () => {
      mocks.getMovie.mockResolvedValue(null);
      expect(await loadFilmPage(999999999, USER_ID)).toEqual({
        status: "not-found",
      });
    });

    // E9
    it("is 'unavailable' when TMDB is down", async () => {
      mocks.getMovie.mockRejectedValue(new TmdbUnavailableError("down"));
      expect(await loadFilmPage(10999, USER_ID)).toEqual({
        status: "unavailable",
      });
    });
  });

  describe("a film somebody has rated (R14)", () => {
    it("uses our stored copy and does not contact TMDB", async () => {
      mocks.tables.titles = { data: storedTitle(3), error: null };

      expect(await loadFilmPage(10999, USER_ID)).toEqual({
        status: "ok",
        film: COMMANDO,
        titleId: 42,
        myRating: null,
      });
      expect(mocks.getMovie).not.toHaveBeenCalled();
      expect(mocks.ensureTitle).not.toHaveBeenCalled();
    });

    // R19: an existing rating is shown, not a blank form.
    it("returns this member's current rating of it", async () => {
      mocks.tables.titles = { data: storedTitle(3), error: null };
      mocks.tables.ratings = {
        data: { quality: 2, enjoyment: 9, review: "So bad it's good." },
        error: null,
      };

      const result = await loadFilmPage(10999, USER_ID);

      expect(result).toMatchObject({
        myRating: { quality: 2, enjoyment: 9, review: "So bad it's good." },
      });
      expect(mocks.filters.ratings).toEqual(
        expect.arrayContaining([
          ["user_id", USER_ID],
          ["title_id", 42],
          ["is_current", true],
        ]),
      );
    });

    // E14: a 0 must survive the trip, and "no review" becomes "".
    it("keeps a score of 0, and turns a missing review into empty text", async () => {
      mocks.tables.titles = { data: storedTitle(3), error: null };
      mocks.tables.ratings = {
        data: { quality: 0, enjoyment: 0, review: null },
        error: null,
      };

      expect(await loadFilmPage(10999, USER_ID)).toMatchObject({
        myRating: { quality: 0, enjoyment: 0, review: "" },
      });
    });

    // E10
    it("refreshes a copy older than 30 days", async () => {
      mocks.tables.titles = { data: storedTitle(45, "Comando"), error: null };
      mocks.ensureTitle.mockResolvedValue({
        ok: true,
        title: storedTitle(0, "Commando"),
      });

      const result = await loadFilmPage(10999, USER_ID);

      expect(mocks.ensureTitle).toHaveBeenCalledWith(10999);
      expect(result).toMatchObject({ film: { title: "Commando" } });
    });

    it("still works from the old copy if the refresh cannot be done", async () => {
      mocks.tables.titles = { data: storedTitle(45, "Comando"), error: null };
      mocks.ensureTitle.mockResolvedValue({ ok: false, reason: "unavailable" });

      expect(await loadFilmPage(10999, USER_ID)).toMatchObject({
        status: "ok",
        film: { title: "Comando" },
        titleId: 42,
      });
    });
  });

  it("lets a database failure surface as an error", async () => {
    mocks.tables.titles = { data: null, error: { message: "down" } };
    await expect(loadFilmPage(10999, USER_ID)).rejects.toThrow(
      "Could not load the film.",
    );
  });
});
