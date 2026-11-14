import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadMemberFilms } from "./ratings";

// The database is replaced with a stand-in that answers with rows shaped
// exactly as the real one sends them (checked against the dev database in
// tests/rls/member-films.test.ts). These tests are about what the loader
// does with those rows.

const mocks = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
  table: "",
  select: "",
  filters: [] as [string, unknown][],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      mocks.table = table;
      const query = {
        select(columns: string) {
          mocks.select = columns;
          return query;
        },
        eq(column: string, value: unknown) {
          mocks.filters.push([column, value]);
          return query;
        },
        then: (resolve: (value: unknown) => void) => resolve(mocks.result),
      };
      return query;
    },
  }),
}));

const USER_ID = "00000000-0000-4000-8000-000000000001";

function row(overrides: Record<string, unknown> = {}) {
  return {
    quality: 3,
    enjoyment: 9,
    created_at: "2026-11-01T10:00:00+00:00",
    updated_at: "2026-11-09T18:30:00+00:00",
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
  mocks.result = { data: [row()], error: null };
  mocks.filters.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadMemberFilms", () => {
  it("turns each rating into a film for the chart and list", async () => {
    expect(await loadMemberFilms(USER_ID)).toEqual([
      {
        tmdbId: 10999,
        title: "Commando",
        year: 1985,
        posterPath: "/x.jpg",
        point: { quality: 3, enjoyment: 9 },
        ratedAt: "2026-11-01T10:00:00+00:00",
        changedAt: "2026-11-09T18:30:00+00:00",
      },
    ]);
  });

  it("asks only for that member's current ratings", async () => {
    await loadMemberFilms(USER_ID);

    expect(mocks.table).toBe("ratings");
    expect(mocks.filters).toEqual(
      expect.arrayContaining([
        ["user_id", USER_ID],
        ["is_current", true],
      ]),
    );
  });

  // The owner's decision: "most recently rated" is when the film was first
  // rated, so editing a score later does not move it up the list.
  it("uses when the film was first rated, not when it was last changed", async () => {
    const [film] = await loadMemberFilms(USER_ID);
    // Ordered by the first rating; the later change is kept separately.
    expect(film.ratedAt).toBe("2026-11-01T10:00:00+00:00");
    expect(film.changedAt).toBe("2026-11-09T18:30:00+00:00");
  });

  // Reviews are not needed for the chart or list, so they are not fetched.
  it("does not fetch reviews", async () => {
    await loadMemberFilms(USER_ID);
    expect(mocks.select).not.toContain("review");
  });

  // E14
  it("keeps scores of 0", async () => {
    mocks.result = { data: [row({ quality: 0, enjoyment: 0 })], error: null };
    expect((await loadMemberFilms(USER_ID))[0].point).toEqual({
      quality: 0,
      enjoyment: 0,
    });
  });

  it("passes on a film with no year or poster", async () => {
    mocks.result = {
      data: [
        row({
          titles: {
            tmdb_id: 7,
            title: "Mystery",
            release_year: null,
            poster_path: null,
          },
        }),
      ],
      error: null,
    };
    expect((await loadMemberFilms(USER_ID))[0]).toMatchObject({
      year: null,
      posterPath: null,
    });
  });

  // R35: a member who has rated nothing gets an empty list, not an error.
  it("returns an empty list for a member with no ratings", async () => {
    mocks.result = { data: [], error: null };
    expect(await loadMemberFilms(USER_ID)).toEqual([]);
  });

  it("lets a database failure surface as an error", async () => {
    mocks.result = { data: null, error: { message: "down" } };
    await expect(loadMemberFilms(USER_ID)).rejects.toThrow(
      "Could not load the films.",
    );
  });
});
