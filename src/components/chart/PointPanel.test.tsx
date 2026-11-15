// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PointPanel } from "@/components/chart/PointPanel";
import type { ChartFilm } from "@/components/chart/QuadrantChart";
import type { FilmRater } from "@/components/film/RaterLines";

afterEach(cleanup);

function rater(
  displayName: string,
  quality: number,
  enjoyment: number,
  reviewStart: string | null = null,
): FilmRater {
  return {
    userId: `id-${displayName}`,
    displayName,
    avatarUrl: null,
    point: { quality, enjoyment },
    reviewStart,
  };
}

/** A film as My films or a member's page hands it over: one rating. */
const OWN: ChartFilm = {
  tmdbId: 10999,
  title: "Commando",
  year: 1985,
  posterPath: null,
  point: { quality: 3, enjoyment: 9 },
};

/** The same film as Friends' films hands it over: the group's view. */
const GROUP: ChartFilm = {
  ...OWN,
  point: { quality: 6, enjoyment: 8.5 },
  ratedBy: 2,
  disagreement: 6.08,
  raters: [rater("Zoe", 9, 8, "Flawless."), rater("Bob", 3, 9)],
};

const show = (films: ChartFilm[]) =>
  render(<PointPanel films={films} onClose={() => {}} />);

describe("PointPanel on Friends' films (R57, R58, R59)", () => {
  it("says how many members rated the film and their disagreement", () => {
    show([GROUP]);

    expect(screen.getByTestId("group-line").textContent).toBe(
      "Rated by 2 members · Biggest disagreement 6.1",
    );
  });

  it("lists who rated it, each with a name link and labelled scores", () => {
    show([GROUP]);

    const lines = screen.getAllByTestId("rater-line");
    expect(lines).toHaveLength(2);
    expect(
      within(lines[0]).getByRole("link", { name: "Zoe" }).getAttribute("href"),
    ).toBe("/members/id-Zoe");
    expect(within(lines[0]).getByTestId("rater-scores").textContent).toBe(
      "Quality 9 · Enjoyment 8",
    );
    expect(within(lines[1]).getByTestId("rater-scores").textContent).toBe(
      "Quality 3 · Enjoyment 9",
    );
  });

  it("shows the start of a review under its writer's line only", () => {
    show([GROUP]);

    const lines = screen.getAllByTestId("rater-line");
    expect(within(lines[0]).getByTestId("review-start").textContent).toBe(
      "Flawless.",
    );
    expect(within(lines[1]).queryByTestId("review-start")).toBeNull();
  });

  // A link inside a link is not valid HTML, and pressing a name would
  // also open the film.
  it("keeps the name links outside the film's own link", () => {
    show([GROUP]);

    // The link around the poster and title (the "Film page" button is a
    // second link with the film's name, so it is found by its title text).
    const filmLink = screen.getByText("Commando").closest("a")!;
    expect(filmLink.getAttribute("href")).toBe("/film/10999");
    expect(within(filmLink).queryByTestId("rater-line")).toBeNull();
    expect(filmLink.querySelector("a")).toBeNull();
  });

  it("has no 'and N more' when every rater is listed", () => {
    show([GROUP]);

    expect(screen.queryByTestId("more-raters")).toBeNull();
  });

  // R58, E29
  it("says 'and N more', linking to the film's page, when there are more", () => {
    show([{ ...GROUP, ratedBy: 6 }]);

    const more = screen.getByTestId("more-raters");
    expect(more.textContent).toBe("and 4 more on the film's page");
    expect(more.getAttribute("href")).toBe("/film/10999");
  });

  // A cluster: two films under one marker, each with its own raters.
  it("gives each film in a cluster its own raters", () => {
    show([
      GROUP,
      {
        ...GROUP,
        tmdbId: 2,
        title: "Heat",
        ratedBy: 1,
        disagreement: null,
        raters: [rater("Al", 9, 9)],
      },
    ]);

    const [commando, heat] = screen.getAllByRole("list", {
      name: /Who rated/,
    });
    expect(within(commando).getAllByTestId("rater-line")).toHaveLength(2);
    expect(within(heat).getAllByTestId("rater-line")).toHaveLength(1);
    expect(within(heat).getByRole("link").textContent).toBe("Al");
  });
});

// My films and a member's page pass films without the group fields.
describe("PointPanel on one member's chart", () => {
  it("shows none of the group lines", () => {
    show([OWN]);

    expect(screen.getByText("Commando")).toBeTruthy();
    expect(screen.queryByTestId("group-line")).toBeNull();
    expect(screen.queryByTestId("rater-line")).toBeNull();
    expect(screen.queryByTestId("more-raters")).toBeNull();
  });
});
