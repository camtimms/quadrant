import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { MEMBERS, type MemberKey } from "./members";

/**
 * Scene-setting for the end-to-end tests: throwaway members on the DEV
 * Supabase project, and the cookies that make a browser signed in as them.
 *
 * The tests themselves only ever act through the browser, like a person.
 * This file plays the owner's part (the invite list, the dashboard) and the
 * part Google plays at sign-in, which cannot be automated.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The end-to-end tests need .env.local and .env.test.local (see .env.example).`,
    );
  }
  return value;
}

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secretKey = requireEnv("SUPABASE_SECRET_KEY");

// Safety catch, the same one the access-control tests use: these tests
// create and delete users and edit the invite list, so refuse to start
// unless the app's database is the project named as the test target.
const testProjectRef = requireEnv("RLS_TEST_PROJECT_REF");
if (!url.includes(`//${testProjectRef}.`)) {
  throw new Error(
    `Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not the test project (${testProjectRef}).`,
  );
}

/** Bypasses every database rule. Setting the scene and cleaning up only. */
const admin = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Every throwaway address starts with this. It differs from the
 * access-control tests' "rls-test-" so that neither suite's clean-up can
 * delete the other's users halfway through a run.
 */
const E2E_EMAIL_PREFIX = "e2e-test-";

/** A cookie in the shape Playwright's `context.addCookies` expects. */
export type BrowserCookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax";
};

/**
 * Create a member: on the invite list, with a confirmed account and a
 * display name (so the app does not send them to /welcome first). Returns
 * the cookies a browser needs to be signed in as them on `host`.
 *
 * Google sign-in cannot be automated, so the dev project also allows
 * email + password (design section 10). Production has it switched off.
 */
export async function createSignedInMember(
  member: MemberKey,
  host: string,
): Promise<BrowserCookie[]> {
  const { label, displayName } = MEMBERS[member];
  const email = `${E2E_EMAIL_PREFIX}${label}-${randomUUID().slice(0, 8)}@example.com`;
  const password = randomUUID();

  // On the list BEFORE the account exists: the sign-up hook refuses anyone
  // who is not (R5).
  const invited = await admin
    .from("allowed_emails")
    .upsert({ email, note: "end-to-end test user" });
  if (invited.error) throw invited.error;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;

  // What /welcome would have stored (R7).
  const profile = await admin.from("profiles").insert({
    id: created.data.user.id,
    display_name: displayName,
    show_picture: false,
  });
  if (profile.error) throw profile.error;

  return signInCookies(email, password, host);
}

/**
 * Sign in and capture the cookies the app would have set.
 *
 * Rather than build the cookie by hand (its name, encoding and splitting
 * into chunks are @supabase/ssr's private business), this uses the same
 * library the app uses, with a cookie store that simply records what it is
 * asked to set. Whatever the library writes is, by definition, what the
 * app's proxy.ts will be able to read.
 */
async function signInCookies(
  email: string,
  password: string,
  host: string,
): Promise<BrowserCookie[]> {
  const written = new Map<string, string>();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => [...written].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) written.set(name, value);
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (written.size === 0) {
    throw new Error(
      "Signing in set no cookies; @supabase/ssr may have changed.",
    );
  }

  return [...written]
    .filter(([, value]) => value !== "")
    .map(([name, value]) => ({
      name,
      value,
      domain: host,
      path: "/",
      // The app reads these in the browser too, and the local server is
      // plain http, so neither flag can be set.
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    }));
}

/**
 * Remove every end-to-end test member and what they made, in an order the
 * database allows: ratings, profiles, invite-list rows, then the accounts.
 *
 * Films the tests rated are real films (the app stores them from TMDB on
 * first rating) and are left in place: they are shared, harmless, and may
 * also be rated by real dev users.
 *
 * It looks for the prefix rather than a remembered list, so it also sweeps
 * up after a run that crashed before cleaning up.
 */
export async function removeAllE2eData(): Promise<void> {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;

  const ids = listed.data.users
    .filter((user) => user.email?.startsWith(E2E_EMAIL_PREFIX))
    .map((user) => user.id);

  if (ids.length > 0) {
    // Uploaded pictures live in storage, not in a table, so deleting the
    // profile does not remove them (R79).
    for (const id of ids) {
      const files = await admin.storage.from("avatars").list(id);
      if (files.error) throw files.error;
      if (files.data.length > 0) {
        const removed = await admin.storage
          .from("avatars")
          .remove(files.data.map((file) => `${id}/${file.name}`));
        if (removed.error) throw removed.error;
      }
    }
    const ratings = await admin.from("ratings").delete().in("user_id", ids);
    if (ratings.error) throw ratings.error;
    const profiles = await admin.from("profiles").delete().in("id", ids);
    if (profiles.error) throw profiles.error;
  }

  const invites = await admin
    .from("allowed_emails")
    .delete()
    .like("email", `${E2E_EMAIL_PREFIX}%`);
  if (invites.error) throw invites.error;

  for (const id of ids) {
    const removed = await admin.auth.admin.deleteUser(id);
    if (removed.error) throw removed.error;
  }
}
