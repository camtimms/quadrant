import { describe, expect, it } from "vitest";
import * as styles from "@/components/ui/styles";

// The shared class strings (design 17.2). These are the rules every page
// that uses them inherits, so they are checked once, here.

const all = Object.entries(styles) as [string, string][];

/** Styles for things that can be pressed or typed in. */
const INTERACTIVE = [
  "pill",
  "pillCurrent",
  "buttonMain",
  "buttonSecondary",
  "buttonDanger",
  "textField",
  "textLink",
];

describe("shared styles", () => {
  it("exports the styles the design names", () => {
    expect(Object.keys(styles).sort()).toEqual(
      [...INTERACTIVE, "card", "errorText", "focusRing", "mutedText"].sort(),
    );
  });

  // NFR12: keyboard users must see where they are; the ring uses the
  // theme's focus colour, measured in theme.test.ts.
  it.each(INTERACTIVE)("%s shows a focus ring", (name) => {
    expect(styles[name as keyof typeof styles]).toContain(styles.focusRing);
  });

  it("draws the focus ring in the theme's focus colour", () => {
    expect(styles.focusRing).toContain("focus-visible:outline-focus");
  });

  // Design 17.1: only the theme's own colours, so their contrast is known.
  it.each(all)("%s uses only theme colours", (_, classes) => {
    expect(classes).not.toMatch(
      /(?:foreground|background)\/\d+|\b(?:text|bg|border)-(?:red|gray|white|black)/,
    );
  });

  it("puts text on yellow in the theme's on-yellow colour", () => {
    for (const name of ["pillCurrent", "buttonMain"] as const) {
      expect(styles[name]).toContain("bg-accent");
      expect(styles[name]).toContain("text-on-accent");
    }
  });

  // NFR24, NFR14: in light mode yellow is barely visible on cream, so
  // something marked only by yellow also gets the dark outline.
  it("outlines the current page's pill", () => {
    expect(styles.pillCurrent).toContain("ring-accent-outline");
  });

  it("gives text boxes an edge that can be seen", () => {
    expect(styles.textField).toContain("border-edge");
  });

  it("writes errors in the theme's danger colour", () => {
    expect(styles.errorText).toContain("text-danger");
    expect(styles.buttonDanger).toContain("text-danger");
  });
});
