import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fetchAllPages } from "@/lib/data/paging";
import {
  createTestTitle,
  createTestTitles,
  createTestUser,
  removeAllTestData,
  TEST_TMDB_ID_START,
  type TestTitle,
  type TestUser,
} from "./helpers";

/**
 * The query behind Friends' films (R43), run for real against the dev
 * database, and the check of V5: how many rows one request returns.
 *
 * src/lib/data/allRatings.ts asks for every member's current rating with
 * its film nested inside, a page at a time. The unit test for that file
 * feeds it made-up rows; this test checks that the real database answers in
 * the shape those rows assume, reports the total, and pages correctly.
 *
 * The SELECT text here is the same as in allRatings.ts and must stay in
 * step with it. It is repeated because that file builds its own client from
 * request cookies, which a test has none of.
 */
const SELECT =
  "quality, enjoyment, created_at, titles (tmdb_id, title, release_year, poster_path)";

let alice: TestUser;
let bob: TestUser;
let mallory: TestUser;
let heat: TestTitle;
let alien: TestTitle;

beforeAll(async () => {
  await removeAllTestData();

  [alice, bob, mallory] = await Promise.all([
    createTestUser("alice"),
    createTestUser("bob"),
    // Signed in, but not on the invite list.
    createTestUser("mallory", { invited: false }),
  ]);
  for (const [user, name] of [
    [alice, "Alice"],
    [bob, "Bob"],
  ] as const) {
    const { error } = await user.client
      .from("profiles")
      .insert({ id: user.id, display_name: name });
    if (error) throw error;
  }

  heat = await createTestTitle("Heat");
  alien = await createTestTitle("Alien");

  for (const [user, title, quality, enjoyment] of [
    [alice, heat, 9, 8],
    [alice, alien, 0, 10],
    [bob, heat, 2, 2],
  ] as const) {
    const { error } = await user.client.rpc("save_rating", {
      p_title_id: title.id,
      p_quality: quality,
      p_enjoyment: enjoyment,
      p_review: "",
    });
    if (error) throw error;
  }
});

afterAll(removeAllTestData);

/** The loader's query, as one member's client would send it. */
function allRatingsPage(user: TestUser, from: number, to: number) {
  return user.client
    .from("ratings")
    .select(SELECT, { count: "exact" })
    .eq("is_current", true)
    .order("id")
    .range(from, to);
}

// The dev database may also hold real ratings made while trying the app, so
// these tests look only at the throwaway films.
const isTestFilm = (row: { titles: { tmdb_id: number } }) =>
  row.titles.tmdb_id >= TEST_TMDB_ID_START;

describe("the Friends' films query", () => {
  it("returns every member's ratings, each with its film nested inside", async () => {
    const { data, error } = await allRatingsPage(alice, 0, 999);

    expect(error).toBeNull();
    const rows = data!.filter(isTestFilm);
    // Alice sees Bob's rating as well as her own two.
    expect(rows).toHaveLength(3);

    const heatRows = rows.filter((r) => r.titles.tmdb_id === heat.tmdb_id);
    expect(heatRows.map((r) => r.quality).sort()).toEqual([2, 9]);
    // The film is ONE nested object, not a list.
    expect(Array.isArray(heatRows[0].titles)).toBe(false);
    expect(heatRows[0]).toEqual({
      quality: expect.any(Number),
      enjoyment: expect.any(Number),
      created_at: expect.any(String),
      titles: {
        tmdb_id: heat.tmdb_id,
        title: "Heat",
        release_year: 1999,
        poster_path: null,
      },
    });
    expect(Number.isNaN(Date.parse(heatRows[0].created_at))).toBe(false);
  });

  // The paging relies on this number to know when it has everything.
  it("reports the total number of matching rows", async () => {
    const { data, count } = await allRatingsPage(alice, 0, 999);

    expect(count).toBe(data!.length);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("returns the rows a range asks for, in the same order each time", async () => {
    const whole = await allRatingsPage(alice, 0, 999);
    const first = await allRatingsPage(alice, 0, 0);
    const second = await allRatingsPage(alice, 1, 1);

    expect(first.data).toEqual(whole.data!.slice(0, 1));
    expect(second.data).toEqual(whole.data!.slice(1, 2));
    // The total is reported even when only one row is asked for.
    expect(first.count).toBe(whole.count);
  });

  it("gives a signed-in non-member nothing", async () => {
    const { data, count } = await allRatingsPage(mallory, 0, 999);

    expect(data ?? []).toEqual([]);
    expect(count ?? 0).toBe(0);
  });
});

// V5 (design section 15): how many rows does one request return? Films are
// used here, not ratings, because many throwaway films can be stored in one
// go; the cap belongs to the API as a whole, not to one table.
describe("the API's row cap (V5)", () => {
  const BULK = 1001;

  /** The throwaway films, as a member would read them. */
  const testFilms = () =>
    alice.client
      .from("titles")
      .select("tmdb_id", { count: "exact" })
      .gte("tmdb_id", TEST_TMDB_ID_START)
      .order("id");

  beforeAll(async () => {
    await createTestTitles(BULK);
  });

  it("returns at most 1,000 rows for one request, without an error", async () => {
    const { data, error, count } = await testFilms();

    // No error: the answer is silently cut short. Only the total gives it
    // away. This is why Friends' films reads in pages.
    expect(error).toBeNull();
    expect(count).toBe(BULK + 2);
    expect(data!.length).toBeLessThan(count!);
    expect(data!.length).toBeLessThanOrEqual(1000);
  });

  it("is read in full by fetching a page at a time", async () => {
    const rows = await fetchAllPages((from, to) => testFilms().range(from, to));

    expect(rows).toHaveLength(BULK + 2);
    // Every row once: none repeated across pages, none missed.
    expect(new Set(rows.map((row) => row.tmdb_id)).size).toBe(BULK + 2);
  });
});
