# 03 — Tasks

Status: **APPROVED** (amended version, 2026-11-14) — T4a added and T7, T24–T26 reworded for the thirteen-placement rule (requirements v4).
Implements: `02-design.md` (approved). Section numbers like "§3.5" refer to that document.

**How to read a task**

- [ ] **T<n>: title** — requirement IDs · files touched · verification · size

- **Size:** S ≈ under 30 minutes, M ≈ up to an hour. Each task is one commit.
- 🙋 means you have to do something by hand first (create an account, paste a
  key). What exactly is spelled out under the task.
- **After every task:** `npm run lint`, `npm run typecheck`, `npm test`, tick the
  box, summarise what changed.
- **V1–V9** are the unverified facts from design §15. The task that first
  depends on one checks it with a real call; if the answer contradicts the
  design, the design is updated before the code is written.
- The deployed site works after every milestone, not just at the end.

---

## Milestone A — Walking skeleton (a deployed "hello world")

- [x] **T1: Scaffold the project** — NFR16, NFR2 · `package.json`, `tsconfig.json`, `eslint.config.*`, `.prettierrc`, `vitest.config.ts`, `.gitignore`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `CLAUDE.md` (fill in the Commands section) · `git init`; `npm run dev` shows a placeholder page; `npm run lint`, `npm run typecheck` and `npm test` (one trivial passing test) all succeed · M
  - *Done 2026-11-14.* Next.js 16.4 scaffold copied in from a temporary folder (the generator refuses a non-empty directory). Surprises: it installs TypeScript 5, not 7 (design updated); `@types/node` had to move to 22 for Vitest; `typecheck` must run `next typegen` first; the Vitest config is `vitest.config.mts`; the scaffold turns on Cache Components, which later data-fetching tasks must account for.

- [x] **T2: Keep the site out of search engines** — NFR6, NFR7 · `src/app/robots.ts`, `src/app/layout.tsx` (noindex metadata) · unit test `robots disallows everything`; manual: view page source for the `noindex` tag · S
  - *Done 2026-11-14.* `/robots.txt` disallows every path and every page carries `noindex, nofollow`; both checked in the built site. NFR7 needed no code: the scaffold ships no analytics and none was added. No surprises.

- [x] 🙋 **T3: First deploy** — R48, NFR4, NFR11 · no code; `README.md` (how to run and deploy) · manual: the Vercel URL shows the placeholder page over HTTPS on a laptop and a phone · S
  - *Done 2026-11-14.* Live at https://quadrant-db.vercel.app/ from the existing `camtimms/quadrant` repository. Checked from a laptop: HTTPS with HTTP redirected, placeholder page, `noindex` tag and `/robots.txt` all served. **Still to confirm by the owner:** the page on a phone, and V9 (whether Vercel asked for a payment card).
  - _You:_ create a private GitHub repository and a Vercel account, then import the repository into Vercel. I'll give you the push commands. Check V9 (no payment card asked for).

## Milestone B — The quadrant maths (needs no accounts)

- [x] **T4: Levels, classification and labels** — R24, R25, R26, R50, R29, NFR17, NFR22 · `src/lib/quadrant/types.ts`, `classify.ts`, `labels.ts`, `classify.test.ts` · tests: `levelOf` at 4, 4.9, 5, 5.1, 6; `classify` for all 121 whole-number pairs (100 in a quadrant, 20 with an axis label, only 5/5 on the fence); each of the nine placements has a label · S
  - *Done 2026-11-14.* `classify` is a 3 × 3 lookup table, so the compiler rejects a missing combination. Also added `SCALE_END_LABELS` (slider and axis end words, reusing the placement labels) and a `PLACEMENTS` list in display order. No surprises.

