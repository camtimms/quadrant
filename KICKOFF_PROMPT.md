# Kickoff prompt — paste this as your first message in Claude Code

---

I want to build a small web app for me and my friends: a Letterboxd-style movie log
where each film gets two 0–10 scores — **Quality** (how good it is) and
**Enjoyment** (how much I enjoyed it). Those two scores place every film in one of
four quadrants: Masterpieces, Guilty Pleasures, Not Worth Watching, and Dense/Active/Serious
Watches. The full brief is in `docs/IDEA.md`, and the working rules are in
`CLAUDE.md`.

This is a proof of concept, but I want it to be **real**, not a demo with dummy data:

- Real movie data from a public movie database API (posters, titles, years).
- A small hosted database so my friends and I share one dataset from our own devices.
- Invite-only access, enforced on the server/database side, not just hidden in the UI.
- Deployed to a free host so I can send friends a link.

I'm a software engineering student, so I want to learn from this as much as ship it.
Make the decisions a senior engineer would make, but write down _why_ in the spec so
I can follow the reasoning. Prefer well-documented mainstream tools over clever ones.

We're doing spec-driven development. Please start with Phase 1 only: run the
`/spec-requirements` workflow, then stop and ask me your open questions. Don't
write any code until I've approved the requirements, design, and task list.

---

## Then, phase by phase

1. `/spec-requirements` → answer its questions → "approved"
2. `/spec-design` → review, push back on anything you don't understand → "approved"
3. `/spec-tasks` → review → "approved"
4. `/next-task` repeatedly (say "continue" between tasks, or let it run a few in a row once you trust it)

## Tips

- Use **plan mode** (Shift+Tab) during the spec phases so it can't edit code early.
- Make a git commit after each approved spec phase so you can diff later changes.
- To compare models, run the same kit in two folders: one with Fable, one with
  Sonnet. Then diff their `02-design.md` files — that's where the difference shows.
