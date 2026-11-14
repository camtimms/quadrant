// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  RatingsTable,
  type MemberRating,
} from "@/components/film/RatingsTable";
import { PLACEMENT_LABELS } from "@/lib/quadrant";

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
    point: { quality, enjoyment },
    review: null,
    isViewer: false,
    ...extra,
  };
}

/** The table row holding a member's name. */
function rowOf(name: string): HTMLElement {
  return screen.getByRole("rowheader", { name: new RegExp(name) })
    .parentElement!;
}

describe("RatingsTable (R37)", () => {
  it("shows each member's name, both scores and placement", () => {
    render(
      <RatingsTable
        ratings={[rating("Bob", 3, 9), rating("Zoe", 9, 9), rating("Al", 8, 5)]}
      />,
    );

    // One header row and one row per member.
    expect(screen.getAllByRole("row")).toHaveLength(4);

    const bob = within(rowOf("Bob")).getAllByRole("cell");
    expect(bob.map((cell) => cell.textContent)).toEqual([
      "3",
      "9",
      PLACEMENT_LABELS["cheap-thrills"],
    ]);
    expect(within(rowOf("Zoe")).getAllByRole("cell")[2].textContent).toBe(
      PLACEMENT_LABELS.masterpieces,
    );
    // A score of exactly 5 puts the film on a line.
    expect(within(rowOf("Al")).getAllByRole("cell")[2].textContent).toBe(
      PLACEMENT_LABELS.good,
    );
  });

  // E14: 0 is a real score and must not be shown as blank.
  it("shows a score of 0 as 0", () => {
    render(<RatingsTable ratings={[rating("Bob", 0, 0)]} />);

    const cells = within(rowOf("Bob")).getAllByRole("cell");
    expect(cells[0].textContent).toBe("0");
    expect(cells[1].textContent).toBe("0");
  });

  it("keeps the order it is given", () => {
    render(
      <RatingsTable
        ratings={[rating("Zoe", 1, 1), rating("Al", 2, 2), rating("Bob", 3, 3)]}
      />,
    );

    expect(
      screen.getAllByRole("rowheader").map((cell) => cell.textContent),
    ).toEqual(["Zoe", "Al", "Bob"]);
  });

  it("marks the viewer's own rating", () => {
    render(
      <RatingsTable
        ratings={[rating("Cam", 5, 5, { isViewer: true }), rating("Bob", 3, 9)]}
      />,
    );

    expect(rowOf("Cam").textContent).toContain("(you)");
    expect(rowOf("Bob").textContent).not.toContain("(you)");
  });

  // R46: a friend's name leads to their films.
  it("links each friend's name to their page, but not the viewer's own", () => {
    render(
      <RatingsTable
        ratings={[rating("Cam", 5, 5, { isViewer: true }), rating("Bob", 3, 9)]}
      />,
    );

    expect(
      within(rowOf("Bob"))
        .getByRole("link", { name: "Bob" })
        .getAttribute("href"),
    ).toBe("/members/id-Bob");
    expect(within(rowOf("Cam")).queryByRole("link")).toBeNull();
  });

  it("links the name on a friend's review too", () => {
    render(
      <RatingsTable ratings={[rating("Bob", 3, 9, { review: "Fun." })]} />,
    );

    expect(
      within(screen.getByTestId("review"))
        .getByRole("link", { name: "Bob" })
        .getAttribute("href"),
    ).toBe("/members/id-Bob");
  });

  describe("reviews", () => {
    it("shows a review with the name of the member who wrote it", () => {
      render(
        <RatingsTable
          ratings={[
            rating("Bob", 3, 9, { review: "So bad it's good." }),
            rating("Zoe", 9, 9, { review: "Flawless." }),
          ]}
        />,
      );

      const reviews = screen.getAllByTestId("review");
      expect(reviews).toHaveLength(2);
      expect(reviews[0].textContent).toContain("Bob");
      expect(reviews[0].textContent).toContain("So bad it's good.");
      expect(reviews[1].textContent).toContain("Zoe");
      expect(reviews[1].textContent).toContain("Flawless.");
    });

    it("leaves out members who wrote none", () => {
      render(
        <RatingsTable
          ratings={[
            rating("Bob", 3, 9, { review: "So bad it's good." }),
            rating("Zoe", 9, 9),
          ]}
        />,
      );

      expect(screen.getAllByTestId("review")).toHaveLength(1);
    });

    it("has no reviews section when nobody wrote one", () => {
      render(<RatingsTable ratings={[rating("Bob", 3, 9)]} />);

      expect(screen.queryByText("Reviews")).toBeNull();
      expect(screen.queryAllByTestId("review")).toHaveLength(0);
    });

    // A review is text a member typed. It must come out as text.
    it("shows a review containing HTML as plain text", () => {
      render(
        <RatingsTable
          ratings={[rating("Bob", 3, 9, { review: "<b>bold</b> claim" })]}
        />,
      );

      const review = screen.getByTestId("review");
      expect(review.textContent).toContain("<b>bold</b> claim");
      expect(review.querySelector("b")).toBeNull();
    });
  });

  it("says so when nobody has rated the film", () => {
    render(<RatingsTable ratings={[]} />);

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/Nobody has rated this film yet/)).toBeTruthy();
  });
});
