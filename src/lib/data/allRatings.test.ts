import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadAllRatings } from "./allRatings";

// The database is replaced with a stand-in holding a list of rows shaped as
// the real one sends them (checked against the dev database in
// tests/rls/all-ratings.test.ts). Like the real API, it hands over at most
// CAP rows per request. These tests are about what the loader asks for and
// what it does with the answer.

const CAP = 1000;

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  error: null as unknown,
  table: "",
  select: "",
  options: undefined as unknown,
  filters: [] as [string, unknown][],
  order: [] as string[],
  ranges: [] as [number, number][],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      mocks.table = table;
      let range: [number, number] = [0, CAP - 1];
      const query = {
        select(columns: string, options?: unknown) {
          mocks.select = columns;
          mocks.options = options;
          return query;
        },
        eq(column: string, value: unknown) {
          mocks.filters.push([column, value]);
          return query;
        },
        order(column: string) {
          mocks.order.push(column);
          return query;
        },
        range(from: number, to: number) {
          range = [from, to];
          mocks.ranges.push(range);
          return query;
        },
        then: (resolve: (value: unknown) => void) =>
          resolve(
            mocks.error
              ? { data: null, error: mocks.error, count: null }
              : {
                  data: mocks.rows.slice(range[0], range[1] + 1).slice(0, CAP),
                  error: null,
                  count: mocks.rows.length,
                },
          ),
      };
      return query;
    },
  }),
}));

function row(overrides: Record<string, unknown> = {}) {
  return {
    user_id: "00000000-0000-4000-8000-000000000002",
    quality: 3,
    enjoyment: 9,
    review: "So bad it's good.",
    created_at: "2026-11-01T10:00:00+00:00",
    profiles: { display_name: "Bob", avatar_url: null },
    titles: {
      tmdb_id: 10999,
      title: "Commando",
      release_year: 1985,
      poster_path: "/x.jpg",
    },
    ...overrides,
  };
}

beforeEach(() => {
  mocks.rows = [row()];
  mocks.error = null;
  mocks.filters.length = 0;
  mocks.order.length = 0;
  mocks.ranges.length = 0;
});

describe("loadAllRatings", () => {
  it("turns each rating into a row for grouping", async () => {
    expect(await loadAllRatings()).toEqual([
      {
        tmdbId: 10999,
        title: "Commando",
        year: 1985,
        posterPath: "/x.jpg",
        point: { quality: 3, enjoyment: 9 },
        ratedAt: "2026-11-01T10:00:00+00:00",
        userId: "00000000-0000-4000-8000-000000000002",
        displayName: "Bob",
        avatarUrl: null,
        review: "So bad it's good.",
      },
    ]);
  });

  it("asks for every member's current ratings", async () => {
    await loadAllRatings();

    expect(mocks.table).toBe("ratings");
    // Current ratings only, and no filter on whose they are.
    expect(mocks.filters).toEqual([["is_current", true]]);
  });

  // Pages only fit together if the order is the same on every request.
  it("reads in a fixed order and asks for the total", async () => {
    await loadAllRatings();

    expect(mocks.order).toEqual(["id"]);
    expect(mocks.options).toEqual({ count: "exact" });
  });

  // R57, R59: the panel names who rated a film and starts their review.
  it("fetches who made each rating, their picture and their review", async () => {
    await loadAllRatings();

    expect(mocks.select).toContain("user_id");
    expect(mocks.select).toContain("review");
    // Named link (design 20.4): ratings and profiles are linked two ways.
    expect(mocks.select).toContain(
      "profiles!ratings_user_id_fkey (display_name, avatar_url)",
    );
  });

  it("passes on a member's picture address", async () => {
    const picture = "https://lh3.googleusercontent.com/a/abc123=s96-c";
    mocks.rows = [
      row({ profiles: { display_name: "Bob", avatar_url: picture } }),
    ];

    expect((await loadAllRatings())[0].avatarUrl).toBe(picture);
  });

  it("reads 'no review' as null, whether stored as null or as empty text", async () => {
    mocks.rows = [row({ review: null }), row({ review: "" })];

    expect((await loadAllRatings()).map((r) => r.review)).toEqual([null, null]);
  });

  // V5: one request returns at most 1,000 rows.
  it("reads past the 1,000-row cap, a page at a time", async () => {
    mocks.rows = Array.from({ length: 2300 }, (_, index) =>
      row({ quality: index % 11 }),
    );

    const rows = await loadAllRatings();

    expect(rows).toHaveLength(2300);
    expect(rows[2299].point.quality).toBe(2299 % 11);
    expect(mocks.ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  // E14
  it("keeps scores of 0", async () => {
    mocks.rows = [row({ quality: 0, enjoyment: 0 })];

    expect((await loadAllRatings())[0].point).toEqual({
      quality: 0,
      enjoyment: 0,
    });
  });

  it("returns an empty list when nobody has rated anything", async () => {
    mocks.rows = [];

    expect(await loadAllRatings()).toEqual([]);
  });

  it("lets a database failure surface as an error", async () => {
    mocks.error = { message: "down" };

    await expect(loadAllRatings()).rejects.toThrow("Could not load the rows.");
  });
});
