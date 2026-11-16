import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as rowLayout from "@/components/film/rowLayout";
import * as sharedStyles from "@/components/ui/styles";

/**
 * Guards for the accessibility rules that can be read straight from the
 * source (NFR14, NFR15). They catch a new component that quietly breaks a
 * rule the rest of the site keeps. What a rule is for is in contrast.ts.
 */

/**
 * Every .tsx file under src, plus the .ts files among the components
 * (shared class strings such as rowLayout.ts and ui/styles.ts), tests
 * excluded, with their text.
 */
function components(dir = "src"): { path: string; text: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) return components(path);
    const isComponent =
      path.endsWith(".tsx") ||
      (path.startsWith("src/components/") && path.endsWith(".ts"));
    return isComponent && !/\.test\.tsx?$/.test(path)
      ? [{ path, text: readFileSync(path, "utf8") }]
      : [];
  });
}

const FILES = components();

describe("source accessibility rules", () => {
  it("finds the components to check", () => {
    expect(FILES.length).toBeGreaterThan(30);
  });

  // NFR24, NFR14 (design 17.1): colours come only from the theme's named
  // tokens, whose contrast theme.test.ts measures. A fade of the text
  // colour ("text-foreground/70", "opacity-60"), a Tailwind palette colour
  // ("text-red-700") or a colour written out ("#fff") has a contrast that
  // nobody has checked against the new surfaces.
  // (T32a1–T32a5 moved every file written before the theme over to it; the
  // old --foreground and --background are gone from globals.css.)
  describe("colours come from the theme", () => {
    const UNTOKENED =
      /(?:foreground|background)\/\d+|(?:bg|text|border|fill|stroke|outline|ring|ring-offset|divide|decoration|accent)-(?:foreground|background)|(?<![\w:-])opacity-(?!100\b)[1-9]\d*\b|\b(?:text|bg|border|fill|stroke)-(?:red|green|blue|gray|yellow|zinc|neutral|slate|white|black)(?:-\d+)?\b|#[0-9a-fA-F]{3,8}\b/;

    /** Lines that break the rule, ignoring links to a part of the page. */
    function untokened(text: string): string[] {
      return text
        .split("\n")
        .map((line) => line.replace(/["'`]#[\w-]*["'`]|href=\{?`[^`]*#/g, ""))
        .filter((line) => UNTOKENED.test(line));
    }

    it("is kept by every component", () => {
      const breaking = FILES.flatMap(({ path, text }) =>
        untokened(text).map((line) => `${path}: ${line.trim()}`),
      );
      expect(breaking).toEqual([]);
    });
  });

  // NFR15: an image either describes itself or says it is decoration.
  it("gives every image an alt attribute", () => {
    const missing = FILES.flatMap(({ path, text }) =>
      // Up to the tag's "/>": a plain ">" can appear inside the tag, in an
      // arrow function such as onError={() => …}.
      [...text.matchAll(/<img\b[\s\S]*?\/>/g)]
        .filter(([tag]) => !/\balt=/.test(tag))
        .map(([tag]) => `${path}: ${tag}`),
    );
    expect(missing).toEqual([]);
  });

  // Keyboard users must see where they are (NFR12). Every link and button
  // with its own classes draws a focus ring: written out, or through a
  // shared class string that includes one (ui/styles.ts, film/rowLayout.ts),
  // used as className={buttonMain} or inside a template as ${buttonMain}.
  it("draws a focus ring on every styled link and button", () => {
    const stylesWithRing = Object.entries({ ...sharedStyles, ...rowLayout })
      .filter(([, classes]) => classes.includes("focus-visible:"))
      .map(([name]) => name);
    const hasRing = (classes: string) =>
      classes.includes("focus-visible:") ||
      stylesWithRing.some(
        (name) => classes === `{${name}}` || classes.includes(`\${${name}}`),
      );
    const missing = FILES.flatMap(({ path, text }) =>
      [
        ...text.matchAll(
          /<(Link|button|a|summary)\b[^>]*?className=("[^"]*"|\{`[^`]*`\}|\{\w+\})/g,
        ),
      ]
        .filter(([, , classes]) => !hasRing(classes))
        .map(([tag]) => `${path}: ${tag.replace(/\s+/g, " ").slice(0, 80)}`),
    );
    expect(missing).toEqual([]);
  });
});
