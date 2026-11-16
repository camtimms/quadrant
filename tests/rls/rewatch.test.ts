import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  createTestTitle,
  createTestUser,
  PG,
  removeAllTestData,
  signedOutClient,
  type TestTitle,
  type TestUser,
} from "./helpers";

/**
 * The rewatch log (R83–R87, design 24), proven from outside, as a browser
 * would try it.
 */

let alice: TestUser; // rewatches things
let bob: TestUser; // a friend
let mallory: TestUser; // signed in, never invited
let alien: TestTitle;
let heat: TestTitle;
let jaws: TestTitle;

type Scores = { quality: number; enjoyment: number; review: string };

const save = (user: TestUser, title: TestTitle, scores: Scores) =>
  user.client.rpc("save_rating", {
    p_title_id: title.id,
    p_quality: scores.quality,
    p_enjoyment: scores.enjoyment,
    p_review: scores.review,
  });

const rewatch = (user: TestUser, title: TestTitle, scores: Scores) =>
  user.client.rpc("log_rewatch", {
    p_title_id: title.id,
    p_quality: scores.quality,
    p_enjoyment: scores.enjoyment,
    p_review: scores.review,
  });

/** Every entry a member has for a film, oldest first, read with the admin key. */
async function entries(user: TestUser, title: TestTitle) {
  const { data, error } = await admin
    .from("ratings")
    .select("id, quality, enjoyment, review, is_current, watch_number")
    .eq("user_id", user.id)
    .eq("title_id", title.id)
    .order("watch_number");
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  await removeAllTestData();
  [alice, bob] = await Promise.all([
    createTestUser("rewatch-alice"),
    createTestUser("rewatch-bob"),
  ]);
  mallory = await createTestUser("rewatch-mallory", { invited: false });
  for (const [user, name] of [
    [alice, "Alice"],
    [bob, "Bob"],
  ] as const) {
    const { error } = await user.client
      .from("profiles")
      .insert({ id: user.id, display_name: name });
    if (error) throw error;
  }
  [alien, heat, jaws] = await Promise.all([
    createTestTitle("Alien"),
    createTestTitle("Heat"),
    createTestTitle("Jaws"),
  ]);
});

afterAll(removeAllTestData);

describe("logging a rewatch (R83)", () => {
  it("starts every first rating at watch 1", async () => {
    const { error } = await save(alice, alien, {
      quality: 8,
      enjoyment: 6,
      review: "Tense.",
    });
    expect(error).toBeNull();
    expect(await entries(alice, alien)).toMatchObject([
      { is_current: true, watch_number: 1 },
    ]);
  });

  it("keeps the old entry and makes the new one current", async () => {
    const { data, error } = await rewatch(alice, alien, {
      quality: 9,
      enjoyment: 8,
      review: "  Better the second time.  ",
    });
    expect(error).toBeNull();
    // The new entry comes back, review tidied as save_rating tidies it.
    expect(data).toMatchObject({
      quality: 9,
      enjoyment: 8,
      review: "Better the second time.",
      is_current: true,
      watch_number: 2,
    });
    expect(await entries(alice, alien)).toMatchObject([
      { quality: 8, enjoyment: 6, review: "Tense.", is_current: false },
      { quality: 9, enjoyment: 8, is_current: true, watch_number: 2 },
    ]);
  });

  it("counts on: a third watch is watch 3, with no review stored as none", async () => {
    const { error } = await rewatch(alice, alien, {
      quality: 9,
      enjoyment: 8,
      review: "   ",
    });
    expect(error).toBeNull();
    const rows = await entries(alice, alien);
    expect(rows.map((row) => row.watch_number)).toEqual([1, 2, 3]);
    expect(rows.filter((row) => row.is_current)).toHaveLength(1);
    expect(rows[2]).toMatchObject({ is_current: true, review: null });
  });

  // R20: an edit after a rewatch changes the current entry only.
  it("edits only the current entry afterwards", async () => {
    const { error } = await save(alice, alien, {
      quality: 10,
      enjoyment: 8,
      review: "",
    });
    expect(error).toBeNull();
    const rows = await entries(alice, alien);
    expect(rows.map((row) => row.quality)).toEqual([8, 9, 10]);
    expect(rows[2].watch_number).toBe(3);
  });

  // E71: nothing to keep, so it is simply a first rating.
  it("saves a rewatch of an unrated film as a first rating", async () => {
    const { error } = await rewatch(alice, heat, {
      quality: 7,
      enjoyment: 7,
      review: "",
    });
    expect(error).toBeNull();
    expect(await entries(alice, heat)).toMatchObject([
      { is_current: true, watch_number: 1 },
    ]);
  });

  it("refuses scores out of range, and keeps the current entry", async () => {
    const { error } = await rewatch(alice, heat, {
      quality: 11,
      enjoyment: 7,
      review: "",
    });
    expect(error?.code).toBe(PG.checkViolation);
    expect(await entries(alice, heat)).toMatchObject([
      { is_current: true, watch_number: 1 },
    ]);
  });

  // Two rewatches at the same moment queue; neither is lost or doubled.
  it("numbers two rewatches at once one after the other", async () => {
    const scores = { quality: 6, enjoyment: 6, review: "" };
    const results = await Promise.all([
      rewatch(alice, heat, scores),
      rewatch(alice, heat, scores),
    ]);
    expect(results.map((result) => result.error)).toEqual([null, null]);
    const rows = await entries(alice, heat);
    expect(rows.map((row) => row.watch_number)).toEqual([1, 2, 3]);
    expect(rows.filter((row) => row.is_current)).toHaveLength(1);
  });
});

describe("who may log a rewatch (E73, NFR1)", () => {
  it("refuses a member who is not on the invite list", async () => {
    const { error } = await rewatch(mallory, jaws, {
      quality: 5,
      enjoyment: 5,
      review: "",
    });
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("refuses a signed-out visitor", async () => {
    const { error } = await signedOutClient().rpc("log_rewatch", {
      p_title_id: jaws.id,
      p_quality: 5,
      p_enjoyment: 5,
      p_review: "",
    });
    expect(error).not.toBeNull();
  });

  it("only ever touches the caller's own entries", async () => {
    await save(bob, jaws, { quality: 4, enjoyment: 9, review: "Fun." });
    const { error } = await rewatch(alice, jaws, {
      quality: 8,
      enjoyment: 8,
      review: "",
    });
    expect(error).toBeNull();
    expect(await entries(bob, jaws)).toMatchObject([
      { quality: 4, is_current: true, watch_number: 1 },
    ]);
  });
});

describe("what members cannot write themselves", () => {
  it("cannot set the watch number when rating", async () => {
    const { error } = await bob.client.from("ratings").insert({
      user_id: bob.id,
      title_id: alien.id,
      quality: 5,
      enjoyment: 5,
      watch_number: 7,
    });
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("cannot change the watch number afterwards", async () => {
    const { error } = await bob.client
      .from("ratings")
      .update({ watch_number: 7 })
      .eq("user_id", bob.id);
    expect(error?.code).toBe(PG.permissionDenied);
  });
});

describe("deleting a rewatched rating (R87)", () => {
  it("removes every viewing of the film", async () => {
    const { error } = await alice.client
      .from("ratings")
      .delete()
      .eq("user_id", alice.id)
      .eq("title_id", alien.id);
    expect(error).toBeNull();
    expect(await entries(alice, alien)).toEqual([]);
  });
});