- [x] **T4a: Rework classification to thirteen placements** — R24, R25, R52, R26, R50, R29, NFR17, NFR22, E24–E26 · `src/lib/quadrant/types.ts`, `classify.ts`, `labels.ts`, `classify.test.ts` · tests rewritten first: `levelOf` at 2, 2.4, 2.5, 2.6, 3, 4.9, 5, 5.1, 7, 7.4, 7.5, 7.6, 8; `classify` for all 121 whole-number pairs (36 corner, 64 inner band, 20 axis label, 1 on the fence); 6/9 and 9/6 are Worth Watching; 9/5 is Good; averages of 7.4 vs 7.5 and 2.5 vs 2.6; each of the thirteen placements has a label · S
  - *Done 2026-11-14.* `classify` is now a 5 × 5 lookup table over five levels, with the cut-offs as named constants (`EXTREME_HIGH` 7.5, `EXTREME_LOW` 2.5). Tests were rewritten first and 32 failed against the old code before the change. No surprises.

- [x] **T5: Group average** — R27, R45, NFR17, NFR21 · `src/lib/quadrant/average.ts`, `average.test.ts` · tests: empty → null; one rating → itself; means of 4.94 / 4.95 / 5.04 / 5.05 round and classify correctly; a score of 0 counts as 0, not as missing · S
  - *Done 2026-11-14.* `groupAverage` rounds each mean to one decimal by multiplying the whole-number sum by 10 before dividing, so half cases such as 5.05 round up reliably instead of depending on floating-point luck. Also exports `roundToOneDecimal` for displayed values. Added tests for the 7.5 cut-off on averages (7.45 vs 7.44).

- [x] **T6: Disagreement** — R41, R44, R45, NFR17 · `src/lib/quadrant/disagreement.ts`, `disagreement.test.ts` · tests: identical points → 0; opposite corners → ≈14.14; `filmDisagreement` for 0, 1, 2 and many ratings (null below two) · S
  - *Done 2026-11-14.* `disagreement` is the unrounded straight-line distance; `filmDisagreement` is the largest pairwise distance, or null below two ratings. Also exports `MAX_DISAGREEMENT` (about 14.1). Tests and code were written together this time, so the tests were not seen failing first.

- [x] **T7: Counting and clustering** — R31, R34, NFR17 · `src/lib/quadrant/counts.ts`, `cluster.ts`, tests, `index.ts` · tests: thirteen counts always sum to the total; points in the same cell form one cluster with the right count and mean position; cell sizes 1 and 0.5 · S
  - *Done 2026-11-14.* `countByPlacement` always returns all thirteen placements. `clusterPoints` bins positions into cells centred on multiples of the cell size and keeps input order; clustering only affects what is drawn, so each film keeps its own placement even when it shares a marker. `index.ts` re-exports the whole module. Milestone B complete.

## Milestone C — Sign-in and "friends only"

- [x] 🙋 **T8: Connect Supabase** — NFR2 · `src/lib/env.ts` (Zod-checked environment variables), `src/lib/supabase/client.ts`, `server.ts`, `.env.example`, `supabase/config.toml` · unit test `env rejects a missing variable`; manual: a throwaway server page reaches the dev project without error (then removed) · S
  - *Done 2026-11-14.* Env variables are checked on first use by `getPublicEnv()`, with an error that names each bad variable and never prints a value; it also catches the dashboard address being pasted instead of the project URL. Browser and server clients added; `supabase init` created `supabase/config.toml`. Reachability checked by querying the dev project through the client (it answered "table not found", as expected before T9) instead of a throwaway page. Owner confirmed 2026-11-14: the project is `quadrant-dev`, on the Free plan, and Supabase asked for no payment card (V9 settled for Supabase).
  - _You:_ create a Supabase account and two projects, `quadrant-dev` and `quadrant-prod`. Paste the dev project's URL and publishable key into `.env.local`. Check V9.

- [x] **T9: Invite list and profiles tables** — R5, R6, NFR1, NFR5 · `supabase/migrations/0001_members.sql` (`allowed_emails`, `profiles`, `private.is_member()`, RLS policies per §3.5), `src/lib/supabase/database.types.ts` (generated) · manual: migration applies cleanly to dev; this is also where V6 is checked (CLI push without Docker, else SQL editor) · M
  - *Done 2026-11-14.* Migration `20261114082834_members.sql` applied to `quadrant-dev`. V6 confirmed: `supabase db push` works without Docker, but this CLI version targets a local database by default, so the script is `npm run db:push` (adds `--remote`). File is named with the CLI timestamp, not `0001_`. Added explicit table grants as well as policies. Probed from outside while signed out: both tables refuse reads and writes, and `is_member` cannot be called through the API.

