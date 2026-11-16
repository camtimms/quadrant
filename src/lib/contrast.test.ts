import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  blend,
  contrastRatio,
  FIELD_BORDER_OPACITY,
  MIN_TEXT_OPACITY,
  THEMES,
} from "@/lib/contrast";

// WCAG AA (NFR14): 4.5 for normal text, 3 for the edge of a control such
// as a text box (success criterion 1.4.11).
const TEXT_AA = 4.5;
const CONTROL_EDGE = 3;

describe("contrastRatio (WCAG 2)", () => {
  it("is 21 for black on white, the largest possible", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("is 1 for a colour against itself", () => {
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("does not care which colour is the text", () => {
    expect(contrastRatio("#171717", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#171717"),
      10,
    );
  });

  // A published pair: #767676 on white is the classic "just passes AA".
  it("matches a known value", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});

describe("blend", () => {
  it("gives the colour itself at full strength and the background at none", () => {
    expect(blend("#171717", "#ffffff", 1)).toBe("#171717");
    expect(blend("#171717", "#ffffff", 0)).toBe("#ffffff");
  });

  it("mixes in proportion", () => {
    // Half of black over white is mid-grey (127.5 rounds to 128 = 0x80).
    expect(blend("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("the site's colours (NFR14)", () => {
  // The two colours are defined in globals.css; this keeps the copy used
  // for checking in step with them.
  it("match globals.css", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    for (const theme of Object.values(THEMES)) {
      expect(css).toContain(`--background: ${theme.background};`);
      expect(css).toContain(`--foreground: ${theme.foreground};`);
    }
  });

  describe.each(Object.entries(THEMES))("in %s mode", (_, theme) => {
    it("makes full-strength text readable", () => {
      expect(
        contrastRatio(theme.foreground, theme.background),
      ).toBeGreaterThanOrEqual(TEXT_AA);
    });

    // Dimmed text ("opacity-60" and up) is used for secondary lines.
    it("keeps the faintest text allowed readable", () => {
      const faint = blend(theme.foreground, theme.background, MIN_TEXT_OPACITY);
      expect(contrastRatio(faint, theme.background)).toBeGreaterThanOrEqual(
        TEXT_AA,
      );
    });

    it("gives text boxes an edge that can be seen", () => {
      const edge = blend(
        theme.foreground,
        theme.background,
        FIELD_BORDER_OPACITY,
      );
      expect(contrastRatio(edge, theme.background)).toBeGreaterThanOrEqual(
        CONTROL_EDGE,
      );
    });

    it("keeps error messages readable", () => {
      expect(
        contrastRatio(theme.errorText, theme.background),
      ).toBeGreaterThanOrEqual(TEXT_AA);
    });
  });
});
