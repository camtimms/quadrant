import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestTitle,
  createTestUser,
  PG,
  removeAllTestData,
  signedOutClient,
  type TestTitle,
  type TestUser,
} from "./helpers";

/**
 * Likes on reviews (R69–R72, design 20), proven from outside, as a browser
 * would try them. Each test says what the database must allow or refuse,
 * whatever the app's own pages do.
 */

let alice: TestUser; // wrote a review of Heat
let bob: TestUser; // likes things
let carol: TestUser; // rated Heat with no review
let mallory: TestUser; // signed in, never invited
let heat: TestTitle;
let alicesReview: number; // the id of Alice's rating of Heat
let carolsRating: number; // the id of Carol's review-less rating

/** Save a rating as `user` and return its id. */
async function rate(user: TestUser, title: TestTitle, review: string) {
  // save_rating returns the saved row itself, so no .single() is needed.
  const { data, error } = await user.client.rpc("save_rating", {
    p_title_id: title.id,
    p_quality: 8,
    p_enjoyment: 7,
    p_review: review,
  });
  if (error) throw error;
  return data.id;
}

/** Who has liked a rating, read as Alice (a member). */
async function likersOf(ratingId: number): Promise<string[]> {
  const { data, error } = await alice.client
    .from("review_likes")
    .select("user_id")
    .eq("rating_id", ratingId);
  if (error) throw error;
  return data.map((row) => row.user_id).sort();
}

const like = (user: TestUser, ratingId: number, userId = user.id) =>
  user.client
    .from("review_likes")
    .insert({ rating_id: ratingId, user_id: userId });

beforeAll(async () => {
  await removeAllTestData();
  [alice, bob, carol] = await Promise.all([
    createTestUser("likes-alice"),
    createTestUser("likes-bob"),
    createTestUser("likes-carol"),
  ]);
  mallory = await createTestUser("likes-mallory", { invited: false });

  // A rating, and a like, point at a profile, so members need one first.
  for (const [user, name] of [
    [alice, "Alice"],
    [bob, "Bob"],
    [carol, "Carol"],
  ] as const) {
    const { error } = await user.client
      .from("profiles")
      .insert({ id: user.id, display_name: name });
    if (error) throw error;
  }

  heat = await createTestTitle("Heat");
  alicesReview = await rate(alice, heat, "Brilliant heist film.");
  carolsRating = await rate(carol, heat, "");
});

afterAll(removeAllTestData);

describe("liking a review (R69, R71)", () => {
  it("lets a member like a friend's review", async () => {
    const { error } = await like(bob, alicesReview);
    expect(error).toBeNull();
    expect(await likersOf(alicesReview)).toContain(bob.id);
  });

  // E51: one like per member per review, whatever the app sends.
  it("refuses a second like from the same member", async () => {
    const { error } = await like(bob, alicesReview);
    expect(error?.code).toBe(PG.uniqueViolation);
  });

  it("lets a member like their own review", async () => {
    const { error } = await like(alice, alicesReview);
    expect(error).toBeNull();
    expect(await likersOf(alicesReview)).toEqual([alice.id, bob.id].sort());
  });

  // E54: a like is always the liker's own.
  it("refuses a like made on someone else's behalf", async () => {
    const { error } = await like(bob, alicesReview, carol.id);
    expect(error?.code).toBe(PG.permissionDenied);
    expect(await likersOf(alicesReview)).not.toContain(carol.id);
  });

  it("refuses a like on a rating with no written review", async () => {
    const { error } = await like(bob, carolsRating);
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("does not let anyone change a like", async () => {
    const { data } = await bob.client
      .from("review_likes")
      .update({ rating_id: carolsRating })
      .eq("rating_id", alicesReview)
      .select();
    expect(data ?? []).toHaveLength(0);
    expect(await likersOf(alicesReview)).toContain(bob.id);
  });
});

describe("seeing likes (R70)", () => {
  it("lets every member see who liked a review", async () => {
    const { data, error } = await carol.client
      .from("review_likes")
      .select("user_id, profiles (display_name)")
      .eq("rating_id", alicesReview);
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.every((row) => row.profiles?.display_name)).toBe(true);
  });

  it("shows nothing to a signed-out visitor", async () => {
    const { data } = await signedOutClient()
      .from("review_likes")
      .select("user_id");
    expect(data ?? []).toHaveLength(0);
  });

  it("shows nothing to a signed-in user who is not a member", async () => {
    const { data } = await mallory.client
      .from("review_likes")
      .select("user_id");
    expect(data ?? []).toHaveLength(0);
  });

  it("refuses a like from a non-member", async () => {
    const { error } = await like(mallory, alicesReview);
    expect(error).not.toBeNull();
  });
});

describe("removing likes", () => {
  it("lets a member take back their own like", async () => {
    await bob.client
      .from("review_likes")
      .delete()
      .eq("rating_id", alicesReview)
      .eq("user_id", bob.id);
    expect(await likersOf(alicesReview)).not.toContain(bob.id);
    await like(bob, alicesReview);
  });

  it("does not let a member remove someone else's like", async () => {
    await carol.client
      .from("review_likes")
      .delete()
      .eq("rating_id", alicesReview);
    expect(await likersOf(alicesReview)).toEqual([alice.id, bob.id].sort());
  });
});

describe("when the review changes (R72)", () => {
  it("keeps the likes when the review is edited", async () => {
    await rate(alice, heat, "Brilliant heist film. The diner scene!");
    expect(await likersOf(alicesReview)).toEqual([alice.id, bob.id].sort());
  });

  it("removes the likes when the review's text is removed", async () => {
    await rate(alice, heat, "   ");
    expect(await likersOf(alicesReview)).toEqual([]);
  });

  it("removes the likes when the rating is deleted", async () => {
    const id = await rate(alice, heat, "Back again.");
    await like(bob, id);
    expect(await likersOf(id)).toEqual([bob.id]);

    await alice.client.from("ratings").delete().eq("id", id);
    const { data } = await bob.client
      .from("review_likes")
      .select("user_id")
      .eq("rating_id", id);
    expect(data ?? []).toHaveLength(0);
  });
});
