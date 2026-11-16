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

  // NFR24, NFR14 (design 17.1): colours come only from the theme's named
  // tokens, whose contrast theme.test.ts measures. A fade of the text
  // colour ("text-foreground/70", "opacity-60"), a Tailwind palette colour
  // ("text-red-700") or a colour written out ("#fff") has a contrast that
  // nobody has checked against the new surfaces.
  //
  // Files written before the theme are listed below and are moved over in
  // T32a2–T32a4. The list may only shrink: a listed file that no longer
  // breaks the rule fails too, as a reminder to take it off.
  describe("colours come from the theme", () => {
    const UNTOKENED =
      /(?:foreground|background)\/\d+|(?<![\w:-])opacity-[1-9]\d*\b|\b(?:text|bg|border|fill|stroke)-(?:red|green|blue|gray|yellow|zinc|neutral|slate|white|black)(?:-\d+)?\b|#[0-9a-fA-F]{3,8}\b/;

    const NOT_YET_MOVED = [
      "src/app/(app)/film/[tmdbId]/loading.tsx",
      "src/app/(app)/film/[tmdbId]/page.tsx",
      "src/app/(app)/friends/page.tsx",
      "src/app/(app)/layout.tsx",
      "src/app/(app)/loading.tsx",
      "src/app/(app)/members/[id]/page.tsx",
      "src/app/(app)/page.tsx",
      "src/app/login/page.tsx",
      "src/app/welcome/page.tsx",
      "src/components/Avatar.tsx",
      "src/components/EmptyState.tsx",
      "src/components/Footer.tsx",
      "src/components/Nav.tsx",
      "src/components/PendingMark.tsx",
      "src/components/chart/PointPanel.tsx",
      "src/components/chart/QuadrantChart.tsx",
      "src/components/chart/SpokeMap.tsx",
      "src/components/film/DisagreementTable.tsx",
      "src/components/film/FilmCard.tsx",
      "src/components/film/FilmList.tsx",
      "src/components/film/FilmPageButton.tsx",
      "src/components/film/FilterChips.tsx",
      "src/components/film/GroupAverage.tsx",
      "src/components/film/MemberName.tsx",
      "src/components/film/PosterImage.tsx",
      "src/components/film/RaterLines.tsx",
      "src/components/film/RatingCards.tsx",
      "src/components/film/SearchBox.tsx",
      "src/components/film/SortLinks.tsx",
      "src/components/profile/DisplayNameForm.tsx",
      "src/components/rating/DeleteRatingButton.tsx",
      "src/components/rating/InlineRatingEditor.tsx",
      "src/components/rating/MyRatingSection.tsx",
      "src/components/rating/PlacementPreview.tsx",
      "src/components/rating/RatingForm.tsx",
      "src/components/rating/ScoreSlider.tsx",
    ];

    /** Lines that break the rule, ignoring links to a part of the page. */
    function untokened(text: string): string[] {
      return text
        .split("\n")
        .map((line) => line.replace(/["'`]#[\w-]*["'`]|href=\{?`[^`]*#/g, ""))
        .filter((line) => UNTOKENED.test(line));
    }

    it("is kept by every file not on the list", () => {
      const breaking = FILES.filter(
        ({ path }) => !NOT_YET_MOVED.includes(path),
      ).flatMap(({ path, text }) =>
        untokened(text).map((line) => `${path}: ${line.trim()}`),
      );
      expect(breaking).toEqual([]);
    });

    it("lists only files that still need moving", () => {
      const done = NOT_YET_MOVED.filter((path) => {
        const file = FILES.find((candidate) => candidate.path === path);
        return !file || untokened(file.text).length === 0;
      });
      expect(done).toEqual([]);
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
