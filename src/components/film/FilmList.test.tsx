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
    const rows = screen.getAllByRole("listitem");
    // The first link in each row is the row itself.
    expect(
      rows.map((row) =>
        within(row).getAllByRole("link")[0].getAttribute("href"),
      ),
    ).toEqual(["/film/949", "/film/348", "/film/10999", "/film/1"]);
  });

  // R55: a visible button to the film's page, as well as the row.
  describe("the Film page button", () => {
    it("is on every film, and goes to that film's page", () => {
      render(<FilmList films={FILMS} />);
      for (const [index, row] of screen.getAllByRole("listitem").entries()) {
        const button = within(row).getByRole("link", {
          name: `Film page for ${FILMS[index].title}`,
        });
        expect(button.getAttribute("href")).toBe(
          `/film/${FILMS[index].tmdbId}`,
        );
        expect(button.textContent).toContain("Film page");
      }
    });

    // A link inside a link is invalid HTML and behaves unpredictably.
    it("sits outside the row's own link", () => {
      render(<FilmList films={[FILMS[0]]} />);
      const [rowLink, button] = within(
        screen.getByRole("listitem"),
      ).getAllByRole("link");
      expect(rowLink.contains(button)).toBe(false);
    });

    it("sits beside 'Update scores' on the member's own list", () => {
      render(<FilmList films={[FILMS[0]]} editReturnTo="/" />);
      const button = screen.getByRole("link", { name: /Film page for/ });
      const update = screen.getByRole("button", { name: /update scores/i });
      // Side by side: the same parent holds both.
      expect(button.parentElement).toBe(update.parentElement);
    });

    it("is there without 'Update scores' on a list that is not the member's own", () => {
      render(<FilmList films={[FILMS[0]]} />);
      expect(screen.getByRole("link", { name: /Film page for/ })).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: /update scores/i }),
      ).toBeNull();
    });
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

// On Friends' films each row is a film as the group sees it (R44, R45).
describe("FilmList on a group list", () => {
  const groupLine = () => screen.getByTestId("group-line").textContent;

  it("says how many members rated the film and their biggest disagreement", () => {
    render(
      <FilmList
        films={[film(1, "Shared", 6.3, 7, { ratedBy: 3, disagreement: 5 })]}
      />,
    );

    expect(groupLine()).toContain("Rated by 3 members");
    expect(groupLine()).toContain("Biggest disagreement 5");
  });

  it("rounds the disagreement to one decimal place", () => {
    render(
      <FilmList
        films={[
          film(1, "Shared", 6, 6, { ratedBy: 2, disagreement: Math.SQRT2 }),
        ]}
      />,
    );

    expect(groupLine()).toContain("Biggest disagreement 1.4");
    expect(groupLine()).not.toContain("1.41");
  });

  // R45: one rating has no disagreement. It is left out, never shown as 0.
  it("shows no disagreement for a film one member has rated", () => {
    render(
      <FilmList
        films={[film(1, "Solo", 3, 9, { ratedBy: 1, disagreement: null })]}
      />,
    );

    expect(groupLine()).toContain("Rated by 1 member");
    expect(groupLine()).not.toContain("members");
    expect(groupLine()).not.toMatch(/disagreement/i);
  });

  // 0 is a real answer: two or more members who agree exactly.
  it("shows a disagreement of 0 as 0", () => {
    render(
      <FilmList
        films={[film(1, "Agreed", 7, 7, { ratedBy: 2, disagreement: 0 })]}
      />,
    );

    expect(groupLine()).toContain("Biggest disagreement 0");
  });

  it("has no such line on a member's own list", () => {
    render(<FilmList films={[film(1, "Mine", 7, 7)]} />);

    expect(screen.queryByTestId("group-line")).toBeNull();
  });
});
