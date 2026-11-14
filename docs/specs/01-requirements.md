# 01 — Requirements

Status: **v4 — amended after approval, awaiting re-approval** (2026-11-14)

v4 changes (owner’s request during implementation, after T4): the famous four
labels now need *both* scores to be extreme (8 or more / 2 or less), and the
bottom-left corner is new: Dumpster Fires. The rest of each quarter gets an
inner-band label: Worth Watching, Cheap Thrills, Respectable, Not Worth
Watching. Thirteen placements in total. Affects the glossary, R24, R25, R28,
R34, new R52, E24–E26, NFR22.

v3 changes (owner's request during Phase 3): a point with exactly one neutral
value is no longer "On the fence" — it takes a single-axis label (Good, Bad,
Enjoyable, Not Enjoyable). Only a true 5/5 is on the fence. Scores are chosen
with sliders that start at 5. Affects the glossary, R15, R23, R26, R34, new R49
and R50, E1–E3, NFR22. The owner also confirmed that a score left at 5 is a real
5 (no "unscored" state) and asked for updating to be very easy: new R51, E22, E23.
Source: `docs/IDEA.md`, `KICKOFF_PROMPT.md`, owner's answers to Q1–Q9

This document says _what_ the proof of concept must do, not _how_. Tech choices
belong in `02-design.md`.

v2 changes: 5 is now a neutral midpoint (was "5 is Low"); every film has a group
average that is plotted and classified; the film page is a spoke-and-points map;
sign-in is with Google; edit/delete are confirmed must-haves; the data must be
ready for a rewatch log and for TV later. Requirement IDs were renumbered.

Tags like `[Q10]` point to the question (sections 6–7) that settled that requirement.

---

## 1. Glossary

| Term                     | Meaning                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Member**               | A person who has been invited and has signed in. The only kind of user.                                                                                                                                                                                                                                                                                            |
| **Owner**                | The one member (you) who controls who is invited.                                                                                                                                                                                                                                                                                                                  |
| **Friend group**         | All members. The POC has exactly one group sharing one dataset.                                                                                                                                                                                                                                                                                                    |
| **Film**                 | A movie from the external movie database, identified by that database's ID (not by title).                                                                                                                                                                                                                                                                         |
| **Quality score**        | Integer 0–10. How good the film is as a film (craft, writing, performances).                                                                                                                                                                                                                                                                                       |
| **Enjoyment score**      | Integer 0–10. How much the member enjoyed watching it.                                                                                                                                                                                                                                                                                                             |
| **Rating**               | One member's current Quality score + Enjoyment score for one film, plus an optional review. A member has at most one current rating per film.                                                                                                                                                                                                                      |
| **Review**               | Optional plain-text comment of up to 500 characters attached to a rating.                                                                                                                                                                                                                                                                                          |
| **Midpoint**             | The value 5 on either scale: "a perfectly fine film that doesn't stand out".                                                                                                                                                                                                                                                                                       |
| **High / Low / Neutral** | A value is **High** if it is above 5, **Low** if it is below 5, and **Neutral** if it is exactly 5. |
| **Extreme** | A value of 8 or more (extremely high) or 2 or less (extremely low). For group averages, 8.0 and 2.0 count as extreme; 7.9 and 2.1 do not. |
| **Outer corner** | Where both values are Extreme. Four labels: **Masterpieces** (quality 8+, enjoyment 8+), **Guilty Pleasures** (quality 2−, enjoyment 8+), **Serious Watches** (quality 8+, enjoyment 2−), **Dumpster Fires** (quality 2−, enjoyment 2−). These are the rare, stand-out films. |
| **Inner band** | Neither value is 5 and the point is not in an outer corner. Four labels, by which side of 5 each value is on: **Worth Watching** (both above), **Cheap Thrills** (quality below, enjoyment above), **Respectable** (quality above, enjoyment below), **Not Worth Watching** (both below). A 6/9 is Worth Watching, not a Masterpiece, because both scores must be extreme to reach a corner. |
| **Quadrant** | One quarter of the chart (for example the top-right quarter). Each quarter contains one outer corner and one inner band. |
| **Axis label**           | The label for a point where exactly one value is Neutral, taken from the other value alone: **Good** (quality High) or **Bad** (quality Low) when enjoyment is 5; **Enjoyable** (enjoyment High) or **Not Enjoyable** (enjoyment Low) when quality is 5. The point sits on a dividing line. This is what a member gets when they only move one of the two sliders. |
| **On the fence**         | The label for a point where _both_ values are Neutral — a true 5/5, at the centre of the chart. Expected to be rare `[Q10]`.                                                                                                                                                                                                                                       |
| **Placement** | Whichever of the thirteen labels a point gets: four outer corners, four inner bands, four axis labels, or On the fence. |
| **Group average**        | For one film: the mean of all members' Quality scores and the mean of all members' Enjoyment scores, each rounded to one decimal place. It is a point on the chart like any rating, and is classified by the same rule.                                                                                                                                            |
| **Quadrant chart** | A scatter plot with Quality on the x-axis and Enjoyment on the y-axis, both 0–10, with dividing lines at 5 and the four outer corners marked. |
| **Spoke map**            | A quadrant chart for one film showing every member's rating as a point, with a line (spoke) from the viewing member's point to each friend's point.                                                                                                                                                                                                                |
| **Disagreement**         | For two ratings of the same film: the straight-line distance between the two points, `sqrt(ΔQ² + ΔE²)` — i.e. the length of the spoke. For a film: the largest disagreement between any two members who rated it.                                                                                                                                                  |

---

## 2. User stories and acceptance criteria

### A. Access (brief must-have 1)

**Story:** As the owner, I want only people I've invited to be able to get in.

- **R1** — WHEN a visitor who is not signed in requests any page other than the sign-in page, THE SYSTEM SHALL show the sign-in page instead and reveal no ratings, reviews or member names.
- **R2** — WHEN a visitor chooses to sign in, THE SYSTEM SHALL let them do so with their Google account, and SHALL NOT offer password-based accounts.
- **R3** — WHEN a person whose Google email address is on the invite list completes sign-in, THE SYSTEM SHALL give them access as a member and keep them signed in on that device across browser restarts until they sign out.
- **R4** — WHEN a person whose Google email address is not on the invite list completes Google sign-in, THE SYSTEM SHALL refuse access and show a message saying the app is invite-only and that they must use the address they were invited with.
- **R5** — WHEN any request to read or write ratings arrives without a valid member session, THE SYSTEM SHALL reject it at the server/database layer, regardless of what the interface shows or hides.
- **R6** — WHEN the owner adds or removes an email address on the invite list (edited in the database provider's dashboard; no in-app admin screen), THE SYSTEM SHALL apply that change to that person's next sign-in without a redeploy.
- **R7** — WHEN a member signs in for the first time, THE SYSTEM SHALL propose their Google name as their display name, let them change it, and use it wherever their ratings are shown.
- **R8** — WHEN a member chooses "sign out", THE SYSTEM SHALL end their session on that device and return them to the sign-in page.

### B. Finding a film (brief must-have 2)

**Story:** As a member, I want to search for a real film and recognise it by its poster.

- **R9** — WHEN a member submits a search of at least 2 characters, THE SYSTEM SHALL show matching films from the external movie database, each with poster, title and release year. TV series SHALL NOT appear.
- **R10** — WHEN a search result has no poster or no release year, THE SYSTEM SHALL still show it, with a placeholder image or "year unknown".
- **R11** — WHEN a search returns no results, THE SYSTEM SHALL say so and suggest checking the spelling.
- **R12** — WHEN the external movie database is unreachable or returns an error, THE SYSTEM SHALL show a clear "search is unavailable, try again" message, and the rest of the app SHALL keep working.
- **R13** — WHEN a member selects a search result, THE SYSTEM SHALL open that film's page (section F).
- **R14** — WHEN a film has been rated by anyone, THE SYSTEM SHALL keep its own copy of that film's title, year and poster reference, so that charts and lists display without depending on the external database being up.

### C. Logging a rating (brief must-have 3)

**Story:** As a member, I want to give a film two scores and maybe a few words.

- **R15** — WHEN a member submits a rating with a Quality score and an Enjoyment score that are both integers from 0 to 10, THE SYSTEM SHALL save it against that member and that film.
- **R49** — WHEN a member opens the rating form for a film they have not rated, THE SYSTEM SHALL show a slider for each score, running from 0 to 10 in whole steps, both starting at 5, each showing its current number and labelled at its ends (Bad → Good for Quality, Not Enjoyable → Enjoyable for Enjoyment). A slider left at 5 is saved as a real score of 5.
- **R16** — WHEN a submitted rating is missing either score, or either score is not an integer from 0 to 10, THE SYSTEM SHALL reject it with a message naming the problem at the server/database layer. (The sliders make this impossible through the form; the check guards against requests that bypass it.)
- **R17** — WHEN a member includes a review, THE SYSTEM SHALL accept up to 500 characters of plain text and reject anything longer with a message stating the limit.
- **R18** — WHEN review text is displayed, THE SYSTEM SHALL display it as plain text only (any HTML or script in it is shown as literal characters, never executed).
- **R19** — WHEN a member opens the page of a film they have already rated, THE SYSTEM SHALL show their existing rating rather than a blank form, and SHALL never hold two current ratings by the same member for the same film.
- **R20** — WHEN a member edits their own rating, THE SYSTEM SHALL replace the scores and review, record when it was last changed, and recalculate that film's group average.
- **R51** — WHEN a member views one of their own rated films in the "My films" list or in the panel opened from a chart point, THE SYSTEM SHALL let them open that film's sliders in place, already set to their current scores, and save new scores without leaving the page. Updating a rating must never take more steps than: open, drag, save.
- **R21** — WHEN a member deletes their own rating and confirms, THE SYSTEM SHALL remove it from all charts, lists, averages and comparisons.
- **R22** — WHEN a member attempts to create, edit or delete a rating belonging to another member, THE SYSTEM SHALL reject the attempt at the server/database layer.
- **R23** — WHEN a rating is saved, THE SYSTEM SHALL show the member the placement it landed in.

### D. Quadrant maths (the core mechanic)

**Story:** As a member, I want every point placed by one rule I can understand.

- **R24** — WHEN a point (a member’s rating or a group average) is classified, THE SYSTEM SHALL label each of its two values High (above 5), Low (below 5) or Neutral (exactly 5), and additionally Extreme when the value is 8 or more, or 2 or less.
- **R25** — WHEN both values are Extreme, THE SYSTEM SHALL assign exactly one outer corner: Quality 8+ and Enjoyment 8+ → Masterpieces; Quality 2− and Enjoyment 8+ → Guilty Pleasures; Quality 8+ and Enjoyment 2− → Serious Watches; Quality 2− and Enjoyment 2− → Dumpster Fires.
- **R52** — WHEN neither value is Neutral and the point is not in an outer corner, THE SYSTEM SHALL assign exactly one inner band from the side of 5 each value falls on: both above 5 → Worth Watching; Quality below 5 + Enjoyment above 5 → Cheap Thrills; Quality above 5 + Enjoyment below 5 → Respectable; both below 5 → Not Worth Watching.
- **R26** — WHEN exactly one value is Neutral, THE SYSTEM SHALL classify the point by the other value alone — Enjoyment Neutral + Quality High → Good; Enjoyment Neutral + Quality Low → Bad; Quality Neutral + Enjoyment High → Enjoyable; Quality Neutral + Enjoyment Low → Not Enjoyable — assign no quadrant, and plot it on the dividing line.
- **R50** — WHEN both values are Neutral, THE SYSTEM SHALL classify the point as "On the fence" and plot it at the centre of the chart `[Q10]`.
- **R27** — WHEN a film has at least one rating, THE SYSTEM SHALL calculate its group average as the mean Quality score and the mean Enjoyment score across all members' current ratings, each rounded to one decimal place, and SHALL classify the rounded values, so that the number shown and the quadrant shown can never contradict each other.
- **R28** — WHEN a quadrant chart is drawn, THE SYSTEM SHALL draw the dividing lines at 5 on each axis, visibly mark the four outer corners (8 and above, 2 and below), and label the four corners and the four inner bands by name.
- **R29** — WHEN the same values are classified anywhere in the app, THE SYSTEM SHALL produce the same result, using one shared rule.

### E. My films (brief must-have 4)

**Story:** As a member, I want to see my whole log as a chart and as lists.

- **R30** — WHEN a member opens "My films", THE SYSTEM SHALL show a quadrant chart with one point per film they have rated, positioned at their own (Quality, Enjoyment) scores.
- **R31** — WHEN several points on any chart share the same position or overlap, THE SYSTEM SHALL make every one of them discoverable (for example a count on the point that opens the full set), never hiding one behind another.
- **R32** — WHEN a member selects a point on the chart, THE SYSTEM SHALL show the film's title, year, poster and both scores, with a link to the film's page.
- **R33** — WHEN a member opens "My films", THE SYSTEM SHALL also offer the same films as a list showing poster, title, year, both scores and quadrant.
- **R34** — WHEN a member chooses a filter, THE SYSTEM SHALL show only the films with the chosen placement, and SHALL show the number of films in each of the thirteen placements (four corners, four inner bands, four axis labels, On the fence), which always add up to the total.
- **R35** — WHEN a member has not rated any films, THE SYSTEM SHALL show an empty state that explains the two scores and links to search.
- **R36** — WHEN the list is shown, THE SYSTEM SHALL order it most-recently-rated first by default.

### F. The film page and friends' ratings (brief must-have 5)

**Story:** As a member, I want to see where I put a film compared with all my
friends, because displaying that is the point of the app.

- **R37** — WHEN a member opens a film's page, THE SYSTEM SHALL show every member's rating of that film (display name, both scores, quadrant, review), whether or not the viewer has rated it.
- **R38** — WHEN a film's page is shown and at least one member has rated it, THE SYSTEM SHALL show a spoke map: every member's rating as a labelled point on a quadrant chart, plus the group average as a visually distinct point.
- **R39** — WHEN the spoke map is shown and the viewing member has rated the film, THE SYSTEM SHALL draw a spoke from the viewer's point to each other member's point, with the viewer's point visually distinct as the hub.
- **R40** — WHEN the spoke map is shown and the viewing member has not rated the film, THE SYSTEM SHALL show the points and the group average without spokes, and prompt the viewer to rate it `[Q12]`.
- **R41** — WHEN spokes are shown, THE SYSTEM SHALL state the disagreement (spoke length) for each friend in text as well, and highlight the friend the viewer disagrees with most.
- **R42** — WHEN a film's page is shown, THE SYSTEM SHALL state the group average for Quality and for Enjoyment, the number of members who rated it, and the quadrant the group average falls in.
- **R43** — WHEN a member opens "Friends' films", THE SYSTEM SHALL show a quadrant chart with one point per film rated by at least one member, positioned at its group average, and the same films as a list with the R34 filters applied to the group average.
- **R44** — WHEN the "Friends' films" list is shown, THE SYSTEM SHALL show how many members rated each film and allow sorting by film disagreement (largest first) and by most recently rated.
- **R45** — WHEN a film has been rated by only one member, THE SYSTEM SHALL show it without a disagreement value rather than showing zero, and SHALL show its group average as equal to that one rating.
- **R46** — WHEN a member selects another member's name, THE SYSTEM SHALL show that member's quadrant chart and list, read-only, in the same form as "My films".

### G. Shared data and deployment (brief must-have 6)

- **R47** — WHEN a member saves, edits or deletes a rating on one device, THE SYSTEM SHALL show the result to any other member on any device the next time they load or refresh the relevant page. (Live push updates are not required.)
- **R48** — WHEN a member opens the app's public URL in a current version of Chrome, Safari, Firefox or Edge, on a phone or a laptop, THE SYSTEM SHALL be fully usable without installing anything.

### H. Nice-to-haves (NOT committed for the POC — tasks only after A–G are solid)

- **N1** — Biggest-disagreements feed: pairs of members and films ranked by disagreement.
- **N2** — Compare two members' quadrant charts side by side.
- **N3** — Rewatch log: a "log a rewatch" action that records new scores for a film the member has already rated. The new scores become the member's current rating; every earlier entry is kept with its date; a times-watched count is shown. See NFR19 `[Q11]`.
- **N4** — Score distributions on the film page: for each of Quality and Enjoyment, a curve showing how the group's scores are spread (a normal distribution drawn from the group's mean and standard deviation), shown only when enough members have rated the film for a spread to mean something. See NFR21.

---

## 3. Non-functional requirements

**Security**

- **NFR1** — Access control (R1, R4, R5, R22) is enforced where the data lives, not only in the interface. Someone using browser developer tools or calling the backend directly must not be able to read anything while signed out, or change another member's data while signed in.
- **NFR2** — No secret is ever committed to the repository or sent to the browser. Secrets live in `.env.local` and the host's settings; `.env.example` lists every variable name with a dummy value.
- **NFR3** — The app never stores passwords. Sign-in is delegated to Google through an established authentication provider.
- **NFR4** — All traffic uses HTTPS.

**Privacy**

- **NFR5** — The only personal data stored is what sign-in needs (email address) plus a display name. Members see each other's display names, never each other's email addresses.
- **NFR6** — Nothing is publicly readable or indexable: no public profiles, no share links, and search engines are told not to index the site.
- **NFR7** — No analytics or advertising trackers.

**Performance** (at POC scale: ≤ 15 members, ≤ ~5,000 ratings total)

- **NFR8** — Pages showing charts or lists become usable within 2 seconds on a typical home connection.
- **NFR9** — Search results appear within 1.5 seconds of submitting, when the external database responds normally.
- **NFR10** — Searching does not send a request on every keystroke in a way that could exhaust the movie database's rate limit.

**Cost**

- **NFR11** — Every service used runs on a free tier with no payment card at risk of being charged. The design doc must list each free-tier limit that could plausibly be hit and what happens when it is.

**Accessibility basics**

- **NFR12** — Every action is possible with a keyboard alone, including choosing scores and reading chart points.
- **NFR13** — A chart is never the _only_ way to get information: lists (R33, R43) and text (R41, R42) carry the same data.
- **NFR14** — Quadrants, members and the group average are distinguished by label or shape, not by colour alone; text meets WCAG AA contrast.
- **NFR15** — Posters have alt text (the film title); form fields have labels; errors are announced in text.

**Maintainability**

- **NFR16** — Code is statically typed; lint, typecheck and tests run with one command each.
- **NFR22** — _Renameable labels._ The displayed names of all thirteen placements (four corners, four inner bands, four axis labels, "On the fence") and the slider end labels are defined in exactly one place, separate from the classification rule and from stored data, so any of them can be renamed with a one-line change and no data migration. All of these names are working names the owner expects to revise: opposite regions should ideally be antonyms (Worth Watching / Not Worth Watching), but film puns and references are welcome where they are more fun.
- **NFR17** — All classification, averaging, rounding and disagreement maths lives in pure functions with unit tests covering every boundary value (R24–R29, R41, R45).

**Third-party terms**

- **NFR18** — The app complies with the movie database's terms of use, including any required attribution notice.

**Room to grow** (things the POC does not build but must not block)

- **NFR19** — _Rewatch-ready data._ Ratings are stored so that one member can later have several dated entries for the same film (with the latest being their current rating and a times-watched count derivable from them) without restructuring or losing the data collected during the POC.
- **NFR20** — _TV-ready data._ The stored record of a title carries what kind of title it is (film now), and nothing in the data model or the rating logic assumes a title can only ever be a film. Adding TV series later — including ratings for a whole series, a season or a single episode — must be an extension, not a rewrite. The design doc must describe how.
- **NFR21** — _Distribution-ready data._ Individual members' scores are always kept; group averages are calculated from them and never stored as the only record, so spread statistics (N4) can be added later.

---

## 4. Edge cases the brief didn't cover

| #   | Case                                                                              | Handling                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | A member scores exactly 5 on one scale                                            | Axis label from the other scale, plotted on the line (R26). 5 on both → On the fence (R50)                                                                                                                        |
| E2  | Group average lands exactly on 5.0 on one or both axes after rounding             | Same rules as a single rating (R26, R27, R50)                                                                                                                                                                     |
| E3  | Group average of 5.04 would display as "5.0" but be High if unrounded             | Rounding happens _before_ classifying (R27), so it shows 5.0 and is treated as Neutral                                                                                                                            |
| E26 | One score is 5 and the other is extreme, e.g. 9/5 | Still the plain single-scale label (Good). Deliberate: it nudges the member to move the slider they left at 5 if they want a stronger label (R26) |
| E25 | One score extreme and the other not, e.g. 6/9 or 9/6 | Inner band, not the corner: both scores must be extreme to earn a corner label (R25, R52). 6/9 is Worth Watching |
| E24 | A score of exactly 8 or exactly 2, or a group average of exactly 8.0 or 2.0 | Counts as extreme: the edges of the outer corners are inclusive (R24). 7.9 and 2.1 are not extreme |
| E22 | A member saves without touching either slider                                     | Saved as 5/5, On the fence (R49). There is no "unscored" state: 5/5 is a real score meaning "an average film", and logging a film always means rating it. _Confirmed by the owner 2026-11-14._                    |
| E23 | A member logs films quickly at the default and means to score them properly later | Their 5s count as real 5s in group averages until they change them. Mitigated by making updates quick (R51) and by the "On the fence" filter (R34), which lists exactly the films they left at 5/5                |
| E4  | Many points at or near the same position                                          | R31                                                                                                                                                                                                               |
| E5  | Same member rates the same film twice (two tabs, double-click)                    | R19: one current rating per member per film, enforced in the database; the second attempt edits the first                                                                                                         |
| E6  | Film missing from the movie database                                              | Cannot be logged in the POC. R11 tells the member. No manual film entry.                                                                                                                                          |
| E7  | Two films with the same title (remakes)                                           | Films are identified by database ID; year and poster shown everywhere (R9)                                                                                                                                        |
| E8  | Film has no poster / no year                                                      | R10                                                                                                                                                                                                               |
| E9  | Movie database down                                                               | R12 for search; R14 keeps existing charts and lists working                                                                                                                                                       |
| E10 | Movie database later changes a title or poster                                    | Our stored copy is refreshed from the movie database often enough to comply with its terms, which forbid caching for longer than 6 months (NFR18). _Amended 2026-11-14 during design; was "stale copy accepted"._ |
| E11 | Only one member has rated a film                                                  | R45: average equals that rating, no disagreement value, spoke map shows one point                                                                                                                                 |
| E12 | Viewer hasn't rated a film that friends have                                      | R37 and R40: friends' points and the average are visible, no spokes                                                                                                                                               |
| E13 | A friend's rating is identical to the viewer's                                    | Spoke of length 0: the points coincide (R31) and the text says "you agree exactly"                                                                                                                                |
| E14 | Score of 0                                                                        | A valid score, distinct from "not rated". Must not be treated as empty by forms or code.                                                                                                                          |
| E15 | Review containing HTML, script, emoji or very long words                          | R18 (plain text); layout must wrap long strings                                                                                                                                                                   |
| E16 | Owner removes a member                                                            | They can no longer sign in (R6). Their ratings stay visible under their display name and still count in group averages.                                                                                           |
| E17 | Invited person signs in with a different Google account than the invited address  | Refused (R4); the message says to use the invited address without revealing who is invited                                                                                                                        |
| E18 | Two members pick the same display name                                            | Allowed; not worth preventing at this scale                                                                                                                                                                       |
| E19 | Session expires while a member is writing a review                                | The save fails with a clear message and the typed text is not lost from the form                                                                                                                                  |
| E20 | Member with a very large log (hundreds of films)                                  | Chart and list must stay usable; R31 and NFR8 apply                                                                                                                                                               |
| E21 | A member deletes the only rating of a film                                        | The film disappears from "Friends' films"; its stored copy may remain unused                                                                                                                                      |

---

## 5. Out of scope

From the brief: public profiles, follows, likes, comments, custom lists, native
mobile apps, recommendations, payments, notifications.

Also excluded from the POC: TV series (but see NFR20), multiple separate friend
groups, manual film entry, importing from Letterboxd/IMDb, password-based
accounts, an in-app admin screen, a "watched on" date, live-updating pages.

---

## 6. Resolved questions

| #   | Question                      | Answer                                                                                                                                                                                           |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1  | High/Low boundary             | 5 is the neutral midpoint; lines at 5. Scores stay integers 0–10 per member; each film also gets a group average that is plotted and classified. Score distributions are a later extension (N4). |
| Q2  | Invitations                   | Email allowlist edited by the owner in the database dashboard. Sign-in with Google.                                                                                                              |
| Q3  | Edit and delete               | Must-haves. Rewatch log is a nice-to-have (N3), but the data must be ready for it (NFR19).                                                                                                       |
| Q4  | Friends' scores before rating | Always visible.                                                                                                                                                                                  |
| Q5  | Disagreement                  | Straight-line distance, shown as a spoke map on the film page.                                                                                                                                   |
| Q6  | Review length                 | 500 characters, plain text.                                                                                                                                                                      |
| Q7  | Removed member's ratings      | They stay.                                                                                                                                                                                       |
| Q8  | Films or TV                   | Films only, with the data ready for TV later (NFR20).                                                                                                                                            |
| Q9  | Watched date                  | Not recorded; only when the rating was created.                                                                                                                                                  |

---

## 7. Follow-up questions (resolved)

These came out of the owner's answers. **The owner accepted the default for all
three on 2026-11-14**, so the defaults below are final; the alternatives are kept
as a record of what was rejected. There are no open questions.

> **Q10 was revised in v3.** The answer below ("either value at 5 → On the
> fence") was replaced at the owner's request: one value at 5 gives an axis
> label (R26); only 5/5 is On the fence (R50). The text is kept as history.

**Q10 — What happens to a point that is exactly 5 on one or both scales?** _(affects R23, R26, R34, E1–E3)_
You said 5 should be neutral, so I've read that as: it sits on the line and is in no quadrant.

- **Default: a fifth label, "On the fence".** Such films are plotted on the line, get their own filter and count, and are never forced into a quadrant. Because most people score 6–8, this should be a small group, and group averages will rarely land on exactly 5.0.
- Alternative: no fifth label. A film at 5 is plotted on the line but listed under _both_ neighbouring quadrants. No extra filter, but counts no longer add up to the total.

**Q11 — Is an edit different from a rewatch?** _(affects R20, N3, NFR19)_

- **Default: yes.** An edit is a correction ("I mis-tapped") and overwrites the current entry. A rewatch (N3, later) adds a new dated entry and keeps the old one. For the POC this means only edits exist, and history starts accumulating when N3 is built.
- Alternative: keep every edit as history from day one. More data for later charts, but corrections of mis-taps would be counted as watches unless members are asked "is this a rewatch?" every time they edit — which is N3 by another name.

**Q12 — What does the spoke map show if I haven't rated the film?** _(affects R40)_

- **Default: friends' points and the group average, no spokes**, with a prompt to rate it.
- Alternative: draw the spokes from the group average instead, so the map always has a hub.
