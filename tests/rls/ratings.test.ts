import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import {
  admin,
  createTestTitle,
  createTestUser,
  PG,
  removeAllTestData,
  signedOutClient,
  type TestTitle,
  type TestUser,
  uninvite,
} from "./helpers";

/**
 * Access-control tests for films and ratings (migration 3).
 *
 * As in members.test.ts, these prove the rules at the database itself, by
 * signing in as real throwaway users and trying things a browser could try.
 *
 * The cast:
 *  - alice and bob are members with profiles;
 *  - carol is a member who gets removed from the invite list part-way through;
 *  - mallory has an account but was never invited;
 *  - a signed-out visitor has nothing but the public key.
 *
 * The scene: three films exist. Bob has already rated "Heat".
 */
let alice: TestUser;
let bob: TestUser;
let carol: TestUser;
let mallory: TestUser;

let heat: TestTitle;
let alien: TestTitle;
let clue: TestTitle;

type SaveRatingArgs = Database["public"]["Functions"]["save_rating"]["Args"];

/**
 * What a perfectly ordinary rating looks like, for save_rating.
 *
 * "No review" is sent as an empty string: the generated types do not allow
 * null for a function argument, and save_rating stores an empty or blank
 * review as null anyway.
 */
function rating(
  titleId: number,
  overrides: Partial<SaveRatingArgs> = {},
): SaveRatingArgs {
  return {
    p_title_id: titleId,
    p_quality: 7,
    p_enjoyment: 6,
    p_review: "",
    ...overrides,
  };
}

/** Bob's rating of Heat as the owner sees it, bypassing every rule. */
async function bobsHeatRating() {
  const { data, error } = await admin
    .from("ratings")
    .select()
    .eq("user_id", bob.id)
    .eq("title_id", heat.id)
    .single();
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  await removeAllTestData(); // sweep up after any earlier crashed run

  [alice, bob, carol, mallory] = await Promise.all([
    createTestUser("alice"),
    createTestUser("bob"),
    createTestUser("carol"),
    createTestUser("mallory", { invited: false }),
  ]);

  // A rating points at a profile, so members need one before they can rate.
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
  alien = await createTestTitle("Alien");
  clue = await createTestTitle("Clue");

  const { error } = await bob.client.rpc(
    "save_rating",
    rating(heat.id, { p_quality: 9, p_enjoyment: 8, p_review: "Bob's take" }),
  );
  if (error) throw error;
});

afterAll(async () => {
  await removeAllTestData();
});

describe("a signed-out visitor", () => {
  // R1, R5
  it("cannot read films", async () => {
    const { data, error } = await signedOutClient().from("titles").select();
    expect(error?.code).toBe(PG.permissionDenied);
    expect(data).toBeNull();
  });

  it("cannot read ratings", async () => {
    const { data, error } = await signedOutClient().from("ratings").select();
    expect(error?.code).toBe(PG.permissionDenied);
    expect(data).toBeNull();
  });

  it("cannot save a rating", async () => {
    const { error } = await signedOutClient().rpc(
      "save_rating",
      rating(heat.id),
    );
    expect(error?.code).toBe(PG.permissionDenied);
  });
});

