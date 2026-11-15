// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  GroupLine,
  RaterLines,
  type FilmRater,
} from "@/components/film/RaterLines";

afterEach(cleanup);

const GOOGLE = "https://lh3.googleusercontent.com/a/abc123=s96-c";

function rater(
  displayName: string,
  quality: number,
  enjoyment: number,
  extra: Partial<FilmRater> = {},
): FilmRater {
  return {
    userId: `id-${displayName}`,
    displayName,
    avatarUrl: null,
    point: { quality, enjoyment },
    reviewStart: null,
    ...extra,
  };
}

/** Draw the lines for film 10999, "Commando". */
function show(raters: FilmRater[], ratedBy = raters.length) {
  render(
    <RaterLines
      raters={raters}
      ratedBy={ratedBy}
      tmdbId={10999}
      title="Commando"
    />,
  );
}

const lines = () => screen.getAllByTestId("rater-line");

describe("RaterLines (R57, R58, R59)", () => {
  it("shows one line per rater, in the order given", () => {
    show([rater("Zoe", 9, 9), rater("Al", 2, 2), rater("Bob", 3, 9)]);

    expect(
      lines().map((line) => within(line).getByRole("link").textContent),
    ).toEqual(["Zoe", "Al", "Bob"]);
  });

  it("links each name to that member's films", () => {
    show([rater("Bob", 3, 9)]);

    expect(
      within(lines()[0])
        .getByRole("link", { name: "Bob" })
        .getAttribute("href"),
    ).toBe("/members/id-Bob");
  });

  it("shows the member's own two scores, each with its label", () => {
    show([rater("Bob", 3, 9)]);

    expect(within(lines()[0]).getByTestId("rater-scores").textContent).toBe(
      "Quality 3 · Enjoyment 9",
    );
  });

  // E14: 0 is a real score.
  it("shows a score of 0 as 0", () => {
    show([rater("Bob", 0, 0)]);

    expect(within(lines()[0]).getByTestId("rater-scores").textContent).toBe(
      "Quality 0 · Enjoyment 0",
    );
  });

  // R61
  it("shows each rater's picture, or their initial when they have none", () => {
    show([rater("Bob", 3, 9, { avatarUrl: GOOGLE }), rater("zoe", 9, 9)]);

    const [bob, zoe] = lines().map((line) =>
      within(line).getByTestId("avatar"),
    );
    expect(bob.querySelector("img")?.getAttribute("src")).toBe(GOOGLE);
    expect(zoe.querySelector("img")).toBeNull();
    expect(zoe.textContent).toBe("Z");
  });

  // R57: "without table lines".
  it("is a plain list, not a table", () => {
    show([rater("Bob", 3, 9), rater("Zoe", 9, 9)]);

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  describe("the start of a review (R59, E31)", () => {
    it("is shown under the line of the member who wrote it", () => {
      show([
        rater("Bob", 3, 9, { reviewStart: "So bad it's good." }),
        rater("Zoe", 9, 9),
      ]);

      expect(within(lines()[0]).getByTestId("review-start").textContent).toBe(
        "So bad it's good.",
      );
      expect(within(lines()[1]).queryByTestId("review-start")).toBeNull();
    });

    // The test browser has no screen, so "three lines" is pinned by the
    // class that does the cutting.
    it("is limited to three lines", () => {
      show([rater("Bob", 3, 9, { reviewStart: "word ".repeat(40) })]);

      expect(screen.getByTestId("review-start").className).toContain(
        "line-clamp-3",
      );
    });

    it("shows HTML in a review as plain text", () => {
      show([rater("Bob", 3, 9, { reviewStart: "<b>bold</b> claim" })]);

      const review = screen.getByTestId("review-start");
      expect(review.textContent).toBe("<b>bold</b> claim");
      expect(review.querySelector("b")).toBeNull();
    });
  });

  describe("'and N more' (R58, E29)", () => {
    it("says how many more members rated the film, linking to its page", () => {
      show([rater("Al", 1, 1), rater("Bob", 3, 9), rater("Zoe", 9, 9)], 7);

      const more = screen.getByTestId("more-raters");
      expect(more.textContent).toBe("and 4 more on the film's page");
      expect(more.getAttribute("href")).toBe("/film/10999");
    });

    it("is absent when every rater is shown", () => {
      show([rater("Al", 1, 1), rater("Bob", 3, 9), rater("Zoe", 9, 9)], 3);

      expect(screen.queryByTestId("more-raters")).toBeNull();
    });
  });

  it("shows nothing when it is given no raters", () => {
    show([], 0);

    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("GroupLine (R44, R45, R57)", () => {
  const text = () => screen.getByTestId("group-line").textContent;

  it("says how many members rated the film and their disagreement", () => {
    render(<GroupLine ratedBy={3} disagreement={7.07} />);

    expect(text()).toBe("Rated by 3 members · Biggest disagreement 7.1");
  });

  // R45: one rating is nobody disagreeing, which is not the same as 0.
  it("leaves the disagreement out when only one member has rated it", () => {
    render(<GroupLine ratedBy={1} disagreement={null} />);

    expect(text()).toBe("Rated by 1 member");
  });

  it("shows a disagreement of exactly 0", () => {
    render(<GroupLine ratedBy={2} disagreement={0} />);

    expect(text()).toBe("Rated by 2 members · Biggest disagreement 0");
  });
});
