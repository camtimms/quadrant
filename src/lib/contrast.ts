/**
 * Colour contrast, as WCAG 2 defines it (NFR14: text meets WCAG AA).
 *
 * The theme's colours, and the pairs of them the app draws, are measured
 * with this in src/lib/theme.test.ts.
 */

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  return [1, 3, 5].map((start) =>
    parseInt(hex.slice(start, start + 2), 16),
  ) as Rgb;
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