describe("a signed-in user who was never invited", () => {
  // R4: no error, because they are allowed to ask. The policies simply match
  // no rows, so the app looks empty to them.
  it("sees no films", async () => {
    const { data, error } = await mallory.client.from("titles").select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("sees no ratings", async () => {
    const { data, error } = await mallory.client.from("ratings").select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cannot save a rating", async () => {
    const { error } = await mallory.client.rpc("save_rating", rating(heat.id));
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("cannot delete anyone's rating", async () => {
    await mallory.client.from("ratings").delete().eq("title_id", heat.id);
    expect((await bobsHeatRating()).quality).toBe(9);
  });
});

describe("a member rating a film", () => {
  // R15
  it("can save a rating, which is stored under their own id", async () => {
    const { data, error } = await alice.client.rpc(
      "save_rating",
      rating(heat.id, { p_quality: 3, p_enjoyment: 9, p_review: "Loved it" }),
    );
    expect(error).toBeNull();
    expect(data).toMatchObject({
      user_id: alice.id,
      title_id: heat.id,
      quality: 3,
      enjoyment: 9,
      review: "Loved it",
      is_current: true,
    });
  });

  // R19, R20, E5: saving again edits the rating; it never adds a second one.
  it("saving twice leaves one row, holding the newer scores", async () => {
    const first = await alice.client.rpc("save_rating", rating(alien.id));
    expect(first.error).toBeNull();
    // Sent as "" (see rating() above), stored as "no review".
    expect(first.data?.review).toBeNull();

    const second = await alice.client.rpc(
      "save_rating",
      rating(alien.id, { p_quality: 2, p_enjoyment: 10, p_review: "Changed" }),
    );
    expect(second.error).toBeNull();

    const { data } = await alice.client
      .from("ratings")
      .select()
      .eq("user_id", alice.id)
      .eq("title_id", alien.id);
    expect(data).toHaveLength(1);
    expect(data?.[0]).toMatchObject({
      id: first.data?.id, // the same row, edited
      quality: 2,
      enjoyment: 10,
      review: "Changed",
    });
    // R20: when it was last changed is recorded, by the database's trigger.
    expect(data![0].created_at).toBe(first.data!.created_at);
    expect(Date.parse(data![0].updated_at)).toBeGreaterThan(
      Date.parse(first.data!.updated_at),
    );
  });

  // Two saves at the very same moment: the "two browser tabs" case (E5).
  it("two saves at the same instant still leave one row", async () => {
    const results = await Promise.all([
      alice.client.rpc("save_rating", rating(clue.id, { p_quality: 1 })),
      alice.client.rpc("save_rating", rating(clue.id, { p_quality: 2 })),
    ]);
    expect(results.map((result) => result.error)).toEqual([null, null]);

    const { data } = await alice.client
      .from("ratings")
      .select()
      .eq("user_id", alice.id)
      .eq("title_id", clue.id);
    expect(data).toHaveLength(1);
  });

  // R19: the rule holds even for a request that skips save_rating.
  it("is refused a second current rating for the same film", async () => {
    const { error } = await alice.client.from("ratings").insert({
      user_id: alice.id,
      title_id: heat.id,
      quality: 5,
      enjoyment: 5,
    });
    expect(error?.code).toBe(PG.uniqueViolation);
  });

  // E14: 0 is a real score, not "nothing".
  it("can score 0 and 10", async () => {
    const { data, error } = await alice.client.rpc(
      "save_rating",
      rating(clue.id, { p_quality: 0, p_enjoyment: 10 }),
    );
    expect(error).toBeNull();
    expect(data).toMatchObject({ quality: 0, enjoyment: 10 });
  });

  // R16
  it.each([
    ["quality of -1", { p_quality: -1 }],
    ["quality of 11", { p_quality: 11 }],
    ["enjoyment of -1", { p_enjoyment: -1 }],
    ["enjoyment of 11", { p_enjoyment: 11 }],
  ])("is refused a %s", async (_name, overrides) => {
    const { error } = await alice.client.rpc(
      "save_rating",
      rating(clue.id, overrides),
    );
    expect(error?.code).toBe(PG.checkViolation);
  });

  it("is refused a score that is not a whole number", async () => {
    const { error } = await alice.client.rpc(
      "save_rating",
      rating(clue.id, { p_quality: 7.5 }),
    );
    expect(error?.code).toBe(PG.invalidText);
  });

  it("is refused a missing score", async () => {
    const { error } = await alice.client.from("ratings").insert({
      user_id: alice.id,
      title_id: clue.id,
      enjoyment: 5,
      // No quality. The cast is needed because the types rightly forbid it.
    } as never);
    expect(error).not.toBeNull();
  });

  it("is refused out-of-range scores when skipping save_rating too", async () => {
    const { error } = await alice.client
      .from("ratings")
      .update({ quality: 11 })
      .eq("user_id", alice.id)
      .eq("title_id", heat.id);
    expect(error?.code).toBe(PG.checkViolation);
  });

  // R17
  it("can save a 500-character review but not a 501-character one", async () => {
    const ok = await alice.client.rpc(
      "save_rating",
      rating(clue.id, { p_review: "a".repeat(500) }),
    );
    expect(ok.error).toBeNull();
    expect(ok.data?.review).toHaveLength(500);

    const tooLong = await alice.client.rpc(
      "save_rating",
      rating(clue.id, { p_review: "a".repeat(501) }),
    );
    expect(tooLong.error?.code).toBe(PG.checkViolation);
  });

  it("has a review of only spaces stored as no review", async () => {
    const { data, error } = await alice.client.rpc(
      "save_rating",
      rating(clue.id, { p_review: "   " }),
    );
    expect(error).toBeNull();
    expect(data?.review).toBeNull();
  });

  // The database fills these in; nobody can back-date or retire a rating.
  it.each([
    ["created_at", { created_at: "2000-01-01T00:00:00Z" }],
    ["updated_at", { updated_at: "2000-01-01T00:00:00Z" }],
    ["is_current", { is_current: false }],
  ])("cannot set %s on their own rating", async (_column, change) => {
    const { error } = await alice.client
      .from("ratings")
      .update(change)
      .eq("user_id", alice.id)
      .eq("title_id", heat.id);
    expect(error?.code).toBe(PG.permissionDenied);
  });
});

describe("a member and other members' ratings (R22)", () => {
  it("can read everyone's ratings", async () => {
    const { data, error } = await alice.client
      .from("ratings")
      .select("user_id, quality")
      .eq("title_id", heat.id);
    expect(error).toBeNull();
    expect(data?.map((row) => row.user_id).sort()).toEqual(
      [alice.id, bob.id].sort(),
    );
  });

  it("cannot add a rating under another member's id", async () => {
    const { error } = await alice.client.from("ratings").insert({
      user_id: bob.id,
      title_id: alien.id,
      quality: 0,
      enjoyment: 0,
    });
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("cannot edit another member's rating", async () => {
    const { data, error } = await alice.client
      .from("ratings")
      .update({ quality: 0, review: "Vandalised" })
      .eq("user_id", bob.id)
      .select();
    // No error: the policy simply lets the update match no rows.
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(await bobsHeatRating()).toMatchObject({
      quality: 9,
      review: "Bob's take",
    });
  });

  it("cannot hand their own rating to another member", async () => {
    const { error } = await alice.client
      .from("ratings")
      .update({ user_id: bob.id } as never)
      .eq("user_id", alice.id)
      .eq("title_id", alien.id);
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("cannot delete another member's rating", async () => {
    const { data, error } = await alice.client
      .from("ratings")
      .delete()
      .eq("user_id", bob.id)
      .select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect((await bobsHeatRating()).quality).toBe(9);
  });

  // R21
  it("can delete their own rating, and only that one goes", async () => {
    const { data, error } = await alice.client
      .from("ratings")
      .delete()
      .eq("user_id", alice.id)
      .eq("title_id", alien.id)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    const left = await admin
      .from("ratings")
      .select("id")
      .eq("title_id", alien.id);
    expect(left.data).toEqual([]);
    expect((await bobsHeatRating()).quality).toBe(9);
  });
});

describe("a member and the films table", () => {
  it("can read films", async () => {
    const { data, error } = await alice.client
      .from("titles")
      .select("title")
      .eq("id", heat.id);
    expect(error).toBeNull();
    expect(data).toEqual([{ title: "Heat" }]);
  });

  // Film rows are written only by the server (design section 4.2).
  it("cannot add a film", async () => {
    const { error } = await alice.client.from("titles").insert({
      tmdb_id: 1,
      title: "Junk",
      fetched_at: new Date().toISOString(),
    });
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("cannot rename a film", async () => {
    const { error } = await alice.client
      .from("titles")
      .update({ title: "Junk" })
      .eq("id", heat.id);
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("cannot delete a film", async () => {
    const { error } = await alice.client
      .from("titles")
      .delete()
      .eq("id", heat.id);
    expect(error?.code).toBe(PG.permissionDenied);
  });
});

// R6: removal takes effect on the very next query, with no sign-out needed.
// Kept last because it changes the invite list.
describe("a member removed from the invite list", () => {
  beforeAll(async () => {
    const saved = await carol.client.rpc("save_rating", rating(heat.id));
    if (saved.error) throw saved.error;
    await uninvite(carol.email);
  });

  it("can no longer read ratings or films", async () => {
    const ratings = await carol.client.from("ratings").select();
    const titles = await carol.client.from("titles").select();
    expect(ratings.data).toEqual([]);
    expect(titles.data).toEqual([]);
  });

  it("can no longer save, edit or delete a rating", async () => {
    const saved = await carol.client.rpc(
      "save_rating",
      rating(alien.id, { p_quality: 1 }),
    );
    expect(saved.error?.code).toBe(PG.permissionDenied);

    await carol.client.from("ratings").delete().eq("user_id", carol.id);

    // E16: the rating they made while a member is still there, unchanged.
    const { data } = await admin
      .from("ratings")
      .select("quality")
      .eq("user_id", carol.id);
    expect(data).toEqual([{ quality: 7 }]);
  });

  it("leaves their rating visible to the remaining members", async () => {
    const { data } = await alice.client
      .from("ratings")
      .select("user_id")
      .eq("user_id", carol.id);
    expect(data).toHaveLength(1);
  });
});
