import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  createTestUser,
  invite,
  removeAllTestData,
  signedOutClient,
  testEmail,
  type TestUser,
} from "./helpers";

/**
 * Tests for migration 2: the sign-up hook and the "am I a member?" question.
 *
 * The hook tests need the "Before User Created" hook to be SWITCHED ON in the
 * dev project (Authentication > Hooks, pointing at public.hook_check_invite).
 * Creating the function is not enough. If they fail with "sign-up was
 * allowed", that switch is the first thing to check.
 */
let alice: TestUser;
let mallory: TestUser;

beforeAll(async () => {
  await removeAllTestData();
  [alice, mallory] = await Promise.all([
    createTestUser("alice"),
    createTestUser("mallory", { invited: false }),
  ]);
});

afterAll(async () => {
  await removeAllTestData();
});

describe("the sign-up hook", () => {
  // R4: an uninvited person never gets an account at all.
  it("refuses to create an account for an address that is not invited", async () => {
    const email = testEmail("stranger");
    const { data, error } = await signedOutClient().auth.signUp({
      email,
      password: randomUUID(),
    });

    expect(
      error,
      "sign-up was allowed: is the hook switched on?",
    ).not.toBeNull();
    expect(error?.message).toMatch(/invite-only/i);
    expect(data.user).toBeNull();

    // And nothing was left behind in the list of users.
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    expect(listed.data.users.some((user) => user.email === email)).toBe(false);
  });

  it("lets an invited address sign up", async () => {
    const email = testEmail("newcomer");
    await invite(email);
    const { data, error } = await signedOutClient().auth.signUp({
      email,
      password: randomUUID(),
    });
    expect(error).toBeNull();
    expect(data.user?.email).toBe(email);
  });

  // The invite list is stored in lower case; people do not always type that way.
  it("ignores capital letters in the address", async () => {
    const email = testEmail("shouty");
    await invite(email);
    const { error } = await signedOutClient().auth.signUp({
      email: email.toUpperCase(),
      password: randomUUID(),
    });
    expect(error).toBeNull();
  });

  // E17: the refusal must not reveal who IS invited. If an invited address
  // and an uninvited one got different errors from a second sign-up attempt,
  // that difference would leak the list. Here we only check the wording.
  it("gives a refusal that names nobody", async () => {
    const { error } = await signedOutClient().auth.signUp({
      email: testEmail("nosy"),
      password: randomUUID(),
    });
    expect(error?.message).not.toMatch(/@/);
    expect(error?.message).not.toContain(alice.email);
  });

  // Nobody but Supabase's own Auth service may call the function. If the
  // public could, they could test addresses against the invite list.
  it("cannot be called directly through the API", async () => {
    for (const client of [signedOutClient(), mallory.client, alice.client]) {
      const { data, error } = await client.rpc("hook_check_invite", {
        event: { user: { email: alice.email } },
      });
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    }
  });
});

describe("is_current_user_member", () => {
  it("is true for an invited member", async () => {
    const { data, error } = await alice.client.rpc("is_current_user_member");
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("is false for a signed-in user who is not invited", async () => {
    const { data, error } = await mallory.client.rpc("is_current_user_member");
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("cannot be called by a signed-out visitor", async () => {
    const { data, error } = await signedOutClient().rpc(
      "is_current_user_member",
    );
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