- [x] 🙋 **T10: Access-control test harness** — NFR1, R5, R6 · `tests/rls/helpers.ts`, `tests/rls/members.test.ts`, `vitest.rls.config.ts`, `.env.example` (test variables), `package.json` (`test:rls`) · tests: signed-out client reads no profiles; uninvited signed-in user reads no profiles; `allowed_emails` unreadable by everyone; a member can't create or edit another member's profile; deleting an invite row locks that user out on their next query · M
  - *Done 2026-11-14.* 23 tests in `tests/rls/members.test.ts`, run with `npm run test:rls` against `quadrant-dev`; all pass, and the run leaves no users or rows behind. A safety catch (`RLS_TEST_PROJECT_REF`) stops the tests running against any other project. V4 (does the sign-up hook run for admin-created users) cannot be checked until the hook exists, so it moves to T12.
  - _You:_ in the **dev** project only, enable email/password sign-in and paste the dev secret key into `.env.test.local`. Checks V4.

- [x] 🙋 **T11: Sign in with Google** — R1, R2, R3, R8, NFR3 · `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/proxy.ts`, `src/app/(app)/layout.tsx`, `src/app/(app)/actions/auth.ts` · unit test for the proxy's "is this path public?" helper; manual: sign in locally with your Google account, close and reopen the browser and still be signed in, sign out, and get redirected to `/login` when signed out · M
  - *Done 2026-11-14.* Owner signed in with Google and signed out locally. Signed-out visits, a forged cookie and a code-less callback all redirect to `/login`. Surprise: with Cache Components the Supabase client tripped "unstable value Date.now() while prerendering" once signed in; fixed by `await connection()` in the server client, so anything touching a session is always per-request. Added `NEXT_PUBLIC_SITE_URL`. **Not pushed:** the live site has no Supabase settings until T14 and would error on every page.
  - _You:_ create a Google Cloud project and OAuth client (§13 step 4), paste its ID and secret into the dev project's Google provider, set the dev project's redirect URLs, and add your own email to `allowed_emails`. Checks V7.

- [x] 🙋 **T12: Refuse the uninvited** — R4, R6, E17 · `supabase/migrations/0002_invite_hook.sql` (`hook_check_invite`), `src/app/login/page.tsx` (invite-only message), `src/app/(app)/layout.tsx` (membership check) · RLS test `hook rejects an uninvited email`; manual: an uninvited Google account sees the invite-only message and no data; removing your own email locks you out without a redeploy. Checks V3 · M
  - *Done 2026-11-14.* Migration `20261114092747_invite_hook.sql` applied to `quadrant-dev` and the hook switched on by the owner. 31 access-control tests pass. Owner signed in with an uninvited Google account and got the invite-only message. V3 settled: the refusal arrives at `/auth/callback` as `error=access_denied`, an empty `error_code`, and the hook message in `error_description`. V4 settled: the hook does not run for admin-created users. A member removed from the list while signed in is signed out on their next page load. The page-level membership check is for experience only (comment in `(app)/layout.tsx`). Not pushed (see T11).
  - _You:_ switch on the _Before User Created_ hook in the dev dashboard once the migration has run; have a second Google account handy to play the stranger.

- [x] **T13: Display name** — R7, E18 · `src/app/welcome/page.tsx`, `src/app/(app)/actions/profile.ts`, `src/lib/validation/profile.ts` + test, `src/app/(app)/layout.tsx` (redirect when no profile) · unit tests: name trimmed, 1–40 characters; manual: first sign-in lands on `/welcome` pre-filled with the Google name; name can be changed later · S
  - *Done 2026-11-14.* Owner confirmed in the browser: first sign-in lands on `/welcome` pre-filled from Google, saving works, and the name can be changed from the header. `/welcome` sits outside the `(app)` group so the "needs a profile" redirect cannot loop. Added `getCurrentMember()` (one cached lookup per request) and a client form component `src/components/profile/DisplayNameForm.tsx`, neither listed in the original file list. Length is counted in whole characters so the form and the database agree on emoji. Not pushed (see T11).

