import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  createTestUser,
  PG,
  removeAllTestData,
  signedOutClient,
  type TestUser,
} from "./helpers";

/**
 * Access-control tests for members' pictures (migration 5; R61–R63, NFR1,
 * NFR5; design section 16.1).
 *
 * The rule being proved: the address in profiles.avatar_url can only ever be
 * a picture on Google's own servers, put there by the database itself, and
 * only while the member has left their picture switched on. No request a
 * member can send, through the app or around it, can store anything else.
 *
 * Why it matters: every friend's browser fetches whatever address is stored
 * there. If a member could store an address of their own choosing, they
 * could learn when each friend opens a page, and from where.
 *
 * The cast:
 *  - alice signed in with Google and has a picture;
 *  - bob has no picture on his Google account;
 *  - carol's sign-in record carries an address that is NOT Google's;
 *  - dave is a member who has not chosen a display name yet (no profile);
 *  - mallory has an account and a picture but was never invited.
 */
const GOOGLE_PICTURE = "https://lh3.googleusercontent.com/a/test-alice=s96-c";
const OTHER_GOOGLE_PICTURE =
  "https://lh5.googleusercontent.com/a/test-alice-new=s96-c";
const NOT_GOOGLE = "https://evil.example/pixel.png";

let alice: TestUser;
let bob: TestUser;
let carol: TestUser;
let dave: TestUser;
let mallory: TestUser;

/** A profile row as the owner sees it, bypassing every rule. */
async function profileOf(user: TestUser) {
  const { data, error } = await admin
    .from("profiles")
    .select("display_name, show_picture, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Call the function as this user, and insist that it did not fail. */
async function sync(user: TestUser) {
  const { error } = await user.client.rpc("sync_profile_picture");
  expect(error).toBeNull();
}

/**
 * Change the picture address in a user's OWN sign-in record, through the
 * public API, exactly as a member with browser developer tools could.
 */
async function editOwnSignInRecord(user: TestUser, avatarUrl: string) {
  const { error } = await user.client.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });
  if (error) throw error;
}

beforeAll(async () => {
  await removeAllTestData();

  [alice, bob, carol, dave, mallory] = await Promise.all([
    createTestUser("alice", { avatarUrl: GOOGLE_PICTURE }),
    createTestUser("bob"),
    createTestUser("carol", { avatarUrl: NOT_GOOGLE }),
    createTestUser("dave", { avatarUrl: GOOGLE_PICTURE }),
    createTestUser("mallory", { invited: false, avatarUrl: GOOGLE_PICTURE }),
  ]);

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

  // Mallory cannot make herself a profile (she is not a member), so the
  // owner's client gives her one. It is what a member who was later removed
  // from the invite list looks like.
  const { error } = await admin
    .from("profiles")
    .insert({ id: mallory.id, display_name: "Mallory" });
  if (error) throw error;
});

afterAll(removeAllTestData);

describe("a new profile", () => {
  // R63: on by default. The address is empty until the database fills it.
  it("starts with the picture switched on and no address stored", async () => {
    expect(await profileOf(alice)).toEqual({
      display_name: "Alice",
      show_picture: true,
      avatar_url: null,
    });
  });
});

