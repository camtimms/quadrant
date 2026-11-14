# Quadrant

A private film log for a small group of friends. Every film gets two scores from
0 to 10 — **Quality** (how good it is) and **Enjoyment** (how much you enjoyed
it) — and the pair places it on a chart with four quadrants: Masterpieces,
Guilty Pleasures, Serious Watches and Not Worth Watching.

Live site: https://quadrant-db.vercel.app/ (invite-only once sign-in is built)

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

No environment variables are needed yet. When they are, copy `.env.example` to
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
(Project → Settings → Environment Variables), never in the repository. None are
needed yet; the task that introduces each one will say so.

## Privacy

The site asks search engines not to index it (`/robots.txt` and a `noindex` tag
on every page) and uses no analytics. That is politeness, not security — real
access control arrives with sign-in and database policies (tasks T8–T14).

## Credits

Film data will come from [TMDB](https://www.themoviedb.org/). The required
attribution notice is added in task T18.
