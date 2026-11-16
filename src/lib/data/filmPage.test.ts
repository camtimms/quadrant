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
      // This query's own filters. A ratings query filtered to earlier
      // viewings (is_current = false) answers from "ratings-earlier", so a
      // test can give the two ratings queries different answers.
      const own: [string, unknown][] = [];
      const answer = () =>
        own.some(([column, value]) => column === "is_current" && !value)
          ? (mocks.tables[`${table}-earlier`] ?? { data: [], error: null })
          : mocks.tables[table];
      const query = {
        select: () => query,
        eq(column: string, value: unknown) {
          own.push([column, value]);
          (mocks.filters[table] ??= []).push([column, value]);
          return query;
        },
        order: () => query,
        maybeSingle: async () => answer(),
        // The real query builder can be awaited directly: it has a then()
        // method, like a promise. This gives the stand-in the same ability.
        then(resolve: (answer: { data: unknown; error: unknown }) => void) {
          resolve(answer());
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
  avatarUrl: string | null = null,
  updatedAt = "2026-11-16T10:00:00+00:00",
  watchNumber = 1,
) {
  return {
    id: 1,
    user_id: userId,
    watch_number: watchNumber,
    quality,
    enjoyment,
    review,
    updated_at: updatedAt,
    profiles: {
      display_name: name,
      avatar_url: avatarUrl,
      picture_source: "google",
      picture_version: 0,
    },
    // The real query always sends this list, empty when nobody liked it.
    review_likes: [] as {
      user_id: string;
      profiles: { display_name: string };
    }[],
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
        earlierViewings: [],
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
        earlierViewings: [],
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

    // R23 (v7): the folded section uses this to close after every save.
    it("returns when this member's rating was last saved", async () => {
      mocks.tables.titles = { data: storedTitle(3), error: null };
      mocks.tables.ratings = {
        data: [
          ratingRow(BOB_ID, "Bob", 7, 7, null, null, "2026-11-01T09:00:00Z"),
          ratingRow(USER_ID, "Cam", 2, 9, null, null, "2026-11-16T12:34:56Z"),
        ],
        error: null,
      };

      expect(await loadFilmPage(10999, USER_ID)).toMatchObject({
        myRating: { changedAt: "2026-11-16T12:34:56Z" },
      });
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
            avatarUrl: null,
            point: { quality: 7, enjoyment: 3 },
            review: "Well made, no fun.",
            isViewer: false,
          },
        ],
      });
    });

    // R69, R70 (design 20.3): each rating's id, for its like button, and who
    // liked its review, by name, arrive in the same query.
    it("passes on each rating's id and who liked its review", async () => {
      mocks.tables.ratings = {
        data: [
          {
            ...ratingRow(BOB_ID, "Bob", 7, 3, "Well made, no fun."),
            id: 41,
            review_likes: [
              { user_id: ZOE_ID, profiles: { display_name: "Zoe" } },
              { user_id: USER_ID, profiles: { display_name: "Cam" } },
            ],
          },
          { ...ratingRow(ZOE_ID, "Zoe", 1, 9), id: 42, review_likes: [] },
        ],
        error: null,
      };

      const result = await loadFilmPage(10999, USER_ID);
      if (result.status !== "ok") throw new Error("expected a film");
      const [bob, zoe] = result.ratings;

      expect(bob.ratingId).toBe(41);
      // By name, so the "Liked by" line reads the same on every load.
      expect(bob.likes).toEqual([
        { userId: USER_ID, displayName: "Cam" },
        { userId: ZOE_ID, displayName: "Zoe" },
      ]);
      expect(zoe.ratingId).toBe(42);
      expect(zoe.likes).toEqual([]);
    });

    // R79 (design 23.2): the address follows the member's choice.
    it("shows an uploaded picture from our own route, and none for the initial", async () => {
      const uploaded = ratingRow(BOB_ID, "Bob", 7, 3);
      uploaded.profiles = {
        ...uploaded.profiles,
        picture_source: "upload",
        picture_version: 4,
      };
      const initial = ratingRow(
        ZOE_ID,
        "Zoe",
        1,
        9,
        null,
        "https://lh3.googleusercontent.com/a/z=s96-c",
      );
      initial.profiles = { ...initial.profiles, picture_source: "initial" };
      mocks.tables.ratings = { data: [uploaded, initial], error: null };

      const result = await loadFilmPage(10999, USER_ID);
      if (result.status !== "ok") throw new Error("expected a film");
      expect(result.ratings.map((r) => r.avatarUrl)).toEqual([
        `/api/avatar/${BOB_ID}?v=4`,
        null,
      ]);
    });

    // R61: the picture's address travels with the name, in the same query.
    it("passes on each member's picture address, or null when they have none", async () => {
      const picture = "https://lh3.googleusercontent.com/a/abc123=s96-c";
      mocks.tables.ratings = {
        data: [
          ratingRow(BOB_ID, "Bob", 7, 3, null, picture),
          ratingRow(ZOE_ID, "Zoe", 1, 9),
        ],
        error: null,
      };

      const result = await loadFilmPage(10999, USER_ID);

      expect(
        result.status === "ok" && result.ratings.map((r) => r.avatarUrl),
      ).toEqual([picture, null]);
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

  describe("rewatches (R84, R85)", () => {
    beforeEach(() => {
      mocks.tables.titles = { data: storedTitle(1), error: null };
    });

    it("passes on how many times each member has watched it", async () => {
      mocks.tables.ratings = {
        data: [
          ratingRow(USER_ID, "Cam", 7, 7),
          ratingRow(BOB_ID, "Bob", 5, 5, null, null, undefined, 3),
        ],
        error: null,
      };
      const page = await loadFilmPage(10999, USER_ID);
      if (page.status !== "ok") throw new Error(page.status);
      expect(page.ratings.map((rating) => rating.timesWatched)).toEqual([1, 3]);
    });

    it("lists the viewer's earlier viewings when they have rewatched it", async () => {
      mocks.tables.ratings = {
        data: [ratingRow(USER_ID, "Cam", 9, 8, null, null, undefined, 2)],
        error: null,
      };
      mocks.tables["ratings-earlier"] = {
        data: [
          {
            created_at: "2025-12-24T10:00:00+00:00",
            quality: 6,
            enjoyment: 4,
            review: "",
          },
        ],
        error: null,
      };
      const page = await loadFilmPage(10999, USER_ID);
      if (page.status !== "ok") throw new Error(page.status);
      expect(page.earlierViewings).toEqual([
        {
          watchedAt: "2025-12-24T10:00:00+00:00",
          point: { quality: 6, enjoyment: 4 },
          review: null,
        },
      ]);
      // Only the viewer's own, for this film.
      expect(mocks.filters.ratings).toEqual(
        expect.arrayContaining([
          ["user_id", USER_ID],
          ["title_id", 42],
          ["is_current", false],
        ]),
      );
    });

    // Most films are watched once: no second query for them.
    it("does not look for earlier viewings of a first watch", async () => {
      mocks.tables.ratings = {
        data: [ratingRow(USER_ID, "Cam", 9, 8)],
        error: null,
      };
      const page = await loadFilmPage(10999, USER_ID);
      if (page.status !== "ok") throw new Error(page.status);
      expect(page.earlierViewings).toEqual([]);
      expect(mocks.filters.ratings).not.toContainEqual(["is_current", false]);
    });

    it("lets a failure to read earlier viewings surface as an error", async () => {
      mocks.tables.ratings = {
        data: [ratingRow(USER_ID, "Cam", 9, 8, null, null, undefined, 2)],
        error: null,
      };
      mocks.tables["ratings-earlier"] = {
        data: null,
        error: { message: "boom" },
      };
      await expect(loadFilmPage(10999, USER_ID)).rejects.toThrow();
    });
  });

  it("lets a database failure surface as an error", async () => {
    mocks.tables.titles = { data: null, error: { message: "down" } };
    await expect(loadFilmPage(10999, USER_ID)).rejects.toThrow(
      "Could not load the film.",
    );
  });
});
