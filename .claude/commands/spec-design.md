---
description: Phase 2 — technical design from the approved requirements
---

Read `docs/IDEA.md`, `CLAUDE.md` and `docs/specs/01-requirements.md` (treat it as approved).

Research current documentation where needed (movie database API terms and attribution rules, hosted database free-tier limits, auth options). Don't rely on memory for anything that might have changed.

Write `docs/specs/02-design.md` covering:

- Architecture overview with a Mermaid diagram.
- Tech stack, and for each major choice: the 1–2 alternatives you considered and why you rejected them.
- Data model: tables, columns, types, constraints, indexes, and row-level-security / access policies. Explain how "friends-only" is enforced at the database layer, not just the UI.
- How movie data is fetched and cached (rate limits, what we store locally vs fetch live, attribution).
- Auth flow and how invites work.
- Route/page list and server endpoints.
- Quadrant logic as a precise definition (pure function signature + boundary rules).
- Error handling and empty states.
- Testing strategy (unit / integration / e2e — what goes where).
- Deployment plan and the exact env vars needed.
- A requirements-traceability table: every R-ID → the design section(s) that satisfy it.

Log significant decisions in `docs/specs/DECISIONS.md`. No implementation code yet. Stop when done and list anything I need to set up by hand (accounts, API keys).

Extra notes from me: $ARGUMENTS
