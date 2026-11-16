# Quadrant

A private film log for a small group of friends. Every film gets two scores from
0 to 10 — **Quality** (how good it is) and **Enjoyment** (how much you enjoyed
it) — and the pair places it on a chart with four quadrants: Masterpieces,
Guilty Pleasures, Serious Watches and Dumpster Fires.

Live site: https://quadrant-db.vercel.app/ (invite-only: Google sign-in for
people on the invite list)

## How this project is built

Spec-driven: nothing is coded until it has been written down and approved.

| File | What it is |
| --- | --- |
| [docs/IDEA.md](docs/IDEA.md) | The original product brief |
| [docs/specs/01-requirements.md](docs/specs/01-requirements.md) | What the app must do (R1, R2, …) |
| [docs/specs/02-design.md](docs/specs/02-design.md) | How it does it, and the alternatives rejected |
| [docs/specs/03-tasks.md](docs/specs/03-tasks.md) | The ordered task list; ticked boxes show progress |
| [docs/specs/DECISIONS.md](docs/specs/DECISIONS.md) | Running log of decisions and why |

## Run it on your computer

You need [Node.js](https://nodejs.org/) 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

Copy `.env.example` to
`.env.local` and fill in the values. `.env.local` is git-ignored and must never
be committed.

## Checks

Run all three before every commit:

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint: catches likely bugs |
| `npm run typecheck` | Generates Next.js route types, then runs the TypeScript compiler |
| `npm test` | Unit tests (Vitest) |

Also available: `npm run format` (Prettier), `npm run build` (production build).

## Deployment

The site is hosted on [Vercel](https://vercel.com/) (free Hobby plan), connected
to the GitHub repository `camtimms/quadrant`.

- **Every push to `main` deploys to production** at the live URL above. There is
  no separate deploy step: `git push` is the deploy.
- Pushes to any other branch get their own temporary preview URL, shown in the
  Vercel dashboard and on the GitHub commit.
- HTTPS is automatic. Plain `http://` requests are redirected to `https://`.
- If a build fails, Vercel keeps serving the previous working version and shows
  the error in its dashboard under the project's Deployments tab.

Environment variables for the deployed site are set in the Vercel dashboard
(Project → Settings → Environment Variables), never in the repository.
`.env.example` lists every variable the app reads.

## Two Supabase projects

| Project | Used for | Sign-in methods |
| --- | --- | --- |
| `quadrant-dev` | Local development and the automated access-control and end-to-end tests | Google, plus email + password for test users only |
| `quadrant-prod` | The live site and real ratings | Google only |

The Supabase command-line tool is linked to `quadrant-dev`, so every database
command targets dev unless you deliberately use the production one:

| Command | Target |
| --- | --- |
| `npm run db:push` | `quadrant-dev` |
| `npm run test:rls` | `quadrant-dev` (refuses to run against anything else) |
| `npm run test:e2e` | `quadrant-dev` (same safety catch; creates and removes its own `e2e-test-` members) |
| `npm run db:push:prod` | `quadrant-prod` |

**Order for any database change:** write the migration, `npm run db:push`,
`npm run test:rls`, and only when that passes, `npm run db:push:prod`.

### Production settings that live in dashboards, not in code

If production ever has to be rebuilt, these are the things a fresh project
needs that no file in this repository sets:

In `quadrant-prod` (Supabase dashboard):

- Authentication → Sign In / Providers: **Google on** (client ID and secret
  from the Google Cloud OAuth client), **Email off**.
- Authentication → Hooks: "Before User Created" → Postgres function
  `public.hook_check_invite`. Creating the function (migration 2) does not
  switch the hook on.
- Authentication → URL Configuration: site URL = the live address; redirect
  URLs include `<live address>/auth/callback`.

In Google Cloud (the OAuth client): each Supabase project's callback URL,
`https://<project-ref>.supabase.co/auth/v1/callback`, as an authorised redirect
URI.

In Vercel (Production environment variables): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL`, with
`quadrant-prod`'s values, plus `TMDB_API_READ_ACCESS_TOKEN` (the long "API Read
Access Token" from TMDB's API settings page, not the short "API Key"; the same
token is used locally and in production) and `SUPABASE_SECRET_KEY`
(`quadrant-prod`'s secret key; it bypasses every database rule, so it is only
ever set here and in `.env.local`, where the `quadrant-dev` key goes). Changing
a variable needs a redeploy to take effect.

### Inviting and removing people

The invite list is the `allowed_emails` table. Edit it in the Supabase
dashboard's Table Editor, in the project you mean (production for real friends).

- **Invite:** add a row with the person's Google email address **in lower
  case**, then send them the site link.
- **Remove:** delete their row. They are locked out on their next page load;
  their ratings stay.

### If the site stops working: a paused database

The free Supabase plan **pauses a project after a week of low activity**. A
few visits a day keeps it awake; a quiet week among friends may not. While it
is paused the site shows "Something went wrong". Nothing is lost.

- **Before it happens:** Supabase emails the owner a warning about a week
  before pausing, and again once it has paused. Opening the project in the
  dashboard, or simply using the site, counts as activity.
- **To bring it back:** in the [Supabase dashboard](https://supabase.com/dashboard),
  open the organisation, select `quadrant-prod`, click **Resume project** and
  confirm. It returns as it was, data and settings included, after a few
  minutes.
- **How long you have:** Supabase's guide says a paused project can be
  resumed for up to **one year** after it was paused (checked 2026-11-16;
  an older notice said 90 days). Past that, the dashboard can no longer
  resume it, and the way back is a new project restored from a backup (see
  "Back up the database" below). Taking a backup every month or two keeps
  that option open.
- **To stop it happening:** the keep-alive job below; a paid plan never
  pauses.

Source: [Supabase, "Project Pausing"](https://supabase.com/docs/guides/platform/free-project-pausing).

### Keeping the database awake (keep-alive)

Three times a day (03:00, 11:00 and 19:00 UTC, give or take an hour)
Vercel's scheduler calls `/api/keep-alive`, which asks the production
database how many films it holds. Those few small queries a day are what
Supabase counts as activity, so a quiet week no longer pauses the site. The
schedule is in `vercel.json`; Vercel's free plan allows each job once a day,
which is why there are three jobs.

**One-time setup:** in Vercel, Project → Settings → Environment Variables,
add `CRON_SECRET` for **Production**: a random string of letters and numbers,
at least 16 characters (a password manager's generator is fine). Then
redeploy (or push any commit): a deployment only picks up the secret when it
is built. Without it every run is refused.

**Checking it works:** Vercel → the project → **Observability** (left
sidebar) → **Cron Jobs** lists the three jobs. (Vercel's docs say
**Schedules**; older dashboards had it under **Settings**. It was under
**Observability** for this project on 2026-11-16.) **Run** on one, then **View Logs**: a `200` means the
database answered. A `401` means the secret is missing or the deployment
predates it (redeploy); a `503` means the database did not answer, for
example because it is already paused (resume it in Supabase; the job cannot).
Opening the address in a browser gets `401`, which is correct.

Supabase says a few requests a day "typically" keep a project running, not
always, so its warning email a week before a pause is still the backstop.

Sources: [Vercel, "Managing Cron Jobs"](https://vercel.com/docs/cron-jobs/manage-cron-jobs),
[Vercel, "Usage & Pricing for Cron Jobs"](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Maintenance

Two jobs for the owner to run every month or two, from this folder.

### Refresh film details: `npm run refresh-titles:prod`

TMDB's terms forbid keeping their data for more than six months. Film pages
refresh their own copy after 30 days; this script fetches again every film
whose copy is over 150 days old, which covers films nobody has opened. It
changes nothing but the stored film details, and prints what it did. A film
TMDB has removed keeps its old copy (members' ratings point at it) and is
listed for you to decide about.

`npm run refresh-titles` does the same on `quadrant-dev`, using `.env.local`.
The `:prod` version reads **`.env.prod.local`**, a git-ignored file you
create once, holding the production values of:

```
NEXT_PUBLIC_SUPABASE_URL=https://<prod ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=<live address>
SUPABASE_SECRET_KEY=...   (the quadrant-prod secret key)
TMDB_API_READ_ACCESS_TOKEN=...
```

It is deliberately not called `.env.production.local`: Next.js reads that
name in every production build on this machine (the end-to-end tests make
one), which would point them at real data. The script refuses to run if the
file's address is not the production project.

### Example data for showing the app off: `npm run demo:add:prod`

Adds six made-up members (Priya, Marcus, Ellie, Tom, Jess and Dan) with
about 75 ratings of 26 real films, a few rewatches and some likes, so
friends have something to look at on every page. It uses the same
`.env.prod.local` as above. **`npm run demo:remove:prod` takes all of it
away again**: the members, their ratings, earlier viewings, likes and invite
rows. The films stay stored, as after any rating.

Until removed, their ratings count like anyone's: in group averages,
disagreements and the Friends' films chart. The demo members cannot sign
in (their addresses end in `@quadrant.invalid`, which no real account can
have), only like each other's reviews, and are found for removal by that
address alone, so removal never touches a real member. Add it twice and the
second run refuses; remove it first. The members and ratings are in
`src/lib/demo/data.ts`. `npm run demo:add` and `demo:remove` do the same on
`quadrant-dev` (remove it before `npm run test:e2e`, which shares some
films).

### Back up the database: `npm run backup:prod`

Supabase's free plan keeps no backups. This writes three files to
`backups/prod-<date and time>/`: `roles.sql`, `schema.sql` and `data.sql`
(every row, including members' sign-in accounts). **Start Docker Desktop
first**: the Supabase tool runs `pg_dump` inside it. No password is needed;
it uses the Supabase tool's own sign-in, like `db:push`. `npm run backup`
does the same for `quadrant-dev`.

`backups/` is git-ignored. The files hold every member's email and review, so
keep copies somewhere private (not a public share).

**Restoring** (into a new, empty project, following
[Supabase's backup and restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)):
install Postgres so that `psql` is available, then, with the new project's
connection string (Project Settings > Database):

```bash
psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command 'SET session_replication_role = replica' --file data.sql --dbname "<connection string>"
```

Then redo the dashboard settings listed under "Production settings that live
in dashboards", above: the dump does not include them. Read the guide first:
it may have changed since this was written (2026-11-16).

## Privacy

The site asks search engines not to index it (`/robots.txt` and a `noindex` tag
on every page) and uses no analytics. That is politeness, not security: the site
is private, and only invited members can sign in or see anything.

## Credits

Film data comes from [TMDB](https://www.themoviedb.org/). This product uses the
TMDB API but is not endorsed or certified by TMDB. The same notice and TMDB's
logo are shown on the site's `/about` page, linked from the footer of every
page, as TMDB's terms of use require.
