import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIELD_BORDER_OPACITY, MIN_TEXT_OPACITY } from "@/lib/contrast";

/**
 * Guards for the accessibility rules that can be read straight from the
 * source (NFR14, NFR15). They catch a new component that quietly breaks a
 * rule the rest of the site keeps. What a rule is for is in contrast.ts.
 */

/** Every .tsx file under src, tests excluded, with its text. */
function components(dir = "src"): { path: string; text: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) return components(path);
    return /\.tsx$/.test(path) && !/\.test\.tsx$/.test(path)
      ? [{ path, text: readFileSync(path, "utf8") }]
      : [];
  });
}

const FILES = components();

/** Each line in the files that matches, as "path: line". */
function offenders(pattern: RegExp): string[] {
  return FILES.flatMap(({ path, text }) =>
    text
      .split("\n")
      .filter((line) => pattern.test(line))
      .map((line) => `${path}: ${line.trim()}`),
  );
}

describe("source accessibility rules", () => {
  it("finds the components to check", () => {
    expect(FILES.length).toBeGreaterThan(30);
  });

  // NFR14. "opacity-50" on its own dims text for good. With a prefix such
  // as "active:" or "hover:" it is only a moment's pressed look, and
  // "opacity-0" hides something completely; neither is text to read.
  it("dims nothing below the faintest readable text", () => {
    const minimum = MIN_TEXT_OPACITY * 100;
    const tooFaint = offenders(/(?<![\w:-])opacity-(\d+)\b/).filter((line) =>
      [...line.matchAll(/(?<![\w:-])opacity-(\d+)\b/g)].some(([, value]) => {
        const percent = Number(value);
        return percent !== 0 && percent < minimum;
      }),
    );
    expect(tooFaint).toEqual([]);
  });

  // WCAG 1.4.11: a text box's edge is how it is found on the page.
  // Text boxes are the elements with a transparent background.
  it("gives every text box a visible edge", () => {
    const minimum = FIELD_BORDER_OPACITY * 100;
    const faintEdges = offenders(/bg-transparent/).filter((line) =>
      [...line.matchAll(/border-foreground\/(\d+)/g)].some(
        ([, value]) => Number(value) < minimum,
      ),
    );
    expect(faintEdges).toEqual([]);
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
  // with its own classes draws a focus ring.
  it("draws a focus ring on every styled link and button", () => {
    const missing = FILES.flatMap(({ path, text }) =>
      [
        ...text.matchAll(
          /<(Link|button|a|summary)\b[^>]*?className=("[^"]*"|\{`[^`]*`\})/g,
        ),
      ]
        .filter(([, , classes]) => !classes.includes("focus-visible:"))
        .map(([tag]) => `${path}: ${tag.replace(/\s+/g, " ").slice(0, 80)}`),
    );
    expect(missing).toEqual([]);
  });
});
