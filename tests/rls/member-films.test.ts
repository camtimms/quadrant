import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestTitle,
  createTestUser,
  removeAllTestData,
  type TestTitle,
  type TestUser,
} from "./helpers";

/**
 * The query behind "My films", run for real against the dev database.
 *
 * src/lib/data/ratings.ts asks for each rating with its film nested inside
 * it. The unit test for that file feeds it made-up rows; this test checks
 * that the real database answers in the shape those rows assume. If
 * Supabase ever nested the film differently, this is the test that says so.
 *
 * The SELECT text here is the same as in ratings.ts and must stay in step
 * with it. It is repeated because that file builds its own client from
 * request cookies, which a test has none of.
 */
const SELECT =
  "quality, enjoyment, created_at, titles (tmdb_id, title, release_year, poster_path)";

let alice: TestUser;
let bob: TestUser;
let heat: TestTitle;
let alien: TestTitle;

beforeAll(async () => {
  await removeAllTestData();

  [alice, bob] = await Promise.all([
    createTestUser("alice"),
    createTestUser("bob"),
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

describe("the My films query", () => {
  it("returns each of a member's ratings with its film nested inside", async () => {
    const { data, error } = await alice.client
      .from("ratings")
      .select(SELECT)
      .eq("user_id", alice.id)
      .eq("is_current", true);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);

    const row = data!.find((r) => r.titles.tmdb_id === heat.tmdb_id)!;
    // The film is ONE nested object, not a list.
    expect(Array.isArray(row.titles)).toBe(false);
    expect(row).toEqual({
      quality: 9,
      enjoyment: 8,
      created_at: expect.any(String),
      titles: {
        tmdb_id: heat.tmdb_id,
        title: "Heat",
        release_year: 1999,
        poster_path: null,
      },
    });
    expect(Number.isNaN(Date.parse(row.created_at))).toBe(false);
  });

  it("keeps a score of 0 as the number 0", async () => {
    const { data } = await alice.client
      .from("ratings")
      .select(SELECT)
      .eq("user_id", alice.id)
      .eq("title_id", alien.id);
    expect(data?.[0]).toMatchObject({ quality: 0, enjoyment: 10 });
  });

  // R46: one member can load another member's films.
  it("lets a member load another member's films", async () => {
    const { data, error } = await alice.client
      .from("ratings")
      .select(SELECT)
      .eq("user_id", bob.id)
      .eq("is_current", true);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]).toMatchObject({ quality: 2, titles: { title: "Heat" } });
  });
});
