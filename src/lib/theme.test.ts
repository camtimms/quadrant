import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";
import {
  EDGE_PAIRS,
  FRIEND_COUNT,
  MODES,
  TEXT_PAIRS,
  THEME,
  TOKEN_NAMES,
  type Mode,
} from "@/lib/theme";

// The theme's colours (NFR24, design 17.1) and their contrast (NFR14).
// WCAG AA: 4.5 : 1 for normal text; 3 : 1 for something that is seen but
// not read, such as a text box's edge, a focus ring or a dot on a chart
// (success criterion 1.4.11).
const TEXT_AA = 4.5;
const NON_TEXT = 3;

const css = readFileSync("src/app/globals.css", "utf8");

/** The `--name: value;` lines in one block of globals.css. */
function declarations(block: string): Map<string, string> {
  return new Map(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim(),
    ]),
  );
}

/** The light block (`:root { … }`, the first) and the dark one. */
function cssBlocks(): Record<Mode, Map<string, string>> {
  const light = css.match(/^:root\s*\{([^}]*)\}/m);
  const dark = css.match(
    /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/,
  );
  if (!light || !dark) throw new Error("globals.css has lost a :root block");
  return { light: declarations(light[1]), dark: declarations(dark[1]) };
}

describe("the theme's colours", () => {
  it("names every token the design lists", () => {
    expect(TOKEN_NAMES).toEqual([
      "page",
      "card",
      "well",
      "ink",
      "ink-muted",
      "edge",
      "accent",
      "on-accent",
      "accent-outline",
      "spoke",
      "focus",
      "danger",
      "q-tr",
      "q-tl",
      "q-br",
      "q-bl",
      "q-tr-ink",
      "q-tl-ink",
      "q-br-ink",
      "q-bl-ink",
      ...Array.from({ length: FRIEND_COUNT }, (_, i) => `friend-${i + 1}`),
    ]);
    expect(FRIEND_COUNT).toBe(7);
  });

  it("gives every token a value in both modes", () => {
    for (const mode of MODES) {
      expect(Object.keys(THEME[mode]).sort()).toEqual([...TOKEN_NAMES].sort());
    }
  });

  it("uses the yellow from the site's icon in both modes", () => {
    expect(THEME.light.accent).toBe("#f5e400");
    expect(THEME.dark.accent).toBe("#f5e400");
  });

  // Light mode needs a dark outline around yellow, which is barely visible
  // on cream; dark mode needs none.
  it("outlines yellow only in light mode", () => {
    expect(THEME.light["accent-outline"]).toBe(THEME.light.ink);
    expect(THEME.dark["accent-outline"]).toBe("transparent");
    expect(contrastRatio(THEME.light.accent, THEME.light.page)).toBeLessThan(
      NON_TEXT,
    );
  });

  // globals.css is what the browser uses; theme.ts is the copy the tests
  // measure. They must be the same colours.
  it.each(MODES)("matches globals.css in %s mode", (mode) => {
    const block = cssBlocks()[mode];
    for (const name of TOKEN_NAMES) {
      expect(block.get(name), `--${name}`).toBe(THEME[mode][name]);
    }
  });

  it("turns every token into a Tailwind colour", () => {
    for (const name of TOKEN_NAMES) {
      expect(css).toContain(`--color-${name}: var(--${name});`);
    }
  });
});

describe("contrast (NFR14)", () => {
  describe.each(MODES)("in %s mode", (mode) => {
    const colours = THEME[mode];

    it.each(TEXT_PAIRS)("%s text on %s is readable", (text, background) => {
      expect(
        contrastRatio(colours[text], colours[background]),
      ).toBeGreaterThanOrEqual(TEXT_AA);
    });

    it.each(EDGE_PAIRS.filter(([edge]) => colours[edge] !== "transparent"))(
      "%s on %s can be seen",
      (edge, background) => {
        expect(
          contrastRatio(colours[edge], colours[background]),
        ).toBeGreaterThanOrEqual(NON_TEXT);
      },
    );
  });

  it("checks text on every surface it is drawn on", () => {
    const surfaces = ["page", "card", "well"] as const;
    for (const text of ["ink", "ink-muted", "danger"] as const) {
      for (const surface of surfaces) {
        expect(TEXT_PAIRS).toContainEqual([text, surface]);
      }
    }
    // Members' names sit on a card-coloured pill on the spoke map (R66).
    for (let i = 1; i <= FRIEND_COUNT; i++) {
      expect(TEXT_PAIRS).toContainEqual([`friend-${i}`, "card"]);
    }
  });

  // In dark mode yellow marks things by itself, so it must stand out from
  // every surface; in light mode the outline does that job instead.
  it("lets something marked in yellow be seen in either mode", () => {
    expect(EDGE_PAIRS).toContainEqual(["accent-outline", "card"]);
    // The viewer's point sits on the chart's tinted quarters too.
    for (const surface of [
      "page",
      "card",
      "well",
      "q-tr",
      "q-tl",
      "q-br",
      "q-bl",
    ] as const) {
      expect(
        contrastRatio(THEME.dark.accent, THEME.dark[surface]),
      ).toBeGreaterThanOrEqual(NON_TEXT);
    }
  });
});

describe("type (NFR24)", () => {
  // The layout loads Geist; a leftover rule in globals.css overrode it
  // with Arial.
  it("does not override the site's typeface", () => {
    expect(css).not.toMatch(/Arial|Helvetica/);
    expect(css).toContain("--font-sans: var(--font-geist-sans);");
  });
});
