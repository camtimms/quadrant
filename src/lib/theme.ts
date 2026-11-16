/**
 * The theme's colours as data (NFR24, design section 17.1).
 *
 * The browser gets these from src/app/globals.css, where each is a CSS
 * variable with a light and a dark value, and Tailwind turns each into
 * classes such as `bg-card`, `text-ink-muted` and `border-edge`. This file
 * is the copy the tests measure: theme.test.ts checks that globals.css
 * holds exactly these values, and that every pair below is readable.
 *
 * Why named colours rather than fades of the text colour (what the site
 * used before): a fade's contrast depends on whatever is behind it, and
 * the new theme puts text on cream, white, tinted and yellow surfaces.
 * A named colour on a named surface can be measured once and trusted.
 */

export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

/** Seven friend colours on the spoke map (R67); after that they repeat. */
export const FRIEND_COUNT = 7;

export const TOKEN_NAMES = [
  "page", // the page background
  "card", // cards, the chart, text boxes
  "well", // the nav track, resting chips, secondary buttons
  "ink", // text
  "ink-muted", // secondary text: years, hints, counts
  "edge", // edges that must be seen: text boxes, cards
  "accent", // the logo's yellow: current page, chosen chip, main buttons
  "on-accent", // text on yellow
  "accent-outline", // the dark outline yellow needs on a light background
  "spoke", // spoke lines on the film page's chart
  "focus", // the keyboard focus ring
  "danger", // error text, "Yes, delete"
  "q-tr", // the chart's quarters: top right,
  "q-tl", //   top left,
  "q-br", //   bottom right,
  "q-bl", //   bottom left
  "q-tr-ink", // the corner name written on each quarter
  "q-tl-ink",
  "q-br-ink",
  "q-bl-ink",
  ...Array.from({ length: FRIEND_COUNT }, (_, i) => `friend-${i + 1}` as const),
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];

/**
 * Every value. "Sunshine" in light mode: warm cream with yellow fills and
 * near-black text. Dark mode: near-black with the same yellow. The friend
 * colours are a darker set in light mode and a lighter set in dark mode,
 * so each stays readable as text in both.
 */
export const THEME: Record<Mode, Record<TokenName, string>> = {
  light: {
    page: "#fffbe3",
    card: "#ffffff",
    well: "#f3ecc4",
    ink: "#1d1a0a",
    "ink-muted": "#5f5730",
    edge: "#857a45",
    accent: "#f5e400",
    "on-accent": "#1d1a0a",
    "accent-outline": "#1d1a0a",
    spoke: "#7a6200",
    focus: "#1d1a0a",
    danger: "#b42318",
    "q-tr": "#e4f4e9",
    "q-tl": "#fbe9f1",
    "q-br": "#e6eefb",
    "q-bl": "#efeee6",
    "q-tr-ink": "#27500a",
    "q-tl-ink": "#72243e",
    "q-br-ink": "#0c447c",
    "q-bl-ink": "#444441",
    "friend-1": "#993556",
    "friend-2": "#0f6e56",
    "friend-3": "#185fa5",
    "friend-4": "#993c1d",
    "friend-5": "#534ab7",
    "friend-6": "#3b6d11",
    "friend-7": "#5f5e5a",
  },
  dark: {
    page: "#0d0d0d",
    card: "#1a1a1a",
    well: "#262626",
    ink: "#f2f2ee",
    "ink-muted": "#a3a39b",
    edge: "#77776f",
    accent: "#f5e400",
    "on-accent": "#0d0d0d",
    // Yellow stands out from every dark surface by itself.
    "accent-outline": "transparent",
    spoke: "#f5e400",
    focus: "#f5e400",
    danger: "#ff8a80",
    "q-tr": "#15261a",
    "q-tl": "#2a1720",
    "q-br": "#141e2b",
    "q-bl": "#1c1c1e",
    "q-tr-ink": "#97c459",
    "q-tl-ink": "#ed93b1",
    "q-br-ink": "#85b7eb",
    "q-bl-ink": "#b4b2a9",
    "friend-1": "#ed93b1",
    "friend-2": "#5dcaa5",
    "friend-3": "#85b7eb",
    "friend-4": "#f0997b",
    "friend-5": "#afa9ec",
    "friend-6": "#97c459",
    "friend-7": "#b4b2a9",
  },
};

const SURFACES = ["page", "card", "well"] as const;
const QUARTERS = ["q-tr", "q-tl", "q-br", "q-bl"] as const;
const FRIENDS = TOKEN_NAMES.filter((name) => name.startsWith("friend-"));

/**
 * Text and the surface it is drawn on, as the design uses them. Each must
 * reach 4.5 : 1 in both modes.
 */
export const TEXT_PAIRS: [TokenName, TokenName][] = [
  ...(["ink", "ink-muted", "danger"] as const).flatMap((text) =>
    SURFACES.map((surface): [TokenName, TokenName] => [text, surface]),
  ),
  ["on-accent", "accent"],
  // Each quarter's names: on the quarter itself (inner bands), and in the
  // chart's margin on the card (corner names).
  ...QUARTERS.flatMap((quarter): [TokenName, TokenName][] => [
    [`${quarter}-ink`, quarter],
    [`${quarter}-ink`, "card"],
  ]),
  // Members' names sit on a card-coloured pill on the spoke map (R66).
  ...FRIENDS.map((friend): [TokenName, TokenName] => [friend, "card"]),
];

/**
 * Things that are seen rather than read: edges, rings, lines and dots, and
 * what is behind them. Each must reach 3 : 1. A pair whose colour is
 * "transparent" in a mode (the yellow outline in dark mode) is skipped
 * there.
 */
export const EDGE_PAIRS: [TokenName, TokenName][] = [
  ...(["edge", "focus", "accent-outline"] as const).flatMap((edge) =>
    SURFACES.map((surface): [TokenName, TokenName] => [edge, surface]),
  ),
  // Chart lines and points sit on the tinted quarters and on the card.
  ...(["spoke", "ink", "accent-outline", ...FRIENDS] as const).flatMap((mark) =>
    [...QUARTERS, "card" as const].map((surface): [TokenName, TokenName] => [
      mark,
      surface,
    ]),
  ),
];
