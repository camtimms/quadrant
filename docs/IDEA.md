# Product Brief — "Quadrant" (working title)

## The one-line pitch

A Letterboxd-style movie log where every film gets **two** scores instead of one:
how **good** it is, and how much you **enjoyed** it.

## Why

A single star rating flattens two different questions into one number. "Is this a
well-made film?" and "Did I have a great time?" often disagree — _Commando_ is not a
good film but it is a fantastic watch; _Schindler's List_ is a masterpiece you may
never want to rewatch. Separating the two makes ratings honest and makes
conversations between friends far more interesting ("you rated it 3 for quality but
9 for fun — explain yourself").

## The core mechanic

Each rating has two integer scores, each 0–10:

- **Quality** — how good is it as a film (craft, writing, performances)?
- **Enjoyment** — how much did _you_ enjoy watching it?

Plotting Quality (x) against Enjoyment (y) puts every film in one of four quadrants:

|                    | Low quality               | High quality                        |
| ------------------ | ------------------------- | ----------------------------------- |
| **High enjoyment** | 🍿 **Guilty Pleasures**   | 🏆 **Masterpieces**                 |
| **Low enjoyment**  | 🗑️ **Not Worth Watching** | 🎓 **Dense/Active/Serious Watches** |

Open question for the spec: where the boundary sits (e.g. ≥ 5 counts as "high"?)
and how to show films that sit exactly on a line.

## Who it's for

A small group of friends (roughly 2–15 people). Not a public social network.

## Must-haves for the proof of concept

1. Sign in (invite-only / friends-only — strangers can't join).
2. Search for a real movie (poster, title, year) from a public movie database.
3. Log a film with Quality + Enjoyment scores and an optional short review.
4. See **my** films on a quadrant chart and as a filterable list per quadrant.
5. See **friends'** ratings of a film, and spot where we disagree most.
6. Data stored in a small hosted database so friends share it from their own devices.

## Nice-to-haves (only if the must-haves are done and solid)

- "Biggest disagreements" feed: films where two friends' scores are furthest apart.
- Compare two users' quadrant charts side by side.
- Edit/delete a rating; rewatch log.

## Out of scope for the POC

Public profiles, follows/likes/comments, lists, mobile apps, recommendations,
payments, notifications.

## Constraints

- Free tiers only.
- The developer (me) is learning — code should be readable, typed, and explained,
  not clever.
- Secrets (API keys, DB credentials) must never be committed.