- [x] 🙋 **T14: Sign-in live on the deployed site** — R1–R8, R48 · no code; `README.md` (production setup notes) · manual on the Vercel URL: invited account gets in, uninvited account is refused, signed-out visit redirects · S
  - *Done 2026-11-14.* Migrations applied to `quadrant-prod` with `npm run db:push:prod` (the CLI stays linked to dev). Owner confirmed on the live site: the invited account signs in, the uninvited account gets the invite-only message. Signed-out visits redirect to `/login`. One false alarm: Google returned `redirect_uri_mismatch` once, minutes after the production redirect URI was added, then worked on retry; Google says such changes can take minutes to hours to apply. To recheck in T23: a route that does not exist yet returns 404 on Vercel instead of redirecting to sign-in. Milestone C complete.
  - _You:_ apply migrations 0001–0002 to `quadrant-prod`, enable Google and the hook there (email/password stays **off**), set its redirect URLs, add the production values to Vercel's environment variables, add your email to the prod invite list.

## Milestone D — Finding films

- [x] 🙋 **T15: TMDB client and parser** — R9, R10, NFR18 · `src/lib/tmdb/client.ts`, `schema.ts`, `poster.ts`, `fixtures/*.json`, `schema.test.ts` · tests run against **real captured responses**: normal film, film with no poster, film with no release date, empty result; poster URL builder. Checks V1 and V2 · M
  - *Done 2026-11-14.* Seven real responses saved as fixtures; the parser and poster tests run against them and a live search and details call went through the finished client. V1 settled: a missing poster is `null` but a missing release date is `""`. V2 settled: poster sizes are `w92`–`w780` and `original`; we use `w185` and `w342`. Not in the original file list: `src/lib/env.server.ts` (the token check, which also catches the short "API Key" pasted by mistake), `client.test.ts`, `poster.test.ts`, and a test that secret-handling modules import `server-only`. Owner confirmed 2026-11-14: the token is set in Vercel.
  - _You:_ create a TMDB account, request an API key for personal non-commercial use, and paste the **API Read Access Token** into `.env.local` and Vercel.

- [x] **T16: Search endpoint** — R9, R12, NFR9, NFR10 · `src/app/api/search/route.ts`, `route.test.ts` · tests (TMDB mocked): signed-out request refused; query under 2 characters refused; TMDB error, timeout and 429 all return `{ error: "unavailable" }`; adult results excluded · S
  - *Done 2026-11-14.* `GET /api/search?q=` checks membership, then the query, then calls TMDB. Answers are 200 with results, or 400 / 401 / 403 / 503 with a one-word error code. Checked on a local production build while signed out: 401 JSON, and pages still redirect to `/login`. Not in the original file list: `src/lib/search.ts` (query rule and response types, shared with T17), an `isApiPath` helper so the proxy answers signed-out API calls with 401 instead of a redirect, and an adult filter added to the T15 parser. The route was written alongside its tests; only the adult-filter test was seen failing first. **Not checked:** a signed-in search in a browser (needs your Google sign-in); T17's manual check covers it.

- [x] **T17: Search page** — R9, R10, R11, R12, R13, NFR10, NFR15 · `src/app/(app)/search/page.tsx`, `src/components/film/SearchBox.tsx`, `FilmCard.tsx`, `PosterImage.tsx` · component tests: no request per keystroke (300 ms pause or submit); placeholder shown when there is no poster; "year unknown"; no-results and unavailable messages; manual: search for a real film and see the poster · M
  - *Done 2026-11-14.* Built and tested (22 component tests, in a pretend browser); the production build passes and a signed-out visit to `/search` redirects to sign-in. Not in the original file list: a "Search" link in the header (`(app)/layout.tsx`), the query kept in the address so Back returns to the results, and the component-testing packages. Owner confirmed 2026-11-14: a signed-in search shows films with posters.

