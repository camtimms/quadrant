# 01 — Requirements

Status: **APPROVED** (v4, 2026-11-14), with **v5 changes requested by the owner on 2026-11-14** (below)

**v15 change approved by the owner on 2026-11-16:** Friends' films in
most-recent order becomes a feed of ratings, each with who rated, their
scores, the start of their review and the same like button as the film page
(R77, R78, section 16; task T29e).

**v14 change approved by the owner on 2026-11-16:** score spread curves
on the film page from five ratings (N4 as R73–R74), and comparing yourself
with another member from their page (N2 as R75–R76), section 15. The rewatch
log (N3) is set aside for now; uploading your own picture (N5) is to be
specified next.

**v13 change approved by the owner on 2026-11-16:** likes on written
reviews (N6 specified as R69 to R72, section 14; tasks T42a and T42b). The
biggest-disagreements feed (N1, T36) is dropped: sorting Friends' films by
disagreement (R44) covers it.

**v12 change approved by the owner on 2026-11-16:**
keep the free production database from being paused after a quiet week
(new NFR26, section 13; nice-to-have task T40).

**v11 change approved by the owner on 2026-11-16:**
a switch between light and dark mode at the top right of the signed-in
header (new R68, section 12). Answers Q17, which v10 had assumed "no".

**v10 change approved by the owner on 2026-11-16:**
the visual design (NFR24 filled in from the owner's choice: the "Soft app"
layout, yellow on black in dark mode, "Sunshine" in light mode), names on
the spoke map that never sit under lines or each other (new R66), and a
colour for each member on the spoke map (new R67). Section 11.

**v9 change approved by the owner on 2026-11-16:** each film list
becomes one selectable area that Down enters from anywhere on the page and
Tab passes in one step (R64 amended), and a film's buttons sit beside it
(new R65, section 10).

**v8 change approved by the owner on 2026-11-16:** Up and Down move
between films in every film list, and between the search box and its
results (new R64, section 9).

**v7 change approved by the owner on 2026-11-16**
(after using the film page): saving a rating from a film's page keeps the
member on that page, where the "Your rating" section folds to its one line
with the new scores and placement and says "Saved". This amends R23 and
reverses its v5 form. Updating scores in place from a list (R51) is unchanged.

