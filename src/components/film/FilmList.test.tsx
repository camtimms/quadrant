// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FilmList, type ListFilm } from "@/components/film/FilmList";
import { FilterChips } from "@/components/film/FilterChips";
import {
  PLACEMENTS,
  PLACEMENT_LABELS,
  countByPlacement,
  type Placement,
} from "@/lib/quadrant";

afterEach(cleanup);

function film(
  tmdbId: number,
  title: string,
  quality: number,
  enjoyment: number,
  extra: Partial<ListFilm> = {},
): ListFilm {
  return {
    tmdbId,
    title,
    year: 1990,
    posterPath: null,
    point: { quality, enjoyment },
    ratedAt: "2026-11-14T10:00:00Z",
    ...extra,
  };
}

const FILMS = [
  film(949, "Heat", 9, 9),
  film(348, "Alien", 10, 8),
  film(10999, "Commando", 3, 9),
  film(1, "Fine", 5, 5),
];
const COUNTS = countByPlacement(FILMS.map((f) => f.point));

/** The chip for a placement, whether it is a link or greyed out. */
function chip(placement: Placement): HTMLElement {
  return document.querySelector(`[data-filter="${placement}"]`)!;
}

describe("FilterChips (R34)", () => {
  it("shows all thirteen placements, each with its count", () => {
    render(<FilterChips counts={COUNTS} active={null} basePath="/" />);

    for (const placement of PLACEMENTS) {
      const element = chip(placement);
      expect(element.textContent).toContain(PLACEMENT_LABELS[placement]);
      expect(element.textContent).toContain(String(COUNTS[placement]));
    }
    expect(chip("masterpieces").textContent).toContain("2");
    expect(chip("cheap-thrills").textContent).toContain("1");
    expect(chip("on-the-fence").textContent).toContain("1");
  });

  it("arranges them in three named rows: corners, inner bands, on a line", () => {
    render(<FilterChips counts={COUNTS} active={null} basePath="/" />);

    const rows = screen.getAllByRole("list");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      "Corners",
      "Inner bands",
      "On a line",
    ]);
    expect(
      rows.map((row) => within(row).getAllByRole("listitem").length),
    ).toEqual([4, 4, 5]);
    expect(rows[0].contains(chip("masterpieces"))).toBe(true);
    expect(rows[1].contains(chip("worth-watching"))).toBe(true);
    expect(rows[2].contains(chip("on-the-fence"))).toBe(true);
  });

  it("links each chip to the page with that filter in the address", () => {
    render(<FilterChips counts={COUNTS} active={null} basePath="/" />);
    expect(chip("masterpieces").getAttribute("href")).toBe(
      "/?filter=masterpieces",
    );
  });

  it("has an 'All' chip showing the total, which clears the filter", () => {
    render(<FilterChips counts={COUNTS} active="masterpieces" basePath="/" />);

    const all = screen.getByRole("link", { name: /All/ });
    expect(all.textContent).toContain("4");
    expect(all.getAttribute("href")).toBe("/");
  });

  // The thirteen counts and the total must tell one story.
  it("shows counts that add up to the total", () => {
    render(<FilterChips counts={COUNTS} active={null} basePath="/" />);
    const sum = PLACEMENTS.reduce(
      (total, placement) => total + COUNTS[placement],
      0,
    );
    expect(sum).toBe(FILMS.length);
    expect(screen.getByRole("link", { name: /All/ }).textContent).toContain(
      String(sum),
    );
  });

  it("greys out a placement with no films, and does not link it", () => {
    render(<FilterChips counts={COUNTS} active={null} basePath="/" />);

    const empty = chip("dumpster-fires");
    // Still shown, with its 0, so the row always has the same shape...
    expect(empty.textContent).toContain(PLACEMENT_LABELS["dumpster-fires"]);
    expect(empty.textContent).toContain("0");
    // ...but it is not a link: there is nothing there to go to.
    expect(empty.tagName).not.toBe("A");
    expect(empty.getAttribute("aria-disabled")).toBe("true");
    // A placement with films is a real link.
    expect(chip("masterpieces").tagName).toBe("A");
  });

  // Not by colour alone (NFR14): the chosen chip is marked for screen
  // readers too.
  it("marks the chosen chip", () => {
    render(<FilterChips counts={COUNTS} active="masterpieces" basePath="/" />);

    expect(chip("masterpieces").getAttribute("aria-current")).toBe("true");
    expect(chip("cheap-thrills").getAttribute("aria-current")).toBeNull();
    expect(
      screen.getByRole("link", { name: /All/ }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks 'All' when no filter is chosen", () => {
    render(<FilterChips counts={COUNTS} active={null} basePath="/" />);
    expect(
      screen.getByRole("link", { name: /All/ }).getAttribute("aria-current"),
    ).toBe("true");
  });

  it("keeps other settings in the address, and works on other pages", () => {
    render(
      <FilterChips
        counts={COUNTS}
        active={null}
        basePath="/friends"
        otherParams={{ sort: "disagreement" }}
      />,
    );
    expect(chip("masterpieces").getAttribute("href")).toBe(
      "/friends?sort=disagreement&filter=masterpieces",
    );
    expect(screen.getByRole("link", { name: /All/ }).getAttribute("href")).toBe(
      "/friends?sort=disagreement",
    );
  });
});

