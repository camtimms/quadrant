/**
 * npm run demo:add            add the example members and ratings to quadrant-dev
 * npm run demo:add:prod       ... to quadrant-prod
 * npm run demo:remove         remove every one of them again from quadrant-dev
 * npm run demo:remove:prod    ... from quadrant-prod
 *
 * The data itself is in src/lib/demo/data.ts (task T43). Six made-up
 * members, about 75 ratings, rewatches and likes, so friends can see every
 * feature before they have rated much themselves.
 *
 * How the demo stays separate from real people:
 *  - Each demo member's address is demo-<name>@quadrant.invalid. ".invalid"
 *    is reserved: no real email or Google account can ever have it, and the
 *    accounts have no password, so nobody can sign in as them.
 *  - Removal finds them by that address only, so it can never touch a real
 *    member, and takes everything they made: ratings (with earlier
 *    viewings), likes, profiles, invite rows and accounts.
 *  - Demo likes are only on demo reviews.
 *
 * Settings come from .env.local for dev and .env.prod.local for prod, as
 * for refresh-titles (see that script for why not .env.production.local).
 */
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  DEMO_FILMS,
  DEMO_LIKES,
  DEMO_MEMBERS,
  DEMO_RATINGS,
  demoEmail,
  isDemoEmail,
  type DemoFilm,
} from "@/lib/demo/data";
import { PROD_PROJECT_REF } from "@/lib/maintenance/backupPlan";
import type { Database } from "@/lib/supabase/database.types";

const DAY_MS = 24 * 60 * 60 * 1000;

function loadSettings(prod: boolean): string | null {
  const envFile = prod ? ".env.prod.local" : ".env.local";
  if (!existsSync(envFile)) {
    console.error(`${envFile} is missing. See "Maintenance" in README.md.`);
    return null;
  }
  process.loadEnvFile(envFile);
  // Safety catch: the file must point at the project the command names.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (prod !== url.includes(`//${PROD_PROJECT_REF}.`)) {
    console.error(
      `Refusing to run: ${envFile} points at ${url || "nothing"}, which is not the ${prod ? "production" : "dev"} project.`,
    );
    return null;
  }
  return url;
}

/** The secret-key client: it skips row-level security, so use with care. */
function adminClient(url: string) {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
type Admin = ReturnType<typeof adminClient>;

/** Every demo account, found by address only. */
async function demoUsers(admin: Admin) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  return listed.data.users.filter((user) => isDemoEmail(user.email));
}

const at = (daysAgo: number, now: number) =>
  // A few hours apart within the day, so the feed is not in lock step.
  new Date(now - daysAgo * DAY_MS - (daysAgo % 7) * 3_600_000).toISOString();

