import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  createTestUser,
  invite,
  PG,
  removeAllTestData,
  signedOutClient,
  type TestUser,
  uninvite,
} from "./helpers";

/**
 * Access-control tests for the invite list and profiles (migration 1).
 * These are the proof of NFR1: the rules hold at the database, whatever the
 * app's own code does.
 *
 * The cast:
 *  - alice and bob are invited members;
 *  - mallory has an account but was never invited;
 *  - a signed-out visitor has nothing but the public key.
 */
let alice: TestUser;
let bob: TestUser;
let mallory: TestUser;

beforeAll(async () => {
  await removeAllTestData(); // sweep up after any earlier crashed run

  [alice, bob, mallory] = await Promise.all([
    createTestUser("alice"),
    createTestUser("bob"),
    createTestUser("mallory", { invited: false }),
  ]);

  // Bob already has a profile, so the tests have somebody else's row to aim at.
  const { error } = await bob.client
    .from("profiles")
    .insert({ id: bob.id, display_name: "Bob" });
  if (error) throw error;
});

afterAll(async () => {
  await removeAllTestData();
});

describe("a signed-out visitor", () => {
  // R1, R5
  it("cannot read profiles", async () => {
    const { data, error } = await signedOutClient().from("profiles").select();
    expect(error?.code).toBe(PG.permissionDenied);
    expect(data).toBeNull();
  });

  it("cannot read the invite list", async () => {
    const { data, error } = await signedOutClient()
      .from("allowed_emails")
      .select();
    expect(error?.code).toBe(PG.permissionDenied);
    expect(data).toBeNull();
  });

  it("cannot create a profile", async () => {
    const { error } = await signedOutClient()
      .from("profiles")
      .insert({ id: alice.id, display_name: "Stranger" });
    expect(error?.code).toBe(PG.permissionDenied);
  });
});

