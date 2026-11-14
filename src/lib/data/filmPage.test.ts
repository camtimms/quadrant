import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TmdbUnavailableError } from "@/lib/tmdb/client";
import type { TmdbFilmDetails } from "@/lib/tmdb/schema";
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
  getMovie: vi.fn<(id: number) => Promise<TmdbFilmDetails | null>>(),
  ensureTitle: vi.fn<(id: number) => Promise<EnsureTitleResult>>(),
}));

vi.mock("@/lib/supabase/server", () => ({
  // A pretend client supporting .from(t).select().eq()....maybeSingle()
  // for one row, and `await` on the query itself for a list of rows.
  createClient: async () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq(column: string, value: unknown) {
          (mocks.filters[table] ??= []).push([column, value]);
          return query;
        },
        maybeSingle: async () => mocks.tables[table],
        // The real query builder can be awaited directly: it has a then()
        // method, like a promise. This gives the stand-in the same ability.
        then(resolve: (answer: { data: unknown; error: unknown }) => void) {
          resolve(mocks.tables[table]);
        },
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
const BOB_ID = "00000000-0000-4000-8000-000000000002";
const ZOE_ID = "00000000-0000-4000-8000-000000000003";

/** A rating row as the database returns it, with the member's name nested. */
function ratingRow(
  userId: string,
  name: string,
  quality: number,
  enjoyment: number,
  review: string | null = null,
) {
  return {
    user_id: userId,
    quality,
    enjoyment,
    review,
    profiles: { display_name: name },
  };
}
const DAY_MS = 24 * 60 * 60 * 1000;

const COMMANDO: TmdbFilmDetails = {
  tmdbId: 10999,
  title: "Commando",
  year: 1985,
  posterPath: "/x.jpg",
  overview: "A retired commando is forced back into action.",
};

function storedTitle(
  daysOld: number,
  title = "Commando",
  overview: string | null = COMMANDO.overview,
) {
  return {
    overview,
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
  mocks.tables.ratings = { data: [], error: null };
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
        ratings: [],
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
        ratings: [],
      });
      expect(mocks.getMovie).not.toHaveBeenCalled();
      expect(mocks.ensureTitle).not.toHaveBeenCalled();
    });

    // R19: an existing rating is shown, not a blank form.
    it("returns this member's current rating of it", async () => {
      mocks.tables.titles = { data: storedTitle(3), error: null };
      mocks.tables.ratings = {
        data: [
          ratingRow(BOB_ID, "Bob", 7, 7),
          ratingRow(USER_ID, "Cam", 2, 9, "So bad it's good."),
        ],
        error: null,
      };

      const result = await loadFilmPage(10999, USER_ID);

      // Picked out of everyone's ratings by user id: Bob's 7/7 is not it.
      expect(result).toMatchObject({
        myRating: { quality: 2, enjoyment: 9, review: "So bad it's good." },
      });
      expect(mocks.filters.ratings).toEqual(
        expect.arrayContaining([
          ["title_id", 42],
          ["is_current", true],
        ]),
      );
    });

    // E14: a 0 must survive the trip, and "no review" becomes "".
    it("keeps a score of 0, and turns a missing review into empty text", async () => {
      mocks.tables.titles = { data: storedTitle(3), error: null };
      mocks.tables.ratings = {
        data: [ratingRow(USER_ID, "Cam", 0, 0, null)],
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

  describe("the description (R54)", () => {
    it("comes from TMDB for a film nobody has rated", async () => {
      expect(await loadFilmPage(10999, USER_ID)).toMatchObject({
        film: { overview: COMMANDO.overview },
      });
    });

    it("comes from our stored copy for a rated film, without asking TMDB", async () => {
      mocks.tables.titles = {
        data: storedTitle(3, "Commando", "Our stored description."),
        error: null,
      };

      expect(await loadFilmPage(10999, USER_ID)).toMatchObject({
        film: { overview: "Our stored description." },
      });
      expect(mocks.getMovie).not.toHaveBeenCalled();
      expect(mocks.ensureTitle).not.toHaveBeenCalled();
    });

    // A film stored before descriptions were kept.
    it("is fetched for a stored film that has none yet", async () => {
      mocks.tables.titles = {
        data: storedTitle(3, "Commando", null),
        error: null,
      };
      mocks.ensureTitle.mockResolvedValue({
        ok: true,
        title: storedTitle(0, "Commando", "Freshly fetched."),
      });

      const result = await loadFilmPage(10999, USER_ID);

      expect(mocks.ensureTitle).toHaveBeenCalledWith(10999);
      expect(result).toMatchObject({ film: { overview: "Freshly fetched." } });
    });

    it("is simply absent if that fetch fails; the page still works", async () => {
      mocks.tables.titles = {
        data: storedTitle(3, "Commando", null),
        error: null,
      };
      mocks.ensureTitle.mockResolvedValue({ ok: false, reason: "unavailable" });

      expect(await loadFilmPage(10999, USER_ID)).toMatchObject({
        status: "ok",
        film: { title: "Commando", overview: null },
      });
    });

    it("is not fetched again for a film TMDB has no description for", async () => {
      mocks.tables.titles = {
        data: storedTitle(3, "Commando", ""),
        error: null,
      };
      await loadFilmPage(10999, USER_ID);
      expect(mocks.ensureTitle).not.toHaveBeenCalled();
    });
  });

  describe("everyone's ratings (R37)", () => {
    beforeEach(() => {
      mocks.tables.titles = { data: storedTitle(3), error: null };
    });

    it("returns every member's rating with their name, scores and review", async () => {
      mocks.tables.ratings = {
        data: [ratingRow(BOB_ID, "Bob", 7, 3, "Well made, no fun.")],
        error: null,
      };

      expect(await loadFilmPage(10999, USER_ID)).toMatchObject({
        ratings: [
          {
            userId: BOB_ID,
            displayName: "Bob",
            point: { quality: 7, enjoyment: 3 },
            review: "Well made, no fun.",
            isViewer: false,
          },
        ],
      });
    });

    // The query must not be narrowed to the viewer, or friends would vanish.
    it("does not filter by member", async () => {
      await loadFilmPage(10999, USER_ID);
      const columns = mocks.filters.ratings.map(([column]) => column);
      expect(columns).not.toContain("user_id");
    });

    // E12
    it("returns friends' ratings when the viewer has not rated the film", async () => {
      mocks.tables.ratings = {
        data: [ratingRow(BOB_ID, "Bob", 7, 3), ratingRow(ZOE_ID, "Zoe", 1, 9)],
        error: null,
      };

      const result = await loadFilmPage(10999, USER_ID);

      expect(result).toMatchObject({ myRating: null });
      expect(result.status === "ok" && result.ratings).toHaveLength(2);
    });

    it("puts the viewer first, then the others by name", async () => {
      mocks.tables.ratings = {
        data: [
          ratingRow(ZOE_ID, "Zoe", 1, 9),
          ratingRow(USER_ID, "Cam", 5, 5),
          ratingRow(BOB_ID, "bob", 7, 3),
        ],
        error: null,
      };

      const result = await loadFilmPage(10999, USER_ID);

      expect(
        result.status === "ok" &&
          result.ratings.map((r) => [r.displayName, r.isViewer]),
      ).toEqual([
        ["Cam", true],
        ["bob", false],
        ["Zoe", false],
      ]);
    });

    it("reads 'no review' as null, whether stored as null or as empty text", async () => {
      mocks.tables.ratings = {
        data: [
          ratingRow(BOB_ID, "Bob", 7, 3, null),
          ratingRow(ZOE_ID, "Zoe", 1, 9, ""),
        ],
        error: null,
      };

      const result = await loadFilmPage(10999, USER_ID);

      expect(
        result.status === "ok" && result.ratings.map((r) => r.review),
      ).toEqual([null, null]);
    });

    it("lets a failure to read the ratings surface as an error", async () => {
      mocks.tables.ratings = { data: null, error: { message: "down" } };
      await expect(loadFilmPage(10999, USER_ID)).rejects.toThrow(
        "Could not load the ratings.",
      );
    });
  });

  it("lets a database failure surface as an error", async () => {
    mocks.tables.titles = { data: null, error: { message: "down" } };
    await expect(loadFilmPage(10999, USER_ID)).rejects.toThrow(
      "Could not load the film.",
    );
  });
});
