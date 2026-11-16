# CLAUDE.md

This project is built with **spec-driven development**. Read `docs/IDEA.md` for the
product brief before doing anything else.

## The workflow (follow it strictly)

Work moves through four phases. Each phase produces a file in `docs/specs/` and
**stops for my approval** before the next phase starts.

1. **Requirements** → `docs/specs/01-requirements.md`
   User stories with acceptance criteria in EARS style
   ("WHEN <trigger> THE SYSTEM SHALL <behaviour>"). Number them (R1, R2, …).
   List open questions and the assumptions you'd make if I don't answer.
2. **Design** → `docs/specs/02-design.md`
   Architecture, tech choices _with the alternatives you rejected and why_, data
   model (tables, columns, keys, row-level-security policies), API/route list,
   external API usage, auth flow, error handling, and a testing strategy.
   Every design element must reference the requirement IDs it satisfies.
3. **Tasks** → `docs/specs/03-tasks.md`
   An ordered checklist of small tasks (each ≈ one commit, ≤ ~1 hour of work).
   Each task lists: the requirement IDs it covers, files it touches, and how
   it will be verified (test, manual check, or both).
4. **Implementation** — one task at a time. After each task: run lint, typecheck
   and tests, tick the box in `03-tasks.md`, and summarise what changed.

If implementation reveals the spec is wrong, **stop and update the spec first**,
then continue. The spec is the source of truth, not the code.

## Rules

- Never commit secrets. Use `.env.local` and keep an up-to-date `.env.example`.
- Never invent API response shapes — check the real docs or make a real call.
- Prefer boring, well-documented tools over clever ones.
- Explain non-obvious decisions in short code comments; I'm learning from this code.
- Write a test for every piece of business logic (the quadrant maths especially).
- If you're unsure about a product decision, ask me rather than guessing — but
  for purely technical decisions, decide and record the reasoning in the design doc.
- Keep a running `docs/specs/DECISIONS.md` log: date, decision, why.

## Commands

Stack: Next.js 16 (App Router) + TypeScript, Tailwind, Vitest. Node 22 or newer.

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server at http://localhost:3000 |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `npm test` | Unit tests once (Vitest) |
| `npm run test:watch` | Unit tests, re-running on save |
| `npm run test:rls` | Access-control tests against the dev Supabase project (needs `.env.test.local`) |
| `npm run test:e2e` | End-to-end tests (Playwright): builds the app, runs it on port 3111 against the dev project, drives a phone-sized browser (needs `.env.test.local`) |
| `npm run format` | Format code and config with Prettier |
| `npm run format:check` | Check formatting without changing files |
| `npm run build` | Production build |
| `npm run db:push` | Apply new files in `supabase/migrations/` to the linked project (`quadrant-dev`) |
| `npm run db:push:prod` | Apply new migrations to `quadrant-prod`. Only after `test:rls` passes on dev |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` from the linked project |

Run lint, typecheck and test after every task, plus `test:rls` after any task
that changes a migration or a policy. Run `test:e2e` before a release and
after any task that changes signing in, rating or the film page (about a minute).

Next.js 16 differs from older versions in ways that matter (for example
`proxy.ts` instead of `middleware.ts`). Its own docs are bundled in
`node_modules/next/dist/docs/` — check them before writing framework code.
