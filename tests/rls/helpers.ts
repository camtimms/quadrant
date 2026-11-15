import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Helpers for the access-control tests.
 *
 * The tests prove the database's rules FROM THE OUTSIDE: they sign in as
 * real (throwaway) users and try things a browser could try, including
 * things the app's own pages would never do. If a rule is wrong, a test that
 * goes through the app's code might never notice; these will.
 *
 * Two kinds of client are used:
 *  - the ADMIN client holds the secret key, which bypasses every rule. It is
 *    used only to set the scene (create users, edit the invite list) and to
 *    clean up. It plays the part of the owner in the Supabase dashboard.
 *  - ORDINARY clients hold only the public key, exactly like a browser, and
 *    are what the tests actually make claims about.
 */

type Client = SupabaseClient<Database>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The access-control tests need .env.local and .env.test.local (see .env.example).`,
    );
  }
  return value;
}

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secretKey = requireEnv("SUPABASE_SECRET_KEY");

// Safety catch. These tests create and delete users and edit the invite
// list. Run against the production project they would do real damage, so
// refuse to start unless the URL is the project named as the test target.
const testProjectRef = requireEnv("RLS_TEST_PROJECT_REF");
if (!url.includes(`//${testProjectRef}.`)) {
  throw new Error(
    `Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not the test project (${testProjectRef}).`,
  );
}

// Sessions are kept in memory only. Each client is one person for the length
// of one test run; nothing should be written to disk or refreshed in the
// background.
const authOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

/** The owner's view: bypasses every rule. Scene-setting and clean-up only. */
export const admin: Client = createClient<Database>(
  url,
  secretKey,
  authOptions,
);

/** A visitor who has not signed in: exactly what a stranger's browser has. */
export function signedOutClient(): Client {
  return createClient<Database>(url, publishableKey, authOptions);
}

/** Every throwaway address starts with this, so clean-up can find them. */
const TEST_EMAIL_PREFIX = "rls-test-";
const TEST_EMAIL_DOMAIN = "example.com";

export type TestUser = {
  id: string;
  email: string;
  /** A client signed in as this user, holding only the public key. */
  client: Client;
};

/**
 * Create a throwaway user and sign in as them.
 *
 * Google sign-in cannot be automated, so the dev project also allows
 * email + password, used only here. Production has it switched off.
 */
export async function createTestUser(
  label: string,
  {
    invited = true,
    avatarUrl,
  }: {
    invited?: boolean;
    /**
     * Put this in the user's sign-in record as their picture address, where
     * a real Google sign-in leaves it (design 16.8).
     */
    avatarUrl?: string;
  } = {},
): Promise<TestUser> {
  const email = testEmail(label);
  const password = randomUUID();

  // Every test user is put on the invite list BEFORE being created, because
  // once the sign-up hook is switched on (migration 2) it may refuse to
  // create anyone who is not. A user meant to be uninvited is taken off the
  // list again at the end, which leaves exactly the situation we want to
  // test: a real account, with a valid session, that is not a member.
  await invite(email);

  const created = await admin.auth.admin.createUser({
    email,
    password,
    // Mark the address as confirmed so the user can sign in straight away.
    email_confirm: true,
    // What Google would have said about the user at sign-in.
    user_metadata: avatarUrl ? { avatar_url: avatarUrl } : undefined,
  });
  if (created.error) throw created.error;

  const client = signedOutClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  if (!invited) await uninvite(email);

  return { id: created.data.user.id, email, client };
}

/**
 * A fresh throwaway address. The random part keeps runs from colliding with
 * each other or with leftovers from a run that crashed.
 */
export function testEmail(label: string): string {
  return `${TEST_EMAIL_PREFIX}${label}-${randomUUID().slice(0, 8)}@${TEST_EMAIL_DOMAIN}`;
}

/** Put an address on the invite list, as the owner would in the dashboard. */
export async function invite(email: string): Promise<void> {
  const { error } = await admin
    .from("allowed_emails")
    .upsert({ email, note: "access-control test user" });
  if (error) throw error;
}

/** Take an address off the invite list. */
export async function uninvite(email: string): Promise<void> {
  const { error } = await admin
    .from("allowed_emails")
    .delete()
    .eq("email", email);
  if (error) throw error;
}

/**
 * TMDB ids used for throwaway films start here. Real TMDB ids are in the low
 * millions, so nothing genuine can be in this range, and clean-up can find
 * test films by it. (The column is a 32-bit integer; its limit is a little
 * above this.)
 */
export const TEST_TMDB_ID_START = 2_000_000_000;

let nextTestTmdbId = TEST_TMDB_ID_START;

export type TestTitle = Database["public"]["Tables"]["titles"]["Row"];

/**
 * Store a throwaway film, as the server does when a film is first rated.
 * Members cannot write film rows, so this uses the admin client.
 */
export async function createTestTitle(title: string): Promise<TestTitle> {
  const { data, error } = await admin
    .from("titles")
    .insert({
      tmdb_id: nextTestTmdbId++,
      title,
      release_year: 1999,
      fetched_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Store many throwaway films in one request, for tests that need more rows
 * than the API returns at once.
 */
export async function createTestTitles(count: number): Promise<void> {
  const fetchedAt = new Date().toISOString();
  const { error } = await admin.from("titles").insert(
    Array.from({ length: count }, (_, index) => ({
      tmdb_id: nextTestTmdbId++,
      title: `Bulk test film ${index + 1}`,
      release_year: 1999,
      fetched_at: fetchedAt,
    })),
  );
  if (error) throw error;
}

/**
 * Remove everything the tests created, in an order the database allows:
 * ratings first (they point at films and profiles), then test films, then
 * profiles (they point at the users), invite-list rows, and the users.
 *
 * It looks for the test prefix rather than a remembered list, so it also
 * sweeps up after an earlier run that crashed before cleaning up.
 */
export async function removeAllTestData(): Promise<void> {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;

  const testUsers = listed.data.users.filter((user) =>
    user.email?.startsWith(TEST_EMAIL_PREFIX),
  );
  const ids = testUsers.map((user) => user.id);

  if (ids.length > 0) {
    const ratings = await admin.from("ratings").delete().in("user_id", ids);
    if (ratings.error) throw ratings.error;
  }

  const titles = await admin
    .from("titles")
    .delete()
    .gte("tmdb_id", TEST_TMDB_ID_START);
  if (titles.error) throw titles.error;

  if (ids.length > 0) {
    const profiles = await admin.from("profiles").delete().in("id", ids);
    if (profiles.error) throw profiles.error;
  }

  const invites = await admin
    .from("allowed_emails")
    .delete()
    .like("email", `${TEST_EMAIL_PREFIX}%`);
  if (invites.error) throw invites.error;

  for (const id of ids) {
    const removed = await admin.auth.admin.deleteUser(id);
    if (removed.error) throw removed.error;
  }
}

/**
 * Postgres error codes the tests expect to see. Naming them makes the
 * assertions readable: "permission denied" instead of "42501".
 */
export const PG = {
  /** The role may not do this to the table at all, or a policy refused it. */
  permissionDenied: "42501",
  /** A check constraint refused the value. */
  checkViolation: "23514",
  /** A unique index refused a duplicate. */
  uniqueViolation: "23505",
  /** The value is not the right type, e.g. 7.5 where a whole number is needed. */
  invalidText: "22P02",
} as const;
