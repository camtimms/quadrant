// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DisagreementTable } from "@/components/film/DisagreementTable";
import type { MemberRating } from "@/components/film/RatingCards";
import { memberColours } from "@/lib/quadrant";

afterEach(cleanup);

function rating(
  displayName: string,
  quality: number,
  enjoyment: number,
  extra: Partial<MemberRating> = {},
): MemberRating {
  return {
    userId: `id-${displayName}`,
    displayName,
    avatarUrl: null,
    point: { quality, enjoyment },
    review: null,
    isViewer: false,
    ...extra,
  };
}

/** The viewer's own rating, at the centre of the chart. */
const me = rating("Cam", 5, 5, { isViewer: true });

/** The table row holding a friend's name. */
function rowOf(name: string): HTMLElement {
  return screen.getByRole("rowheader", { name: new RegExp(name) })
    .parentElement!;
}

/** The text of a friend's cells: quality, enjoyment, disagreement. */
function cellsOf(name: string): (string | null)[] {
  return within(rowOf(name))
    .getAllByRole("cell")
    .map((cell) => cell.textContent);
}

describe("DisagreementTable (R41)", () => {
  it("states each friend's scores and their disagreement with the viewer", () => {
    render(
      <DisagreementTable
        ratings={[me, rating("Bob", 2, 9), rating("Zoe", 6, 5)]}
      />,
    );

    // One header row and one row per friend. The viewer is not a row: they
    // cannot disagree with themselves.
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByRole("rowheader", { name: /Cam/ })).toBeNull();

    // Bob is 3 across and 4 up from 5/5: a 3-4-5 triangle.
    expect(cellsOf("Bob").slice(0, 2)).toEqual(["2", "9"]);
    expect(cellsOf("Bob")[2]).toContain("5");
    expect(cellsOf("Zoe").slice(0, 2)).toEqual(["6", "5"]);
    expect(cellsOf("Zoe")[2]).toContain("1");
  });

  it("rounds a disagreement to one decimal place", () => {
    // 1 across and 1 up is the square root of 2: 1.414...
    render(<DisagreementTable ratings={[me, rating("Bob", 6, 6)]} />);

    expect(cellsOf("Bob")[2]).toContain("1.4");
    expect(cellsOf("Bob")[2]).not.toContain("1.41");
  });

  it("marks the largest disagreement in words, and only that one", () => {
    render(
      <DisagreementTable
        ratings={[me, rating("Bob", 2, 9), rating("Zoe", 6, 5)]}
      />,
    );

    expect(cellsOf("Bob")[2]).toMatch(/biggest disagreement/i);
    expect(cellsOf("Zoe")[2]).not.toMatch(/biggest disagreement/i);
  });

  it("marks both friends when two are tied for the largest", () => {
    render(
      <DisagreementTable
        ratings={[me, rating("Bob", 2, 9), rating("Zoe", 8, 1)]}
      />,
    );

    expect(cellsOf("Bob")[2]).toMatch(/biggest disagreement/i);
    expect(cellsOf("Zoe")[2]).toMatch(/biggest disagreement/i);
  });

  // E13: identical scores are stated in words, not as a bare 0.
  it('reads "you agree exactly" for an identical rating', () => {
    render(
      <DisagreementTable
        ratings={[me, rating("Bob", 5, 5), rating("Zoe", 6, 5)]}
      />,
    );

    expect(cellsOf("Bob")[2]).toMatch(/you agree exactly/i);
    expect(cellsOf("Bob")[2]).not.toMatch(/biggest disagreement/i);
    expect(cellsOf("Zoe")[2]).toMatch(/biggest disagreement/i);
  });

  it("keeps the order it is given", () => {
    render(
      <DisagreementTable
        ratings={[me, rating("Zoe", 1, 1), rating("Al", 2, 2)]}
      />,
    );

    expect(
      screen.getAllByRole("rowheader").map((cell) => cell.textContent),
    ).toEqual(["Zoe", "Al"]);
  });

  // R46: a friend's name leads to their films.
  it("links each friend's name to their page", () => {
    render(<DisagreementTable ratings={[me, rating("Bob", 2, 9)]} />);

    expect(
      within(rowOf("Bob"))
        .getByRole("link", { name: "Bob" })
        .getAttribute("href"),
    ).toBe("/members/id-Bob");
  });

  // R40: with no rating of the viewer's own there is nothing to measure from.
  it("shows nothing when the viewer has not rated the film", () => {
    const { container } = render(
      <DisagreementTable
        ratings={[rating("Bob", 2, 9), rating("Zoe", 6, 5)]}
      />,
    );

    expect(container.textContent).toBe("");
  });

  // E11: nobody to disagree with.
  it("shows nothing when only the viewer has rated the film", () => {
    const { container } = render(<DisagreementTable ratings={[me]} />);

    expect(container.textContent).toBe("");
  });
});