describe("a signed-in user who was never invited", () => {
  // R4: having a Google account is not enough.
  it("sees no profiles at all", async () => {
    const { data, error } = await mallory.client.from("profiles").select();
    // No error: they are allowed to ask. The policy simply matches no rows.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cannot create a profile for themselves", async () => {
    const { error } = await mallory.client
      .from("profiles")
      .insert({ id: mallory.id, display_name: "Mallory" });
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("cannot read the invite list", async () => {
    const { error } = await mallory.client.from("allowed_emails").select();
    expect(error?.code).toBe(PG.permissionDenied);
  });

  // R6: nobody can invite themselves.
  it("cannot add themselves to the invite list", async () => {
    const { error } = await mallory.client
      .from("allowed_emails")
      .insert({ email: mallory.email });
    expect(error?.code).toBe(PG.permissionDenied);

    // And they are still locked out afterwards.
    const { data } = await mallory.client.from("profiles").select();
    expect(data).toEqual([]);
  });
});

describe("an invited member", () => {
  // R7
  it("can create their own profile", async () => {
    const { error } = await alice.client
      .from("profiles")
      .insert({ id: alice.id, display_name: "Alice" });
    expect(error).toBeNull();
  });

  it("can read every member's profile", async () => {
    const { data, error } = await alice.client
      .from("profiles")
      .select("id, display_name")
      .in("id", [alice.id, bob.id]);
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.map((profile) => profile.display_name).sort()).toEqual([
      "Alice",
      "Bob",
    ]);
  });

  it("can change their own display name", async () => {
    const { data, error } = await alice.client
      .from("profiles")
      .update({ display_name: "Alice A." })
      .eq("id", alice.id)
      .select();
    expect(error).toBeNull();
    expect(data?.[0]?.display_name).toBe("Alice A.");
  });

  // The app saves a display name with one "insert, or update if it exists"
  // statement (an upsert). It must work for a name change as well as a
  // first save, and must leave exactly one row.
  it("can save their name again with an upsert", async () => {
    const { error } = await alice.client
      .from("profiles")
      .upsert({ id: alice.id, display_name: "Alice Again" });
    expect(error).toBeNull();

    const rows = await admin.from("profiles").select("id").eq("id", alice.id);
    expect(rows.data).toHaveLength(1);
  });

  it("cannot use an upsert to overwrite another member's profile", async () => {
    const { error } = await alice.client
      .from("profiles")
      .upsert({ id: bob.id, display_name: "Hacked" });
    expect(error?.code).toBe(PG.permissionDenied);

    const check = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", bob.id)
      .single();
    expect(check.data?.display_name).toBe("Bob");
  });

  // NFR1: a member cannot act as another member.
  it("cannot create a profile for another user", async () => {
    const { error } = await alice.client
      .from("profiles")
      .insert({ id: mallory.id, display_name: "Fake Mallory" });
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("cannot change another member's profile", async () => {
    const { data, error } = await alice.client
      .from("profiles")
      .update({ display_name: "Hacked" })
      .eq("id", bob.id)
      .select();
    // No error, but no rows either: Bob's row is invisible to an update by
    // Alice, so nothing matched and nothing changed.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const check = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", bob.id)
      .single();
    expect(check.data?.display_name).toBe("Bob");
  });

  it("cannot turn their own profile into somebody else's", async () => {
    const { error } = await alice.client
      .from("profiles")
      .update({ id: mallory.id })
      .eq("id", alice.id);
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("cannot delete a profile, even their own", async () => {
    const { error } = await alice.client
      .from("profiles")
      .delete()
      .eq("id", alice.id);
    expect(error?.code).toBe(PG.permissionDenied);
  });

  // NFR5, R6
  it("cannot read the invite list", async () => {
    const { data, error } = await alice.client.from("allowed_emails").select();
    expect(error?.code).toBe(PG.permissionDenied);
    expect(data).toBeNull();
  });

  it("cannot invite anyone", async () => {
    const { error } = await alice.client
      .from("allowed_emails")
      .insert({ email: mallory.email });
    expect(error?.code).toBe(PG.permissionDenied);
  });

  it("cannot remove anyone from the invite list", async () => {
    const { error } = await alice.client
      .from("allowed_emails")
      .delete()
      .eq("email", bob.email);
    expect(error?.code).toBe(PG.permissionDenied);

    const stillInvited = await admin
      .from("allowed_emails")
      .select("email")
      .eq("email", bob.email);
    expect(stillInvited.data).toHaveLength(1);
  });
});

describe("the display name rules", () => {
  it.each([
    ["an empty name", ""],
    ["a name of only spaces", "     "],
    ["a name of 41 characters", "x".repeat(41)],
  ])("refuses %s", async (_label, displayName) => {
    const { error } = await alice.client
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", alice.id);
    expect(error?.code).toBe(PG.checkViolation);
  });

  it("accepts a name of exactly 40 characters", async () => {
    const { error } = await alice.client
      .from("profiles")
      .update({ display_name: "x".repeat(40) })
      .eq("id", alice.id);
    expect(error).toBeNull();
  });
});

describe("the invite list itself", () => {
  // Stored lower case only, so one address can never be two entries.
  it("refuses an address that is not lower case", async () => {
    const { error } = await admin
      .from("allowed_emails")
      .insert({ email: "RLS-Test-Shouty@Example.com" });
    expect(error?.code).toBe(PG.checkViolation);
  });
});

// R6, and stronger than it asks: removal takes effect on the member's very
// next request, with the session they already hold. No redeploy, no waiting
// for them to sign in again.
describe("removing a member from the invite list", () => {
  it("locks them out immediately, and re-inviting lets them back in", async () => {
    const before = await bob.client.from("profiles").select("id");
    expect(before.data?.length).toBeGreaterThan(0);

    await uninvite(bob.email);
    try {
      const locked = await bob.client.from("profiles").select("id");
      expect(locked.error).toBeNull();
      expect(locked.data).toEqual([]);

      const write = await bob.client
        .from("profiles")
        .update({ display_name: "Still here?" })
        .eq("id", bob.id)
        .select();
      expect(write.data).toEqual([]);
    } finally {
      // Always put Bob back, even if an assertion above failed, so one
      // failure does not cascade into unrelated tests.
      await invite(bob.email);
    }

    const after = await bob.client.from("profiles").select("id");
    expect(after.data?.length).toBeGreaterThan(0);

    // His profile survived being removed (requirements E16).
    const kept = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", bob.id)
      .single();
    expect(kept.data?.display_name).toBe("Bob");
  });
});