**v6 changes approved by the owner on 2026-11-15** (requested after trying
Friends' films in T29): who rated a film, and what they wrote, shown where a
film is selected on Friends' films; ratings on the film page as cards;
members' Google pictures, which each member can switch off. They are in
section 8 at the end of this file. NFR5 (personal data) changes with them.

v5 changes (owner's request after trying My films in T26): choosing a filter
now narrows the chart as well as the list, and the chart zooms in on the part
it shows (R34, new R53); saving a rating from a film's page returns the member
to My films, where the film is pointed out with its placement (R23).
After testing on a phone the owner also asked for immediate feedback on every
tap and while pages load (new NFR23), and for a visual design pass before
release (new NFR24, to be specified with the owner when that task starts).
Later the same day the owner asked for the film's description on its page and
a button to that page beside "Update scores" (R14 amended, new R54 and R55).
On 2026-11-15 the owner supplied a site icon and asked for it to be used as
the favicon and wherever else the site shows its identity (new NFR25).
The same day the owner asked for the "Your rating" section of the film page to
fold away, since it took up much of the screen (new R56).

v4 changes (owner’s request during implementation, after T4): the famous four
labels now need *both* scores to be extreme (7.5 or more / 2.5 or less, which
for a member’s whole-number score means 8+ / 2−), and the
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
| **Extreme** | A value of 7.5 or more (extremely high) or 2.5 or less (extremely low). The cut-offs split each scale into four equal bands of 2.5. A member’s whole-number score is therefore extreme at 8, 9, 10 or 0, 1, 2. The half-points only matter for group averages: 7.5 and 2.5 count as extreme; 7.4 and 2.6 do not. |
| **Outer corner** | Where both values are Extreme. Four labels: **Masterpieces** (quality 7.5+, enjoyment 7.5+), **Guilty Pleasures** (quality 2.5−, enjoyment 7.5+), **Serious Watches** (quality 7.5+, enjoyment 2.5−), **Dumpster Fires** (quality 2.5−, enjoyment 2.5−). These are the rare, stand-out films. |
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
- **R14** — WHEN a film has been rated by anyone, THE SYSTEM SHALL keep its own copy of that film's title, year, poster reference and description _(v5: description added)_, so that charts and lists display without depending on the external database being up.

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
- **R54** — WHEN a member opens a film's page, THE SYSTEM SHALL show the film's description from the movie database, when it has one, together with the member's own review. _(v5, new.)_
- **R55** — WHEN a film is shown in a list or in the panel opened from a chart point, THE SYSTEM SHALL offer a visible button to that film's page, placed beside "Update scores" where that is shown. (Selecting the film itself goes to the same page; the button is there so the two actions sit side by side.) _(v5, new.)_
- **R56** — _(v5, new.)_ WHEN a member opens the page of a film they have already rated, THE SYSTEM SHALL show their rating as one line (both scores and the placement) with the rating form folded away beneath it, and SHALL open the form when the member asks. WHEN the member has not rated the film, the form SHALL start open.
- **R23** — WHEN a rating is saved from a film's page, THE SYSTEM SHALL keep the member on that film's page, SHALL fold the "Your rating" section (R56) to its one line showing the saved scores and the placement they landed in, and SHALL say "Saved" beside it. _(v7, 2026-11-16. v5 had taken the member to "My films" and pointed the film out there; before v5 it said "show the member the placement it landed in", on the film page itself.)_

### D. Quadrant maths (the core mechanic)

**Story:** As a member, I want every point placed by one rule I can understand.

- **R24** — WHEN a point (a member’s rating or a group average) is classified, THE SYSTEM SHALL label each of its two values High (above 5), Low (below 5) or Neutral (exactly 5), and additionally Extreme when the value is 7.5 or more, or 2.5 or less.
- **R25** — WHEN both values are Extreme, THE SYSTEM SHALL assign exactly one outer corner: Quality extremely high + Enjoyment extremely high → Masterpieces; Quality extremely low + Enjoyment extremely high → Guilty Pleasures; Quality extremely high + Enjoyment extremely low → Serious Watches; Quality extremely low + Enjoyment extremely low → Dumpster Fires.
- **R52** — WHEN neither value is Neutral and the point is not in an outer corner, THE SYSTEM SHALL assign exactly one inner band from the side of 5 each value falls on: both above 5 → Worth Watching; Quality below 5 + Enjoyment above 5 → Cheap Thrills; Quality above 5 + Enjoyment below 5 → Respectable; both below 5 → Not Worth Watching.
- **R26** — WHEN exactly one value is Neutral, THE SYSTEM SHALL classify the point by the other value alone — Enjoyment Neutral + Quality High → Good; Enjoyment Neutral + Quality Low → Bad; Quality Neutral + Enjoyment High → Enjoyable; Quality Neutral + Enjoyment Low → Not Enjoyable — assign no quadrant, and plot it on the dividing line.
- **R50** — WHEN both values are Neutral, THE SYSTEM SHALL classify the point as "On the fence" and plot it at the centre of the chart `[Q10]`.
- **R27** — WHEN a film has at least one rating, THE SYSTEM SHALL calculate its group average as the mean Quality score and the mean Enjoyment score across all members' current ratings, each rounded to one decimal place, and SHALL classify the rounded values, so that the number shown and the quadrant shown can never contradict each other.
- **R28** — WHEN a quadrant chart is drawn, THE SYSTEM SHALL draw the dividing lines at 5 on each axis, visibly mark the four outer corners (from 7.5 up and from 2.5 down), and label the four corners and the four inner bands by name.
- **R29** — WHEN the same values are classified anywhere in the app, THE SYSTEM SHALL produce the same result, using one shared rule.

### E. My films (brief must-have 4)

**Story:** As a member, I want to see my whole log as a chart and as lists.

- **R30** — WHEN a member opens "My films", THE SYSTEM SHALL show a quadrant chart with one point per film they have rated, positioned at their own (Quality, Enjoyment) scores.
- **R31** — WHEN several points on any chart share the same position or overlap, THE SYSTEM SHALL make every one of them discoverable (for example a count on the point that opens the full set), never hiding one behind another.
- **R32** — WHEN a member selects a point on the chart, THE SYSTEM SHALL show the film's title, year, poster and both scores, with a link to the film's page.
- **R33** — WHEN a member opens "My films", THE SYSTEM SHALL also offer the same films as a list showing poster, title, year, both scores and quadrant.
- **R34** — WHEN a member chooses a filter, THE SYSTEM SHALL show only the films with the chosen placement, in the list and on the chart alike _(v5: the chart used to keep showing every film)_, and SHALL show the number of films in each of the thirteen placements (four corners, four inner bands, four axis labels, On the fence), which always add up to the total.
- **R53** — WHEN a filter is chosen, THE SYSTEM SHALL zoom the chart in on the part of it where that placement lies, moving there smoothly, and SHALL zoom back out when the filter is cleared. For members whose device asks for reduced motion, the change SHALL happen without animation. _(v5, new.)_
- **R35** — WHEN a member has not rated any films, THE SYSTEM SHALL show an empty state that explains the two scores and links to search.
- **R36** — WHEN the list is shown, THE SYSTEM SHALL order it most-recently-rated first by default. "Most recently rated" means when the member first rated the film, not when they last changed the rating _(clarified by the owner, 2026-11-14)_.

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

- **N1** — Biggest-disagreements feed: pairs of members and films ranked by disagreement. _**Dropped 2026-11-16 by the owner:** sorting Friends' films by disagreement (R44) is enough._
- **N2** — Compare two members' quadrant charts side by side.
- **N3** — _(Set aside by the owner on 2026-11-16: not now.)_ Rewatch log: a "log a rewatch" action that records new scores for a film the member has already rated. The new scores become the member's current rating; every earlier entry is kept with its date; a times-watched count is shown. See NFR19 `[Q11]`.
- **N4** — Score distributions on the film page: for each of Quality and Enjoyment, a curve showing how the group's scores are spread (a normal distribution drawn from the group's mean and standard deviation), shown only when enough members have rated the film for a spread to mean something. See NFR21.
- **N5** — _(v6, new.)_ Upload your own profile picture, cropped to a circle, in place of the Google one. Needs image storage with members-only access, an upload and crop step, and limits on file type and size; see design section 16.9.
- **N6** — _(Owner's request, 2026-11-15.)_ Likes on reviews: a member can like a friend's written review on that friend's card on a film's page, and each card shows how many likes its review has. To be specified before it is built: whether members see who liked a review or only the count, whether you can like your own, and what happens to likes when the review is edited or deleted.

---

## 3. Non-functional requirements

**Security**

- **NFR1** — Access control (R1, R4, R5, R22) is enforced where the data lives, not only in the interface. Someone using browser developer tools or calling the backend directly must not be able to read anything while signed out, or change another member's data while signed in.
- **NFR2** — No secret is ever committed to the repository or sent to the browser. Secrets live in `.env.local` and the host's settings; `.env.example` lists every variable name with a dummy value.
- **NFR3** — The app never stores passwords. Sign-in is delegated to Google through an established authentication provider.
- **NFR4** — All traffic uses HTTPS.

**Privacy**

- **NFR5** — The only personal data stored is what sign-in needs (email address), a display name and, unless the member has switched it off, the address of their Google account picture _(v6: picture added)_. Members see each other's display names and pictures, never each other's email addresses.
- **NFR6** — Nothing is publicly readable or indexable: no public profiles, no share links, and search engines are told not to index the site.
- **NFR7** — No analytics or advertising trackers.

**Performance** (at POC scale: ≤ 15 members, ≤ ~5,000 ratings total)

- **NFR8** — Pages showing charts or lists become usable within 2 seconds on a typical home connection.
- **NFR9** — Search results appear within 1.5 seconds of submitting, when the external database responds normally.
- **NFR23** — _Immediate feedback (v5, new)._ Anything a member can tap or click shows that it was pressed straight away, without relying on hover. WHEN a page or a filter takes time to load, THE SYSTEM SHALL show at once that it is loading (a placeholder for a new page, a progress mark on the thing that was tapped) instead of leaving the old screen unchanged. WHEN a chart point is selected, what it opens SHALL be brought into view.
- **NFR24** — _Visual design (v5, new; details to be agreed; **filled in by v10, section 11**)._ Before release to friends the app gets a consistent, modern visual theme, keeping every existing element and behaviour. The specifics (colour, type, spacing) are a product decision to be made with the owner from concrete options when the task starts.
- **NFR25** — _Site icon (v5, new)._ The owner's icon identifies the site: in the browser tab, when the site is saved to a phone's home screen, and beside the site's name wherever the name is shown as a title (the header of signed-in pages, the sign-in page and the About page). The icon is decoration beside the written name, never a replacement for it.
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
| E24 | A group average of exactly 7.5 or exactly 2.5 | Counts as extreme: the edges of the outer corners are inclusive (R24). 7.4 and 2.6 are not extreme. A member’s own whole-number score can never land on a cut-off |
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

---

## 8. v6 changes — APPROVED by the owner, 2026-11-15

Requested by the owner on 2026-11-15 after trying Friends' films (T29). The
owner's answers so far: reviews should be readable on the film page **and**
on Friends' films; the picture should be the member's Google account photo;
the panel opened from a point should list who rated the film, one line per
rating, with the scores labelled and no table lines, most recent first, cut
off at what fits.

One thing the owner asked, answered here so the requirements below read
correctly: on Friends' films each film is **one** point, placed at the
group's average. Two friends' different ratings of a film do not make two
points there. (They do on the film page's spoke map, where every point is a
person.) So selecting a point on Friends' films opens that one film, and
"who rated it" is a list inside it.

### Requirements

- **R57** — WHEN a film is shown in the panel opened from a point on "Friends' films", THE SYSTEM SHALL show how many members rated it and its disagreement (as the list already does), and SHALL list who rated it: one line per member with their picture, their display name (linking to that member's films), and their two scores labelled Quality and Enjoyment, most recently rated first, without table lines.
- **R58** — WHEN more members have rated a film than the panel shows (three), THE SYSTEM SHALL say how many more there are and link to the film's page, where all of them are shown.
- **R59** — WHEN a rating listed in that panel has a written review, THE SYSTEM SHALL show the start of the review under its line, cut off after a few lines, with the whole review on the film's page.
- **R60** — WHEN a member opens a film's page, THE SYSTEM SHALL show every member's rating as a card: picture, display name (linking to that member's films, except the viewer's own), both scores labelled, the placement, and the written review when there is one. The viewer's own card comes first. The placement label is shown prominently on each card. The cards are one list, not pages. This replaces the ratings table and the separate list of reviews from R37; R37's content is unchanged, only its form.
- **R61** — WHEN a member's rating is shown on a card (R60) or in the Friends' films panel (R57), THE SYSTEM SHALL show that member's Google account picture beside their name. WHEN a member has no picture, has switched it off (R63), or it cannot be loaded, THE SYSTEM SHALL show the first letter of their display name in a circle instead.
- **R62** — WHEN a member who has not switched their picture off signs in, THE SYSTEM SHALL store the address of their Google account picture with their profile, replacing any older one, so that the picture others see follows the member's Google account. Only an address on Google's own picture servers is ever stored.
- **R63** — WHEN a member chooses their display name on first sign-in, THE SYSTEM SHALL offer a choice, on by default, to show their Google picture to the group. WHEN the member switches it off, then or later from the same form, THE SYSTEM SHALL remove the stored address and show their initial instead, and SHALL NOT store it again until they switch it back on.

### Changed requirements

- **NFR5** (personal data) now includes the address of the member's Google account picture, unless they have switched it off (R63). The text in section 3 is updated.
- **NFR1** applies unchanged: a picture address is readable by members only, like a display name.
- **R37** changes form, not content (see R60).

### Edge cases

| #   | Situation                                                         | Proposed behaviour                                                                                 |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| E27 | A member's Google account has no picture, or the picture fails    | The first letter of their display name in a circle (R61)                                           |
| E28 | A member is removed from the invite list                          | Their ratings and cards stay (E16), with the picture as last stored                                |
| E29 | A film has more ratings than the Friends' films panel shows       | "and 4 more" linking to the film's page (R58)                                                      |
| E30 | A member changes their Google picture                             | Others see the new one after that member next signs in (R62); until then the old address may fail and E27 applies |
| E31 | A very long review in the Friends' films panel                    | Cut off after a few lines; whole on the film's page (R59)                                          |

### Questions, resolved by the owner on 2026-11-15

**Q14 — Do the cards replace the ratings table on the film page?** Yes. The cards replace the table and the reviews list. The "How far each friend is from you" table stays.

**Q15 — Pages you swipe through, or one list?** One list of cards, each with its placement label clearly shown and the review present. No pages, swipe or floating arrow. (The owner's words were "replace with cards with the label clearly shown and their review present"; I have read that as agreeing to one list.) If the list feels long once friends join, the next step is "show the first five" with a "Show all" button.

**Q16 — When is the Google picture taken, and can a member opt out?** It is taken at sign-in, and a member can opt out when they sign up (R63), or later from the same form. Uploading your own picture is a nice-to-have (N5), not part of v6.

## 9. v8 change — APPROVED by the owner, 2026-11-16

Requested by the owner while checking T32 with the keyboard: Up and Down
should move between films the way Tab does. The owner chose every film
list, not only search results.

### Requirement

- **R64** — WHEN a film in a list of films has keyboard focus and the member presses Down or Up, THE SYSTEM SHALL move focus to the next or previous film in that list, and SHALL stop at the first and last film. This applies to search results, My films, Friends' films, a member's films, and the films listed for a selected chart point. WHEN focus is in the search box and the member presses Down, THE SYSTEM SHALL move focus to the first result; WHEN focus is on the first result and the member presses Up, THE SYSTEM SHALL move it back to the search box. Tab and Shift+Tab keep working as before.

### Edge cases

| #   | Situation                                                     | Proposed behaviour                                                                                          |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| E32 | Focus is on a slider, a text box or a row's button, not a film | Up and Down do what they always do there (a slider moves; the page scrolls); only a focused film is affected |
| E33 | The search box is focused and there are no results            | Down does nothing special                                                                                   |

## 10. v9 change — APPROVED by the owner, 2026-11-16

Requested by the owner after trying T32b: the arrow keys only worked once
Tab had reached a list, and elsewhere they still scrolled the page. The
owner asked for the film lists to act as one selectable area, still
clickable, and for the two buttons to sit beside each film to save space.
The owner chose both list changes below, not the arrows alone.

### Requirements

- **R64** _(amended, v9; adds to the v8 text in section 9)_ — WHEN a page shows a film list and the member presses Down while focus is not in a text box, a slider or a film list, THE SYSTEM SHALL move focus into the film list, to its current film (the first, until the member has moved to another); WHEN a selected chart point's panel is open, its list is the one entered. Each film list SHALL be a single stop in the Tab order: Tab enters the list at its current film, the next Tab reaches that film's own buttons, and the next leaves the list. While focus is on a film, Up and Down SHALL NOT scroll the page. Clicking or tapping a film still opens its page.
- **R65** — WHEN a film in a list has its own buttons ("Update scores", "Film page"), THE SYSTEM SHALL show them in the space beside the poster, under the film's details, rather than on a line of their own under the whole row; on a screen too narrow for both side by side they wrap onto a second line there. WHEN the score editor is opened, it SHALL take the full width under the film. _(Corrected during T32c, 2026-11-16: the first version put the buttons in a column to the right of the details, which on a phone left the details about 70 pixels wide, broke words like "Enjoyment" and made rows taller, not shorter.)_

### Edge cases

| #   | Situation                                                         | Proposed behaviour                                                         |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| E34 | A page with no film list (the film page, the welcome page)        | Up and Down scroll the page as normal                                       |
| E35 | A filter or a new search removes the current film from the list   | The first film becomes current                                              |
| E36 | Down is pressed in the search box                                 | Unchanged from v8: focus goes to the first result                           |
| E37 | A long title on a phone, with the buttons beside it               | The title wraps onto more lines; nothing runs off the screen (E15)          |

## 11. v10 change — APPROVED by the owner, 2026-11-16

Task T32a. The owner was shown three themes as phone mock-ups (Marquee,
Paper, Soft app), chose **Soft app**, asked for the logo's **yellow and
black in dark mode** and a different set for light mode, and from three
light-mode mock-ups chose **Sunshine**. The owner's note from T28 (names on
the spoke map overlap as friends join, and sit behind lines and points) is
covered here too, as T32a's task entry said it would be.

### Requirements

- **NFR24** _(filled in, v10; replaces the v5 placeholder)_ — The app has one consistent visual theme in two modes, following the device's light or dark setting, keeping every existing element and behaviour:
  - **Layout ("Soft app"):** content sits on rounded cards on a slightly tinted page; the main navigation is a row of pills inside a rounded track, the current page's pill filled; filter chips, sort links and row buttons are pills; posters have rounded corners; the chart sits on a rounded card with its four quarters lightly tinted (top right green, top left pink, bottom right blue, bottom left grey) and its corner names in a darker shade of the same colour.
  - **Dark mode:** near-black page, dark grey cards, off-white text. The logo's yellow fills the current page's pill, the chosen filter chip, main buttons and the viewer's own point and name on charts, always with black text on it.
  - **Light mode ("Sunshine"):** a deeper butter page with soft cream cards (_amended 2026-11-16 at the owner's request, T32e: the cards were white_), near-black warm text. The same yellow fills the same things, with near-black text on it. Wherever yellow alone would mark something on a light background (the viewer's point and name label), it has a thin dark outline, because yellow on cream cannot be seen well enough.
  - **Type:** the Geist typeface everywhere (already loaded; a leftover rule currently shows Arial).
  - Every text and edge meets NFR14's contrast in both modes.
- **R66** — WHEN the spoke map is shown, THE SYSTEM SHALL draw every name label above all lines and points, each on its own solid background, and SHALL place the labels so that no two overlap and no label covers another member's point; WHEN there is no free place for a label beside its point, THE SYSTEM SHALL use the free place nearest to it, joined to the point by a short line.
- **R67** — WHEN the spoke map is shown, THE SYSTEM SHALL give each friend a colour of their own, used for their point and their name, with no two friends on the same map sharing one while there are colours left; the viewer always has the theme's yellow. A member keeps the same colour from film to film unless it is already taken on that map. Colour adds to the names and shapes; it never replaces them (NFR14).

### Edge cases

| #   | Situation                                                       | Proposed behaviour                                                                                                   |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| E38 | More friends on one film than there are friend colours (seven)  | Colours repeat; every point still carries its name, and the table below the map lists everyone                       |
| E39 | So many names that some have no free place near their point      | The furthest free place is used with a joining line; the table below the map still lists everyone (NFR13)           |
| E40 | The device switches between light and dark while the app is open | The app follows at once; nothing is reloaded                                                                         |
| E41 | A page shown before the theme's colours have loaded             | The colours are part of the page's own stylesheet, so there is no flash of the old look                              |

### Open questions, and what I will assume without an answer

- **Q17 — A switch for light or dark inside the app?** _Assumed: no._ **Answered by the owner on 2026-11-16: yes** (v11, R68). The app follows the phone's own setting, as it does today. A switch can be added later.
- **Q18 — Friend colours beyond the spoke map?** _Assumed: on the spoke map, plus a small dot of the same colour beside each name in the "How far each friend is from you" table under it, so the two can be matched._ Not on the lists, cards or Friends' films, where there is no chart of members to match.

## 12. v11 change — APPROVED by the owner, 2026-11-16

Task T32d. While T32a was being built the owner asked whether there is a
switch between light and dark mode, and if not, for one where it makes
sense on a phone: top right, or, if the header is short of room, on the
page where a member changes their name and picture. The header's top row
has about 110 px free at 375 px wide, so the top right fits.

### Requirement

- **R68** — WHEN a signed-in page is shown, THE SYSTEM SHALL show a button at the right of the header's top row that switches the app between light and dark mode, labelled for screen readers with the mode it switches to; WHEN the member presses it, THE SYSTEM SHALL change mode at once, without reloading the page, and SHALL remember the choice on that device, for every page, including the sign-in and about pages; WHEN the member has never pressed it on that device, THE SYSTEM SHALL follow the device's own light or dark setting, as before.

### Edge cases

| #   | Situation                                                     | Proposed behaviour                                                                                      |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| E46 | The app is opened on a device for the first time, or the switch has never been pressed there | It starts in the device's own light or dark setting (asked for by the owner on 2026-11-16) |
| E42 | A page loads after the member chose a mode                    | It appears in the chosen mode straight away, with no flash of the other mode                             |
| E43 | The member signs out, or another member signs in on the phone | The choice stays: it belongs to the device, not the account (Q20)                                       |
| E44 | The browser forbids saving the choice (some private modes)    | The switch still works for the page that is open; the next page follows the device setting again        |
| E45 | A very long display name                                       | The name wraps onto its own line as it does today; the button stays beside "Sign out"                   |

### Open questions, and what I will assume without an answer

- **Q19 — Two choices (light, dark) or three (light, dark, follow my phone)?** _Assumed: two._ **Confirmed by the owner on 2026-11-16.** One button that flips between light and dark is the simplest thing to use on a phone. A member who wants to follow the phone again would need a third option somewhere; that can be added later on the name-and-picture page.
- **Q20 — Remember the choice per device or per account?** _Assumed: per device._ **Confirmed by the owner on 2026-11-16** ("per device is better"). It needs no database change, works before sign-in, and someone with a laptop and a phone may want different modes on each.

## 13. v12 change — APPROVED by the owner, 2026-11-16

Task T40, the first nice-to-have the owner chose after T35. Supabase's free
plan pauses a project that "show[s] low activity over a 7-day period"; while
paused the site shows "Something went wrong" until the owner resumes it in
the dashboard (README, "If the site stops working"). A quiet week among
friends is likely, so this is the free-tier limit most likely to bite
(design section 11).

### Requirement

- **NFR26** — The production database receives a small read query from the app's own server three times a day, every day, whether or not anyone uses the site, so that Supabase sees regular activity and does not pause the project. It reads nothing private, changes nothing, costs nothing on the free plans, and can only be triggered by Vercel's scheduler.

### Edge cases

| #   | Situation                                                                   | Proposed behaviour                                                                                                                           |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| E47 | Vercel misses a scheduled run (it is "best effort")                         | Nothing breaks; the other runs that day and the next days still count. Supabase's warning email a week before a pause is the backstop        |
| E48 | Someone other than Vercel calls the address                                 | Refused ("Unauthorized"), without touching the database                                                                                      |
| E49 | The secret Vercel sends is not set up                                       | Every run is refused and shows as a 401 in Vercel's logs; the README says how to set it                                                     |
| E50 | The database is already paused                                              | The run reports a failure in Vercel's logs. It cannot resume the project: only the dashboard's **Resume project** button can (README)        |

### Open questions, and what I will assume without an answer

- **Q21 — Is "very likely to stay awake" good enough?** _Assumed: yes._ Supabase says a few requests a day typically keep a project running but does not guarantee it; the only guarantee is a paid plan.

## 14. v13 change — APPROVED by the owner, 2026-11-16

N6 (likes on reviews), the owner's own request from 2026-11-15, specified
with the owner's answers to its three open questions: likes show a count and
who liked; a member may like their own review; editing a review keeps its
likes, removing it removes them. The owner asked for the nice-to-haves to be
built and pushed without stopping at each spec, so these answers are the
approval.

### Requirements

- **R69** — WHEN a film's page shows a rating card with a written review, THE SYSTEM SHALL show a like button on that card; WHEN a member presses it, THE SYSTEM SHALL record that the member likes that review, and WHEN they press it again, SHALL remove their like. A member can like a review once. A rating with no written review has no like button.
- **R70** — WHEN a review has likes, THE SYSTEM SHALL show their number on its card, and SHALL let the member see the names of everyone who liked it.
- **R71** — A member may like their own review.
- **R72** — WHEN a member edits their rating and keeps a written review, THE SYSTEM SHALL keep its likes; WHEN they remove the review's text, or delete the rating, THE SYSTEM SHALL remove its likes.

### Edge cases

| #   | Situation                                                      | Proposed behaviour                                                                                   |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| E51 | Two quick presses, or the same member liking in two tabs       | Still one like; the database refuses a second                                                        |
| E52 | A member who liked a review is taken off the invite list       | Their like stays counted, like their ratings; their name still shows                                 |
| E53 | The like fails to save (a lost connection)                     | The button returns to how it was and says it could not save                                          |
| E54 | Someone who is not a member, or a forged request               | Refused by the database, which also refuses liking on someone else's behalf or a review that is gone |

## 15. v14 change — APPROVED by the owner, 2026-11-16

The owner's answers on the remaining nice-to-haves: spread curves from five
ratings, shown under the group average (N4); comparing "you versus them",
reached from a member's page (N2); the rewatch log set aside (N3); uploading
your own picture to be built (N5, specified separately). The owner asked
for the nice-to-haves to be built and pushed without a stop at each spec.

### Requirements

- **R73** — WHEN a film's page is shown and at least five members have rated the film, THE SYSTEM SHALL show, under the group average, one curve for Quality and one for Enjoyment, each a normal distribution drawn from the group's mean and standard deviation over the 0–10 scale, with every member's score marked on it.
- **R74** — WHEN those curves are shown, THE SYSTEM SHALL also state each one in words (for example "Quality: average 6.4, most scores between 4.6 and 8.2"), so the curve is never the only way to read it (NFR13); WHEN every member gave the same score on a scale, THE SYSTEM SHALL say so in words instead of drawing a curve for it.
- **R75** — WHEN a member views another member's page, THE SYSTEM SHALL offer a "Compare with me" link leading to a page that shows the viewer's quadrant chart and the other member's side by side (one above the other on a phone), read-only, each labelled with whose it is.
- **R76** — WHEN the compare page is shown, THE SYSTEM SHALL list the films both members have rated, each with both members' scores and the disagreement between them, the biggest disagreement first, and each film linking to its page.

### Edge cases

| #   | Situation                                                   | Proposed behaviour                                                                                   |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| E55 | Fewer than five ratings                                     | No curves; the group average and cards are unchanged                                                  |
| E56 | Everyone gave the same Quality (or Enjoyment)               | "Everyone gave Quality 7" in place of that curve; the other scale still gets its curve if it varies   |
| E57 | The two members have no film in common                      | Both charts still show; the list says "No films rated by both of you yet."                            |
| E58 | The viewer, or the other member, has rated nothing          | That chart shows its empty state; the list says there is nothing to compare yet                       |
| E59 | A member opens the compare page for themselves              | Sent to My films, as their own member page does (T30)                                                 |
| E60 | An unknown member id in the compare address                 | "Page not found", as for an unknown member page                                                       |

## 16. v15 change — APPROVED by the owner, 2026-11-16

Asked for by the owner on 2026-11-16 after likes went live: in Friends'
films' most-recent order, show each rating with who made it, their score
and part of their review, likeable, with the same likes as on the film page.
The owner chose one entry per rating (a feed) over one per film, and to
leave the biggest-disagreement order as it is.

### Requirements

- **R77** — WHEN "Friends' films" is shown in most-recent order (R44), THE SYSTEM SHALL list, under the chart, one entry per member's rating, newest first by when it was first made: the member's picture or initial and name, the film (poster, title and year, linking to its page), that member's two scores and placement, and the start of their review if they wrote one. The biggest-disagreement order keeps its list of films (R44).
- **R78** — WHEN an entry in that feed has a written review, THE SYSTEM SHALL show the same like button, count and names as that review's card on the film page (R69–R71); a like given or taken back in either place is the same like.

### Edge cases

| #   | Situation                                  | Proposed behaviour                                                                                         |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| E61 | More than 50 ratings                       | The newest 50, then "Show 50 more" (a link: the address remembers how many, so Back keeps the place)       |
| E62 | A placement filter is chosen               | Only ratings of films whose group average is in that placement, matching the chart and the chips           |
| E63 | The viewer's own ratings                   | Included, as everywhere on Friends' films; their name is shown as theirs ("You") and their reviews can be liked (R71) |
| E64 | A rating is edited                         | It keeps its place: the order is when it was first made, as R36 does for films                             |

