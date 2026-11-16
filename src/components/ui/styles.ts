/**
 * The theme's recurring looks as class strings (design 17.2): a card, a
 * pill, the main (yellow) button and so on. A component imports the one it
 * needs and adds its own layout classes beside it:
 *
 *   <Link href="/search" className={`${buttonMain} self-start`}>
 *
 * Plain strings rather than components (<Pill>, <Card>), because these go
 * on elements that already exist (links, buttons, <summary>) and a class
 * string fits any of them without changing what element anything is.
 *
 * Every colour here is one of the theme's named colours (globals.css), so
 * its contrast is measured in src/lib/theme.test.ts. The rules these
 * strings must keep are tested in styles.test.ts.
 */

/**
 * The keyboard focus ring (NFR12): a 2 px outline just outside the
 * element, in the theme's focus colour (near-black on cream, yellow on
 * black). focus-visible shows it for the keyboard, not for a tap.
 */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * A press shows at once on a phone (NFR23), which has no hover. A filter
 * changes brightness whatever the colour underneath, so one rule serves
 * every surface; dark mode brightens instead of darkening.
 */
const pressed =
  "hover:brightness-95 active:brightness-90 dark:hover:brightness-125 dark:active:brightness-150";

/** A rounded white (or dark grey) panel on the page. */
export const card = "rounded-2xl bg-card p-4";

/** Secondary text: years, hints, counts. Never an opacity (design 17.1). */
export const mutedText = "text-ink-muted";

/** Error text, for messages with role="alert". */
export const errorText = "text-sm text-danger";

/** A resting pill: nav links, chips, small buttons. */
export const pill = `inline-flex items-center justify-center gap-1 rounded-full bg-well px-3 py-1.5 text-ink ${pressed} ${focusRing}`;

/**
 * A smaller pill for the buttons inside a film row ("Update scores",
 * "Film page"). T32c measured both on one line at 375 px only with 10 px
 * side padding (R65).
 */
export const pillSmall = `inline-flex items-center justify-center gap-1 rounded-full bg-well px-2.5 py-1 text-sm whitespace-nowrap text-ink ${pressed} ${focusRing}`;

/**
 * The chosen pill: the current page, the chosen filter. Yellow with dark
 * text, bold, and outlined in light mode, where yellow on cream is too
 * faint to be the only sign (NFR14).
 */
export const pillCurrent = `inline-flex items-center justify-center gap-1 rounded-full bg-accent px-3 py-1.5 font-semibold text-on-accent ring-1 ring-accent-outline ${pressed} ${focusRing}`;

/** The one main action on a screen: "Save rating", "Sign in with Google". */
export const buttonMain = `inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-semibold text-on-accent ${pressed} disabled:opacity-60 ${focusRing}`;

/** Any other button: "Sign out", "Cancel". */
export const buttonSecondary = `inline-flex items-center justify-center gap-2 rounded-full bg-well px-4 py-2 font-medium text-ink ${pressed} disabled:opacity-60 ${focusRing}`;

/** A button that removes something: "Yes, delete". */
export const buttonDanger = `inline-flex items-center justify-center gap-2 rounded-full border border-danger px-4 py-2 font-medium text-danger ${pressed} disabled:opacity-60 ${focusRing}`;

/**
 * A text box. The edge colour reaches 3 : 1 against every surface, which
 * is how the box is seen at all (WCAG 1.4.11).
 */
export const textField = `rounded-xl border border-edge bg-card px-3 py-2 text-ink ${focusRing}`;

/** A link inside running text. */
export const textLink = `rounded underline underline-offset-4 hover:decoration-2 active:brightness-75 ${focusRing}`;