// Q18 (design 17.7): a dot in the friend's spoke-map colour beside their
// name, so the table and the map can be matched. Decoration only: the name
// is the information.
describe("DisagreementTable colour dots (R67)", () => {
  it("puts a dot in each friend's map colour beside their name", () => {
    const bob = rating("Bob", 2, 9);
    const ann = rating("Ann", 8, 2);
    const colours = memberColours(me.userId, [bob.userId, ann.userId]);
    render(<DisagreementTable ratings={[me, bob, ann]} />);

    for (const friend of [bob, ann]) {
      const dot = rowOf(friend.displayName).querySelector("[data-colour-dot]")!;
      expect(dot.className).toContain(
        `bg-friend-${colours.get(friend.userId)}`,
      );
      expect(dot.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("uses only the theme's colours", () => {
    const { container } = render(
      <DisagreementTable ratings={[me, rating("Bob", 2, 9)]} />,
    );
    expect(container.innerHTML).not.toMatch(/foreground|background/);
  });
});

// R100: "From the average", matching the map.
describe("DisagreementTable from the group average (R100)", () => {
  // Cam 5/5, Bob 1/9, Zoe 9/7: the average is 5/7.
  const three = [me, rating("Bob", 1, 9), rating("Zoe", 9, 7)];

  it("lists every member, the viewer as You, with their distance from the average", () => {
    render(<DisagreementTable ratings={three} hub="average" />);
    expect(
      screen.getByRole("table", {
        name: /How far each member is from the group average/,
      }),
    ).toBeTruthy();
    expect(cellsOf("You")).toEqual(["5", "5", "2"]);
    expect(cellsOf("Bob")[2]).toMatch(/^4\.5/);
    expect(cellsOf("Zoe")).toEqual(["9", "7", "4"]);
  });

  it("marks the member furthest from the group, in words", () => {
    render(<DisagreementTable ratings={three} hub="average" />);
    expect(rowOf("Bob").textContent).toContain("Furthest from the group");
    expect(rowOf("Zoe").textContent).not.toContain("Furthest");
    expect(rowOf("You").textContent).not.toContain("Furthest");
  });

  // E86
  it('reads "Exactly the average" for a member at the average', () => {
    render(
      <DisagreementTable
        ratings={[
          rating("Cam", 4, 4, { isViewer: true }),
          rating("Bob", 6, 6),
          rating("Al", 5, 5),
        ]}
        hub="average"
      />,
    );
    expect(cellsOf("Al")[2]).toBe("Exactly the average");
  });

  it("is shown before the viewer has rated the film", () => {
    render(
      <DisagreementTable
        ratings={[rating("Bob", 1, 9), rating("Zoe", 9, 7)]}
        hub="average"
      />,
    );
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.queryByRole("rowheader", { name: /You/ })).toBeNull();
  });

  // E87
  it("shows nothing for a single rating", () => {
    const { container } = render(
      <DisagreementTable ratings={[me]} hub="average" />,
    );
    expect(container.innerHTML).toBe("");
  });
});
