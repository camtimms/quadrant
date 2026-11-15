// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DisagreementTable } from "@/components/film/DisagreementTable";
import type { MemberRating } from "@/components/film/RatingCards";

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
