// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MyRatingSection } from "@/components/rating/MyRatingSection";
import { PLACEMENT_LABELS } from "@/lib/quadrant";

afterEach(cleanup);

/** The <details> element: the part that opens and closes. */
function details(): HTMLDetailsElement {
  return document.querySelector("details")!;
}

/** The always-visible line that is pressed to open or close it. */
function summary(): HTMLElement {
  return document.querySelector("summary")!;
}

describe("MyRatingSection (R56)", () => {
  describe("a film the member has rated", () => {
    it("starts closed, so the form does not fill the screen", () => {
      render(
        <MyRatingSection rating={{ quality: 3, enjoyment: 9 }}>
          <p>the form</p>
        </MyRatingSection>,
      );

      expect(details().open).toBe(false);
    });

    it("states the scores and the placement on the closed line", () => {
      render(
        <MyRatingSection rating={{ quality: 3, enjoyment: 9 }}>
          <p>the form</p>
        </MyRatingSection>,
      );

      expect(screen.getByRole("heading", { name: "Your rating" })).toBeTruthy();
      const line = summary().textContent;
      expect(line).toContain("Quality 3");
      expect(line).toContain("Enjoyment 9");
      expect(line).toContain(PLACEMENT_LABELS["cheap-thrills"]);
    });

    // E14: 0 is a real score.
    it("shows scores of 0", () => {
      render(
        <MyRatingSection rating={{ quality: 0, enjoyment: 0 }}>
          <p>the form</p>
        </MyRatingSection>,
      );

      expect(summary().textContent).toContain("Quality 0");
      expect(summary().textContent).toContain("Enjoyment 0");
    });

    it("keeps the form inside, ready to be opened", () => {
      render(
        <MyRatingSection rating={{ quality: 3, enjoyment: 9 }}>
          <p>the form</p>
        </MyRatingSection>,
      );

      // In the page but inside the closed part, not on the summary line.
      const form = screen.getByText("the form");
      expect(details().contains(form)).toBe(true);
      expect(summary().contains(form)).toBe(false);
    });

    it("opens when the line is pressed, and closes when pressed again", () => {
      render(
        <MyRatingSection rating={{ quality: 3, enjoyment: 9 }}>
          <p>the form</p>
        </MyRatingSection>,
      );

      fireEvent.click(summary());
      expect(details().open).toBe(true);
      fireEvent.click(summary());
      expect(details().open).toBe(false);
    });
  });

  describe("a film the member has not rated", () => {
    it("starts open, under 'Rate this film'", () => {
      render(
        <MyRatingSection rating={null}>
          <p>the form</p>
        </MyRatingSection>,
      );

      expect(details().open).toBe(true);
      expect(
        screen.getByRole("heading", { name: "Rate this film" }),
      ).toBeTruthy();
    });

    it("shows no scores on the line, because there are none", () => {
      render(
        <MyRatingSection rating={null}>
          <p>the form</p>
        </MyRatingSection>,
      );

      expect(summary().textContent).not.toContain("Quality");
    });
  });

  // After a delete the page re-renders the same section with no rating.
  it("opens by itself when the rating is removed", () => {
    const { rerender } = render(
      <MyRatingSection rating={{ quality: 3, enjoyment: 9 }}>
        <p>the form</p>
      </MyRatingSection>,
    );
    expect(details().open).toBe(false);

    rerender(
      <MyRatingSection rating={null}>
        <p>the form</p>
      </MyRatingSection>,
    );
    expect(details().open).toBe(true);
  });
});
