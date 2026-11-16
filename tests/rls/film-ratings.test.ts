import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestTitle,
  createTestUser,
  removeAllTestData,
  type TestTitle,
  type TestUser,
} from "./helpers";

/**
 * The query behind "Everyone's ratings" on the film page (R37), run for
 * real against the dev database.
 *
 * src/lib/data/filmPage.ts asks for every rating of one film with the
 * member's display name nested inside it. The unit test for that file feeds
 * it made-up rows; this test checks that the real database answers in the
 * shape those rows assume.
 *
 * The member's picture address is nested beside the name (R61): the rating
 * cards show it.
 *
 * The SELECT text here is the same as in filmPage.ts and must stay in step
 * with it. It is repeated because that file builds its own client from
 * request cookies, which a test has none of.
 */
const SELECT =
  "id, user_id, quality, enjoyment, review, updated_at, profiles!ratings_user_id_fkey (display_name, avatar_url, picture_source, picture_version), review_likes (user_id, profiles!review_likes_user_id_fkey (display_name))";

// The shape of a real Google account picture address (design 16.8).
const GOOGLE_PICTURE = "https://lh3.googleusercontent.com/a/test-alice=s96-c";

let alice: TestUser;
let bob: TestUser;
let mallory: TestUser;
let heat: TestTitle;
let alien: TestTitle;

beforeAll(async () => {
  await removeAllTestData();

  [alice, bob, mallory] = await Promise.all([
    createTestUser("alice", { avatarUrl: GOOGLE_PICTURE }),
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
  // What signing in does (R62): the database copies Alice's picture address
  // from her sign-in record into her profile. Bob has no picture.
  const synced = await alice.client.rpc("sync_profile_picture");
  if (synced.error) throw synced.error;

  heat = await createTestTitle("Heat");
  alien = await createTestTitle("Alien");

  for (const [user, title, quality, enjoyment, review] of [
    [alice, heat, 9, 8, "Pacino and De Niro."],
    [bob, heat, 0, 2, ""],
    [alice, alien, 10, 10, ""],
  ] as const) {
    const { error } = await user.client.rpc("save_rating", {
      p_title_id: title.id,
      p_quality: quality,
      p_enjoyment: enjoyment,
      p_review: review,
    });
    if (error) throw error;
  }
});

afterAll(removeAllTestData);

describe("the film page's ratings query", () => {
  it("returns every member's rating of the film with their name and picture nested inside", async () => {
    const { data, error } = await alice.client
      .from("ratings")
      .select(SELECT)
      .eq("title_id", heat.id)
      .eq("is_current", true);

    expect(error).toBeNull();
    // Alice's and Bob's ratings of Heat; not Alice's rating of Alien.
    expect(data).toHaveLength(2);

    const mine = data!.find((row) => row.user_id === alice.id)!;
    // The profile is ONE nested object, not a list.
    expect(Array.isArray(mine.profiles)).toBe(false);
    expect(mine).toEqual({
      id: expect.any(Number),
      user_id: alice.id,
      quality: 9,
      enjoyment: 8,
      review: "Pacino and De Niro.",
      // When the rating was last saved (R23, v7): a real moment in time.
      updated_at: expect.any(String),
      profiles: {
        display_name: "Alice",
        avatar_url: GOOGLE_PICTURE,
        picture_source: "google",
        picture_version: 0,
      },
      // Nobody has liked it yet: an empty list, never missing (R70).
      review_likes: [],
    });
    expect(Number.isNaN(Date.parse(mine.updated_at))).toBe(false);
  });

  // R70 (design 20.3): who liked a review arrives in the same query, each
  // like with the member's name nested as ONE object.
  it("returns who liked each review, with their names", async () => {
    const mine = await alice.client
      .from("ratings")
      .select("id")
      .eq("title_id", heat.id)
      .eq("user_id", alice.id)
      .single();
    if (mine.error) throw mine.error;
    const liked = await bob.client
      .from("review_likes")
      .insert({ rating_id: mine.data.id, user_id: bob.id });
    if (liked.error) throw liked.error;

    const { data, error } = await alice.client
      .from("ratings")
      .select(SELECT)
      .eq("id", mine.data.id)
      .single();

    expect(error).toBeNull();
    expect(data!.review_likes).toEqual([
      { user_id: bob.id, profiles: { display_name: "Bob" } },
    ]);
  });

  it("returns a friend's rating, with a 0 as the number 0 and no review as null", async () => {
    const { data } = await alice.client
      .from("ratings")
      .select(SELECT)
      .eq("title_id", heat.id)
      .eq("is_current", true);

    expect(data!.find((row) => row.user_id === bob.id)).toEqual({
      id: expect.any(Number),
      user_id: bob.id,
      quality: 0,
      enjoyment: 2,
      review: null,
      updated_at: expect.any(String),
      // Bob has no picture: null, which the card shows as his initial.
      profiles: {
        display_name: "Bob",
        avatar_url: null,
        picture_source: "google",
        picture_version: 0,
      },
      review_likes: [],
    });
  });

  // E12: a member who has not rated the film still sees friends' ratings.
  it("shows a film's ratings to a member who has not rated it", async () => {
    const { data, error } = await bob.client
      .from("ratings")
      .select(SELECT)
      .eq("title_id", alien.id)
      .eq("is_current", true);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]).toMatchObject({ profiles: { display_name: "Alice" } });
  });

  it("shows nothing to someone who is not a member", async () => {
    const { data } = await mallory.client
      .from("ratings")
      .select(SELECT)
      .eq("title_id", heat.id);

    expect(data ?? []).toEqual([]);
  });
});