async function add(admin: Admin): Promise<number> {
  if ((await demoUsers(admin)).length > 0) {
    console.error(
      "The demo is already there. Remove it first to add it again.",
    );
    return 1;
  }

  // 1. The films, fetched from TMDB and stored as a first rating would.
  //    Imported only now, after the settings are loaded.
  const { ensureTitle } = await import("@/lib/titles/ensureTitle");
  const titleIds = new Map<DemoFilm, number>();
  for (const [key, film] of Object.entries(DEMO_FILMS) as [
    DemoFilm,
    (typeof DEMO_FILMS)[DemoFilm],
  ][]) {
    const stored = await ensureTitle(film.tmdbId);
    if (!stored.ok) {
      console.warn(`  skipped ${film.title}: TMDB says ${stored.reason}`);
      continue;
    }
    // Never trust our own list for which film an id is.
    if (stored.title.title.toLowerCase() !== film.title.toLowerCase()) {
      console.warn(
        `  skipped ${film.title}: TMDB id ${film.tmdbId} is "${stored.title.title}"`,
      );
      continue;
    }
    titleIds.set(key, stored.title.id);
  }
  console.log(
    `Films ready: ${titleIds.size} of ${Object.keys(DEMO_FILMS).length}.`,
  );

  // 2. The members: on the invite list first (the sign-up hook refuses
  //    anyone who is not), then the account, then the profile.
  const userIds = new Map<string, string>();
  for (const member of DEMO_MEMBERS) {
    const email = demoEmail(member.slug);
    const invited = await admin
      .from("allowed_emails")
      .upsert({ email, note: "demo data (npm run demo:remove)" });
    if (invited.error) throw invited.error;
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    const id = created.data.user.id;
    // Just their initial: no picture to fetch or upload.
    const profile = await admin.from("profiles").insert({
      id,
      display_name: member.name,
      picture_source: "initial",
    });
    if (profile.error) throw profile.error;
    userIds.set(member.slug, id);
  }
  console.log(`Members added: ${userIds.size}.`);

  // 3. Ratings, earlier viewings first so watch numbers count up, then the
  //    current one. Dated in the past so the feed looks lived in.
  const now = Date.now();
  const ratingIds = new Map<string, number>();
  let viewings = 0;
  for (const rating of DEMO_RATINGS) {
    const titleId = titleIds.get(rating.film);
    if (titleId === undefined) continue;
    const userId = userIds.get(rating.member)!;
    const all = [...(rating.earlier ?? []), rating];
    for (const [index, viewing] of all.entries()) {
      const isCurrent = index === all.length - 1;
      const when = at(viewing.daysAgo, now);
      const saved = await admin
        .from("ratings")
        .insert({
          user_id: userId,
          title_id: titleId,
          quality: viewing.quality,
          enjoyment: viewing.enjoyment,
          review: viewing.review ?? null,
          is_current: isCurrent,
          watch_number: index + 1,
          created_at: when,
          updated_at: when,
        })
        .select("id")
        .single();
      if (saved.error) throw saved.error;
      viewings++;
      if (isCurrent) {
        ratingIds.set(`${rating.member}/${rating.film}`, saved.data.id);
      }
    }
  }
  console.log(`Ratings added: ${ratingIds.size} (${viewings} viewings).`);

  // 4. Likes, on demo reviews only.
  let likes = 0;
  for (const [liker, author, film] of DEMO_LIKES) {
    const ratingId = ratingIds.get(`${author}/${film}`);
    if (ratingId === undefined) continue;
    const liked = await admin
      .from("review_likes")
      .insert({ rating_id: ratingId, user_id: userIds.get(liker)! });
    if (liked.error) throw liked.error;
    likes++;
  }
  console.log(`Likes added: ${likes}.`);
  return 0;
}

async function remove(admin: Admin): Promise<number> {
  const users = await demoUsers(admin);
  const ids = users.map((user) => user.id);
  if (ids.length > 0) {
    // Likes go with the ratings and profiles (they cascade).
    const ratings = await admin.from("ratings").delete().in("user_id", ids);
    if (ratings.error) throw ratings.error;
    const profiles = await admin.from("profiles").delete().in("id", ids);
    if (profiles.error) throw profiles.error;
    for (const id of ids) {
      const removed = await admin.auth.admin.deleteUser(id);
      if (removed.error) throw removed.error;
    }
  }
  const invites = await admin
    .from("allowed_emails")
    .delete()
    .in(
      "email",
      DEMO_MEMBERS.map((member) => demoEmail(member.slug)),
    );
  if (invites.error) throw invites.error;
  // The films stay: they are shared, harmless, and may have real ratings.
  console.log(`Removed ${ids.length} demo members and everything they made.`);
  return 0;
}

async function main(): Promise<number> {
  const prod = process.argv.includes("--prod");
  const action = process.argv.includes("--remove") ? "remove" : "add";
  const url = loadSettings(prod);
  if (!url) return 1;
  console.log(
    `${action === "add" ? "Adding" : "Removing"} the demo in ${new URL(url).host} ...`,
  );
  const admin = adminClient(url);
  return action === "add" ? add(admin) : remove(admin);
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