describe("writing the picture address directly", () => {
  it("is refused when creating a profile", async () => {
    const { error } = await dave.client.from("profiles").insert({
      id: dave.id,
      display_name: "Dave",
      avatar_url: NOT_GOOGLE,
    });

    expect(error?.code).toBe(PG.permissionDenied);
    expect(await profileOf(dave)).toBeNull();
  });

  // Not even a genuine Google address: the column is simply not a member's
  // to write.
  it("is refused when creating a profile, even with a Google address", async () => {
    const { error } = await dave.client.from("profiles").insert({
      id: dave.id,
      display_name: "Dave",
      avatar_url: GOOGLE_PICTURE,
    });

    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("is refused when changing your own profile", async () => {
    const { error } = await bob.client
      .from("profiles")
      .update({ avatar_url: NOT_GOOGLE })
      .eq("id", bob.id);

    expect(error?.code).toBe(PG.permissionDenied);
    expect((await profileOf(bob))?.avatar_url).toBeNull();
  });

  it("is refused when slipped in beside a display name", async () => {
    const { error } = await bob.client
      .from("profiles")
      .update({ display_name: "Bobby", avatar_url: NOT_GOOGLE })
      .eq("id", bob.id);

    expect(error?.code).toBe(PG.permissionDenied);
    // Nothing was saved: not the address, and not the name either.
    expect(await profileOf(bob)).toMatchObject({
      display_name: "Bob",
      avatar_url: null,
    });
  });

  // The backstop: even the owner's client, which skips the permission
  // rules, cannot store an address that is not on Google's picture servers.
  it("cannot store a non-Google address even with the secret key", async () => {
    const { error } = await admin
      .from("profiles")
      .update({ avatar_url: NOT_GOOGLE })
      .eq("id", bob.id);

    expect(error?.code).toBe(PG.checkViolation);
  });
});

describe("what a member may still write", () => {
  // The narrower permissions must not break what the app already does.
  it("can create their own profile, as /welcome does", async () => {
    const { error } = await dave.client
      .from("profiles")
      .upsert({ id: dave.id, display_name: "Dave" });

    expect(error).toBeNull();
    expect(await profileOf(dave)).toMatchObject({
      display_name: "Dave",
      show_picture: true,
    });
  });

  it("can change their display name with the same upsert", async () => {
    const { error } = await dave.client
      .from("profiles")
      .upsert({ id: dave.id, display_name: "David" });

    expect(error).toBeNull();
    expect((await profileOf(dave))?.display_name).toBe("David");
  });

  it("can save the picture choice together with the name", async () => {
    const { error } = await dave.client
      .from("profiles")
      .upsert({ id: dave.id, display_name: "Dave", show_picture: false });

    expect(error).toBeNull();
    expect(await profileOf(dave)).toMatchObject({
      display_name: "Dave",
      show_picture: false,
    });
  });

  it("cannot change another member's picture choice", async () => {
    const { data, error } = await bob.client
      .from("profiles")
      .update({ show_picture: false })
      .eq("id", alice.id)
      .select();

    // No error: the row is simply not one Bob may pick to change.
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect((await profileOf(alice))?.show_picture).toBe(true);
  });

  it("cannot set when their profile was created", async () => {
    const { error } = await bob.client
      .from("profiles")
      .update({ created_at: "2001-01-01T00:00:00Z" })
      .eq("id", bob.id);

    expect(error?.code).toBe(PG.permissionDenied);
  });
});

describe("sync_profile_picture()", () => {
  // R62
  it("stores the member's Google picture address", async () => {
    await sync(alice);

    expect((await profileOf(alice))?.avatar_url).toBe(GOOGLE_PICTURE);
  });

  it("changes only the caller's own row", async () => {
    // Alice's call above must not have touched anyone else.
    expect((await profileOf(bob))?.avatar_url).toBeNull();
    expect((await profileOf(mallory))?.avatar_url).toBeNull();
  });

  // E27
  it("stores nothing for a member whose Google account has no picture", async () => {
    await sync(bob);

    expect((await profileOf(bob))?.avatar_url).toBeNull();
  });

  it("stores nothing when the sign-in record holds another site's address", async () => {
    await sync(carol);

    expect((await profileOf(carol))?.avatar_url).toBeNull();
  });

  // Each of these is an address dressed up to look like Google's.
  it.each([
    ["plain http", "http://lh3.googleusercontent.com/a/x=s96-c"],
    [
      "Google's name as a prefix of another site",
      "https://lh3.googleusercontent.com.evil.example/a/x",
    ],
    [
      "Google's name inside another site's path",
      "https://evil.example/https://lh3.googleusercontent.com/a/x",
    ],
    ["another Google site", "https://www.googleusercontent.com/a/x"],
    ["no path at all", "https://lh3.googleusercontent.com"],
    ["a script instead of an address", "javascript:alert(1)"],
    ["an address far too long to be real", GOOGLE_PICTURE + "x".repeat(600)],
  ])("stores nothing for %s", async (_name, address) => {
    await editOwnSignInRecord(carol, address);
    await sync(carol);

    expect((await profileOf(carol))?.avatar_url).toBeNull();
  });

  // A member really can edit their own sign-in record. That is why the
  // function checks the address instead of trusting where it came from.
  it("removes a stored picture when the sign-in record is edited to another site", async () => {
    await editOwnSignInRecord(alice, NOT_GOOGLE);
    await sync(alice);

    expect((await profileOf(alice))?.avatar_url).toBeNull();
  });

  // E30: a changed Google picture replaces the old address.
  it("replaces the address when the Google picture changes", async () => {
    await editOwnSignInRecord(alice, OTHER_GOOGLE_PICTURE);
    await sync(alice);

    expect((await profileOf(alice))?.avatar_url).toBe(OTHER_GOOGLE_PICTURE);
  });

  it("does nothing for a member with no profile yet", async () => {
    const eve = await createTestUser("eve", { avatarUrl: GOOGLE_PICTURE });

    await sync(eve);

    expect(await profileOf(eve)).toBeNull();
  });

  // E28: removed from the invite list, the picture stays as last stored.
  it("does nothing for a signed-in user who is not a member", async () => {
    await sync(mallory);

    expect((await profileOf(mallory))?.avatar_url).toBeNull();
  });

  it("cannot be called by a signed-out visitor", async () => {
    const { error } = await signedOutClient().rpc("sync_profile_picture");

    expect(error?.code).toBe(PG.permissionDenied);
  });
});

// R63
describe("switching the picture off", () => {
  beforeAll(async () => {
    await editOwnSignInRecord(alice, GOOGLE_PICTURE);
    await sync(alice);
    expect((await profileOf(alice))?.avatar_url).toBe(GOOGLE_PICTURE);
  });

  // The database removes the address in the same step as the choice is
  // saved. It does not depend on the app remembering to tidy up afterwards.
  it("removes the stored address at once", async () => {
    const { error } = await alice.client
      .from("profiles")
      .update({ show_picture: false })
      .eq("id", alice.id);

    expect(error).toBeNull();
    expect(await profileOf(alice)).toMatchObject({
      show_picture: false,
      avatar_url: null,
    });
  });

  it("is not undone by signing in again", async () => {
    await sync(alice);

    expect((await profileOf(alice))?.avatar_url).toBeNull();
  });

  it("cannot be overridden, even with the secret key", async () => {
    await admin
      .from("profiles")
      .update({ avatar_url: GOOGLE_PICTURE })
      .eq("id", alice.id);

    expect((await profileOf(alice))?.avatar_url).toBeNull();
  });

  it("stores the picture again once it is switched back on", async () => {
    const { error } = await alice.client
      .from("profiles")
      .update({ show_picture: true })
      .eq("id", alice.id);
    expect(error).toBeNull();
    // Switching on only records the choice; the address arrives with the
    // next call, which the app makes straight after saving.
    expect((await profileOf(alice))?.avatar_url).toBeNull();

    await sync(alice);

    expect((await profileOf(alice))?.avatar_url).toBe(GOOGLE_PICTURE);
  });
});

describe("reading pictures", () => {
  // R61: friends see each other's pictures.
  it("lets a member read another member's picture address", async () => {
    const { data, error } = await bob.client
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", alice.id);

    expect(error).toBeNull();
    expect(data).toEqual([
      { display_name: "Alice", avatar_url: GOOGLE_PICTURE },
    ]);
  });

  it("gives a signed-in non-member nothing", async () => {
    const { data, error } = await mallory.client
      .from("profiles")
      .select("avatar_url");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("refuses a signed-out visitor", async () => {
    const { data, error } = await signedOutClient()
      .from("profiles")
      .select("avatar_url");

    expect(error?.code).toBe(PG.permissionDenied);
    expect(data).toBeNull();
  });
});