describe("FilmList (R33)", () => {
  it("shows each film's title, year, both scores and placement", () => {
    render(
      <FilmList films={[film(10999, "Commando", 3, 9, { year: 1985 })]} />,
    );

    const item = screen.getByRole("listitem");
    expect(item.textContent).toContain("Commando");
    expect(item.textContent).toContain("1985");
    expect(item.textContent).toContain("Quality 3");
    expect(item.textContent).toContain("Enjoyment 9");
    expect(item.textContent).toContain(PLACEMENT_LABELS["cheap-thrills"]);
  });

  it("shows the poster, named after the film (NFR15)", () => {
    render(
      <FilmList
        films={[film(10999, "Commando", 3, 9, { posterPath: "/abc.jpg" })]}
      />,
    );
    const poster = screen.getByRole("img", { name: "Commando" });
    expect(poster.getAttribute("src")).toContain("/abc.jpg");
  });

  it("links each film to its page", () => {
    render(<FilmList films={FILMS} />);
    expect(
      screen.getAllByRole("link").map((link) => link.getAttribute("href")),
    ).toEqual(["/film/949", "/film/348", "/film/10999", "/film/1"]);
  });

  // The list shows films in the order it is given. Putting the newest first
  // is done before it gets here (newestFirst in src/lib/filters.ts).
  it("keeps the order it is given", () => {
    render(<FilmList films={FILMS} />);
    expect(
      screen
        .getAllByRole("listitem")
        .map((item) => within(item).getByTestId("film-title").textContent),
    ).toEqual(["Heat", "Alien", "Commando", "Fine"]);
  });

  // E14: a 0 is a score and must be shown as one.
  it("shows a score of 0 as 0", () => {
    render(<FilmList films={[film(2, "Awful", 0, 0)]} />);
    const item = screen.getByRole("listitem");
    expect(item.textContent).toContain("Quality 0");
    expect(item.textContent).toContain("Enjoyment 0");
  });

  it("shows a group average to one decimal place", () => {
    render(<FilmList films={[film(3, "Shared", 6.3, 7)]} />);
    const item = screen.getByRole("listitem");
    expect(item.textContent).toContain("Quality 6.3");
    expect(item.textContent).toContain("Enjoyment 7");
  });

  it('says "Year unknown" when there is no year', () => {
    render(<FilmList films={[film(4, "Mystery", 6, 6, { year: null })]} />);
    expect(screen.getByRole("listitem").textContent).toContain("Year unknown");
  });

  it("says so, in words, when there are no films to list", () => {
    render(<FilmList films={[]} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText(/no films/i)).toBeTruthy();
  });
});