- [x] **T18: TMDB attribution** — NFR18 · `src/app/about/page.tsx`, `src/components/Footer.tsx`, `public/tmdb-logo.svg` · manual: footer link on every page; `/about` shows the approved logo and the required notice · S
  - *Done 2026-11-14.* The footer sits in the root layout, so it is on every page, signed in or not. `/about` shows the site name, TMDB's "Primary short (blue)" logo (downloaded unchanged from their Logos & Attribution page, 2 KB, checked to contain no scripts) and the required notice. Checked on the running dev server while signed out: `/about` and `/login` both carry the footer link, and the logo is served. Not in the original file list: `src/lib/tmdb/attribution.ts` and six small tests guarding the wording, the logo file and the footer link. **Not checked by eye:** how the page looks; worth a glance. Milestone D complete.

## Milestone E — Rating a film

- [x] **T19: Films and ratings tables** — R14–R17, R19–R22, NFR1, NFR19, NFR20 · `supabase/migrations/0003_titles_ratings.sql` (tables, checks, partial unique index, `updated_at` trigger, `save_rating`, policies), `src/lib/supabase/database.types.ts` · manual: applies cleanly to dev · M
  - *Done 2026-11-14.* Migration `20261114110029_titles_ratings.sql` applied to `quadrant-dev` (with the owner's go-ahead, which the CLI now asks for) and the types regenerated. Probed signed out: both tables and `save_rating` are refused. A throwaway check as a real member passed: saving twice leaves one row with the new scores, a blank review is stored as null, a score of 11 is refused, and a member cannot write `titles`. Beyond the design: insert and update permissions on `ratings` are per column, so `created_at` and `is_current` cannot be set through the API (design 3.4 updated). Not applied to prod; that happens when T20's tests are green.

- [x] **T20: Access-control tests for ratings** — NFR1, R5, R16, R17, R19, R21, R22 · `tests/rls/ratings.test.ts` · tests: signed-out and uninvited users read nothing; member can't insert, edit or delete as another member; members can't write `titles`; a second current rating is refused; scores of −1 and 11 refused; 501-character review refused; `save_rating` twice leaves one row. When green, the migration is applied to prod · M
  - *Done 2026-11-14.* 37 tests in `tests/rls/ratings.test.ts`; all 70 access-control tests pass on `quadrant-dev` and leave no rows behind. Beyond the list: two saves at the same instant leave one row; a fractional or missing score is refused; a member cannot set `created_at`, `updated_at` or `is_current`, or hand a rating to someone else; a removed member is locked out at once while their rating stays visible. The tests passed first time, because the rules were written in T19, so none was seen failing. `helpers.ts` gained throwaway films and clean-up for ratings. Surprise: the generated types do not allow null for a function argument, so "no review" is sent as an empty string. Migration applied to `quadrant-prod` with the owner's go-ahead; the CLI reports it up to date. **Not checked:** the rules on prod itself, which run the same SQL but have no test users.

- [x] **T21: Storing a film when it's first rated** — R14, NFR2, E9, E10 · `src/lib/supabase/admin.ts` (server-only), `src/lib/titles/ensureTitle.ts`, `ensureTitle.test.ts` · tests (TMDB and database mocked): new film is fetched from TMDB and stored; existing film isn't re-fetched; a copy older than 30 days is refreshed; a failed refresh keeps the old copy · M
  - *Done 2026-11-14.* `ensureTitle(tmdbId)` returns our copy of a film, fetching and storing it on first use and refreshing it after 30 days. 20 unit tests with TMDB and the database replaced by stand-ins; tests were written first. Not in the original file list: `src/lib/titles/store.ts` (the two real queries, the only importer of the secret-key client), `tests/rls/titles-store.test.ts` (4 tests of those queries against `quadrant-dev`, including two saves at once), a `getSupabaseSecretKey()` check in `env.server.ts`, and guard tests that nothing else imports the admin client or reads the key. A live run with real TMDB against dev stored and re-read "Commando", then the row was removed. Owner confirmed 2026-11-14 that the dev key is in `.env.local` and the prod key in Vercel; the Vercel value itself cannot be checked from here and is first exercised on the live site in T23.
  - _You:_ paste the dev and prod **secret keys** into `.env.local` and Vercel.

- [x] **T22: Save and delete actions** — R15, R16, R17, R20, R21, R23, E14, E19 · `src/lib/validation/rating.ts` + test, `src/app/(app)/actions/rating.ts` + test · tests: 0 and 10 accepted; missing, fractional and out-of-range scores rejected with a named field; 500 characters accepted, 501 rejected; expired session returns an error result instead of throwing; the returned placement matches `classify` · M
  - *Done 2026-11-14.* `parseRatingInput` (49 tests) and the `saveRating` / `deleteRating` actions (33 tests, with the session, film store and database replaced by stand-ins). The placement test runs all 121 score pairs against `classify`. Changed from the design's sketch: the actions take form data and return a `status` object so they work with `useActionState` (design 6 and 9 updated). Also: `characterCount` moved to `src/lib/validation/text.ts` to be shared with the display name. One test failed first for a good reason: I had expected 3/9 to be Guilty Pleasures, and the code correctly said Cheap Thrills. **Not checked:** the actions running for real in a browser; there is no form to call them until T23.

- [x] **T23: Film page with rating form** — R13, R15–R21, R23, R49, NFR12, NFR15, E12, E19, E22 · `src/app/(app)/film/[tmdbId]/page.tsx`, `src/components/rating/RatingForm.tsx`, `ScoreSlider.tsx`, `PlacementPreview.tsx`, `DeleteRatingButton.tsx` · component tests: both sliders start at 5 for an unrated film; a slider moves with arrow keys and can reach 0 and 10; end labels come from `labels.ts`; the placement preview follows the sliders (5/5 → On the fence, 8/5 → Good); saving untouched sliders sends 5/5; existing rating pre-fills the form; error keeps the typed review; delete asks for confirmation. Manual: rate, edit and delete a real film; "can't load this film" state when TMDB is unreachable · M
  - *Done 2026-11-14.* Built and tested: 26 component tests and 10 tests of the page's data loading; the production build passes and a signed-out visit to `/film/10999` redirects to sign-in (the recheck noted in T14, on the local server). Not in the original file list: `src/lib/data/filmPage.ts` + test (what the page loads; viewing a film stores nothing), and `isStale` exported from `ensureTitle.ts`. Not automated: moving a slider with the arrow keys, because the test browser does not act out key presses on a native slider. Owner confirmed 2026-11-14: rating, editing and deleting a real film works. The "can't load this film" state is covered by tests only; it needs TMDB to be unreachable to see for real. Milestone E complete.

## Milestone F — My films

- [x] **T24: Quadrant chart component** — R28, R30, R31, R32, NFR12, NFR14 · `src/components/chart/QuadrantChart.tsx`, `scale.ts` + test, `PointPanel.tsx`, `QuadrantChart.test.tsx` · tests: score-to-pixel scale; lines at 5; the four outer corners are shaded from 7.5 up and 2.5 down; corner, inner-band and half-line axis names all come from `PLACEMENT_LABELS`; inner-band names are hidden at phone width; clustered points show a count; each point is focusable with a text label; selecting opens the panel listing every film in the cluster · M
  - *Done 2026-11-14.* `ChartFrame` (the SVG), `QuadrantChart` (points and selection) and `PointPanel`, with 48 tests. Looked at for real on a temporary preview page (since removed), at desktop and phone width: selecting a cluster lists its films, and the inner-band names disappear on a phone. **Changed from the design after seeing it:** corner names moved from inside the shaded squares to the margin beside them, because points at 8 to 10 covered them; inner-band names moved onto the half-score lines (design 8 updated). The test for "inner-band names hidden at phone width" checks the CSS classes, since the test browser has no screen width. Not yet on any real page; that is T26.

- [x] **T25: Film list and filters** — R33, R34, R36, NFR13 · `src/components/film/FilmList.tsx`, `FilterChips.tsx`, `src/lib/filters.ts` + test · tests: filter parsed from the URL, unknown values ignored; thirteen chips with counts in three rows (corners, inner bands, on a line), empty ones greyed out; newest first · S
  - *Done 2026-11-14.* `src/lib/filters.ts` (39 tests): `parseFilter`, `filterFilms`, `newestFirst`, `filterHref` and the three chip rows. `FilterChips` and `FilmList` (17 component tests) are server-rendered with no client JavaScript. Added an "All" chip showing the total. Looked at on a temporary preview page at phone width (since removed). The list does not sort itself: the page calls `newestFirst` before passing films in. Left for T26: which timestamp "most recently rated" means (first rated, or last changed). On a phone the three rows wrap onto more lines and run together visually; left as it is.

- [ ] **T26: My films page** — R30–R36 · `src/app/(app)/page.tsx`, `src/lib/data/ratings.ts`, `src/components/EmptyState.tsx` · manual: rated films appear on the chart in the right region and in the list; a 9/9 is a Masterpiece and a 6/9 is Worth Watching; a film scored 8/5 sits on the line and under "Good"; a 5/5 sits at the centre under "On the fence"; empty state for a new member · M
  - *In progress 2026-11-14.* `/` is now My films: chart, filter chips and list, or an explanation of the two scores with a link to search when nothing is rated. `loadMemberFilms` has 8 unit tests, and its query is checked against `quadrant-dev` (3 tests): the film arrives nested inside each rating, as the code assumes. R36 clarified by the owner: ordered by when a film was first rated. The chart shows every film and the filter narrows only the list. **Waiting for the owner's manual check:** rated films appear on the chart in the right region and in the list; 9/9 is a Masterpiece and 6/9 is Worth Watching; 8/5 sits on the line under "Good"; 5/5 sits at the centre under "On the fence"; the empty state for a member with no ratings.

- [ ] **T26a: Update scores in place** — R51, R20, E23 · `src/components/film/FilmList.tsx`, `src/components/chart/PointPanel.tsx`, `src/components/rating/InlineRatingEditor.tsx` + test, `src/app/(app)/page.tsx` · component tests: "Update scores" opens sliders pre-filled with the current scores; nothing is saved until Save is pressed; cancel restores the old values; the control is absent when viewing another member's films. Manual: on a phone, change a 5/5 film from the "On the fence" filter in three steps (open, drag, save) and watch it move on the chart · M

## Milestone G — Friends

- [ ] **T27: Everyone's ratings on the film page** — R37, R42, R45, E11, E12 · `src/components/film/RatingsTable.tsx` + test, `GroupAverage.tsx` + test, `src/app/(app)/film/[tmdbId]/page.tsx` · tests: average, count and placement shown; single rating shows "—" for disagreement; visible when the viewer hasn't rated · S

- [ ] **T28: Spoke map** — R38, R39, R40, R41, NFR13, NFR14, E13 · `src/components/chart/SpokeMap.tsx`, `SpokeMap.test.tsx`, `src/components/film/DisagreementTable.tsx` + test · tests: one spoke per friend from the viewer's point; no spokes when the viewer hasn't rated; group average drawn as a different shape; table states each disagreement and marks the largest; identical rating reads "you agree exactly" · M

- [ ] **T29: Friends' films page** — R43, R44, R45, R47 · `src/app/(app)/friends/page.tsx`, `src/lib/data/allRatings.ts`, `src/lib/data/groupFilms.ts` + test · tests: rows grouped per film into average, count and disagreement; sort by disagreement puts single-rating films last; sort by recent. Checks V5 (row cap; fetch in pages if needed). Manual with two accounts · M

- [ ] **T30: Member pages** — R46 · `src/app/(app)/members/[id]/page.tsx`, links from member names · manual: another member's chart and list show, with no edit controls; unknown id gives "not found" · S

## Milestone H — Solid enough to share

- [ ] **T31: Navigation, error pages and phone layout** — R48, NFR8, E15, E20 · `src/components/Nav.tsx`, `src/app/(app)/error.tsx`, `src/app/not-found.tsx`, layout tweaks · manual: every page usable at phone width; long review words wrap; error page shows on a forced failure · M

- [ ] **T32: Accessibility pass** — NFR12, NFR13, NFR14, NFR15 · small fixes across `src/components/**` · manual checklist: complete search → rate → view chart with the keyboard only; contrast check; every poster has alt text; every field has a label · S

- [ ] **T33: End-to-end tests** — R1, R15, R20, R21, R30, R41 · `playwright.config.ts`, `tests/e2e/auth.setup.ts`, `tests/e2e/*.spec.ts`, `package.json` (`test:e2e`) · tests: signed-out visit redirects to `/login`; search → rate → appears on My films in the right quadrant; edit then delete; a film two members rated shows the disagreement table · M

- [ ] **T34: Maintenance scripts** — NFR11, NFR18, E10 · `scripts/refresh-titles.ts`, `scripts/backup.ts`, `package.json`, `README.md` · manual: refresh updates `fetched_at` on a dev row; backup writes a dump file to a git-ignored folder · S

- [ ] 🙋 **T35: Release to friends** — all must-haves · `README.md` (inviting and removing people, restoring a paused project) · manual release checklist on the production URL: real sign-in, rate a film on a phone, second account sees it, attribution visible, no secrets in the repository (`git grep` for key prefixes) · S
  - _You:_ add your friends' Google emails to the prod invite list and send them the link.

## Nice-to-haves — not committed; each needs your go-ahead after T35

- [ ] **T36: Biggest-disagreements feed** — N1 · new page + pure function with tests · M
- [ ] **T37: Compare two members side by side** — N2 · new page reusing `QuadrantChart` · M
- [ ] **T38: Rewatch log** — N3, NFR19 · migration (`log_rewatch` function), form action, times-watched display; requirements R19/R20 need a spec update first · M
- [ ] **T39: Score distribution curves** — N4, NFR21 · pure mean / standard-deviation functions with tests, SVG curve on the film page · M
- [ ] **T40: Keep-alive for the free database** — NFR11 · scheduled request so the project isn't paused after a quiet week; needs a check of what the free tiers allow · S

---

## Requirement coverage

Every requirement appears in at least one task.

| Requirements     | Tasks                     |
| ---------------- | ------------------------- |
| R1–R3, R8        | T11, T14, T33             |
| R4               | T12, T14                  |
| R5, R6           | T9, T10, T12, T20         |
| R7               | T13                       |
| R9–R13           | T15, T16, T17, T23        |
| R14              | T19, T21                  |
| R15–R23, R49     | T19, T20, T22, T23        |
| R24–R29, R50, R52 | T4, T4a, T5, T24 |
| R30–R36          | T7, T24, T25, T26         |
| R51              | T26a                      |
| R37, R42, R45    | T5, T6, T27               |
| R38–R41          | T6, T28                   |
| R43, R44         | T6, T29                   |
| R46              | T30                       |
| R47              | T29                       |
| R48              | T3, T14, T31              |
| NFR1             | T9, T10, T20              |
| NFR2, NFR3, NFR4 | T1, T3, T8, T11, T21, T35 |
| NFR5, NFR6, NFR7 | T2, T9                    |
| NFR8–NFR10       | T16, T17, T31             |
| NFR11            | T3, T34                   |
| NFR12–NFR15      | T17, T23, T24, T28, T32   |
| NFR16, NFR17     | T1, T4–T7                 |
| NFR18            | T15, T18, T34             |
| NFR19–NFR21      | T5, T19                   |
| NFR22 | T4, T4a, T24 |

## When you'll be needed

| Task | What you do                                                  |
| ---- | ------------------------------------------------------------ |
| T3   | GitHub repository + Vercel account                           |
| T8   | Supabase account, two projects, dev keys                     |
| T10  | Enable email/password in dev; dev secret key for tests       |
| T11  | Google Cloud OAuth client; your email on the dev invite list |
| T12  | Switch on the sign-up hook in dev; a second Google account   |
| T14  | Production Supabase + Vercel settings                        |
| T15  | TMDB account and token                                       |
| T21  | Secret keys into `.env.local` and Vercel                     |
| T35  | Invite your friends                                          |

T1, T2 and T4–T7 need nothing from you, so they can be done before any account exists.
