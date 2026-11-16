/**
 * Colour contrast, as WCAG 2 defines it (NFR14: text meets WCAG AA).
 *
 * The site uses two colours per theme (globals.css) and makes every other
 * shade by fading the text colour: Tailwind's "opacity-70" or
 * "border-foreground/30". A faded colour is just the text colour mixed with
 * the background, so the contrast of each fade can be worked out here and
 * tested, instead of checked by eye.
 */

/** The two colours of each theme, copied from src/app/globals.css (a test
 *  keeps them in step), plus the red used for error messages. */
export const THEMES = {
  light: { background: "#ffffff", foreground: "#171717", errorText: "#b91c1c" },
  dark: { background: "#0a0a0a", foreground: "#ededed", errorText: "#f87171" },
} as const;

/**
 * The faintest text the site may use, as a fraction of full strength: the
 * "opacity-60" class. Anything fainter falls below WCAG AA's 4.5 : 1 in
 * light mode (50% is about 3.4 : 1).
 */
export const MIN_TEXT_OPACITY = 0.6;

/**
 * The edge of a text box: "border-foreground/50". WCAG asks for 3 : 1
 * between a control's edge and its background, because the edge is how
 * the box is seen at all. The old /30 was about 2 : 1 in light mode.
 */
export const FIELD_BORDER_OPACITY = 0.5;

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  return [1, 3, 5].map((start) =>
    parseInt(hex.slice(start, start + 2), 16),
  ) as Rgb;
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * How bright a colour looks, from 0 (black) to 1 (white). The screen's
 * numbers are not proportional to light, so each is first "linearised",
 * and green counts most because eyes are most sensitive to it. The
 * constants are WCAG's.
 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours: from 1 (none) to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The colour seen when `colour` is drawn at `alpha` (0 to 1) over
 * `background`: what "opacity-70" does to text.
 */
export function blend(colour: string, background: string, alpha: number) {
  const front = toRgb(colour);
  const back = toRgb(background);
  return toHex(
    front.map((value, i) => value * alpha + back[i] * (1 - alpha)) as Rgb,
  );
}
