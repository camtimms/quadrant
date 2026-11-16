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

  describe("after a save (R23, v7)", () => {
    const SAVED_AT = "2026-11-16T10:00:00+00:00";

    it("says 'Saved' on the closed line, as an announced status", () => {
      render(
        <MyRatingSection
          rating={{ quality: 8, enjoyment: 5 }}
          changedAt={SAVED_AT}
          justSaved
        >
          <p>the form</p>
        </MyRatingSection>,
      );

      expect(details().open).toBe(false);
      // role="status" is what makes a screen reader read it out.
      const status = screen.getByRole("status");
      expect(status.textContent).toBe("Saved");
      expect(summary().contains(status)).toBe(true);
      // The saved scores and where they landed, on the same line.
      expect(summary().textContent).toContain("Quality 8");
      expect(summary().textContent).toContain(PLACEMENT_LABELS.good);
    });

    it("says nothing about saving when the page was simply opened", () => {
      render(
        <MyRatingSection
          rating={{ quality: 8, enjoyment: 5 }}
          changedAt={SAVED_AT}
        >
          <p>the form</p>
        </MyRatingSection>,
      );

      expect(screen.queryByRole("status")).toBeNull();
      expect(summary().textContent).not.toContain("Saved");
    });

    // Coming back to the same page keeps React's elements, an open
    // <details> included, unless the key changes. Every save stamps a new
    // time, even one that changes nothing, so every save closes it.
    it("closes again after a save, even when the scores did not change", () => {
      const { rerender } = render(
        <MyRatingSection
          rating={{ quality: 8, enjoyment: 5 }}
          changedAt={SAVED_AT}
        >
          <p>the form</p>
        </MyRatingSection>,
      );
      fireEvent.click(summary());
      expect(details().open).toBe(true);

      rerender(
        <MyRatingSection
          rating={{ quality: 8, enjoyment: 5 }}
          changedAt="2026-11-16T10:05:00+00:00"
          justSaved
        >
          <p>the form</p>
        </MyRatingSection>,
      );
      expect(details().open).toBe(false);
    });

    // Not every re-render is a save: one with the same stamp leaves the
    // section as the member left it.
    it("stays open when redrawn without a new save", () => {
      const { rerender } = render(
        <MyRatingSection
          rating={{ quality: 8, enjoyment: 5 }}
          changedAt={SAVED_AT}
        >
          <p>the form</p>
        </MyRatingSection>,
      );
      fireEvent.click(summary());

      rerender(
        <MyRatingSection
          rating={{ quality: 8, enjoyment: 5 }}
          changedAt={SAVED_AT}
        >
          <p>the form</p>
        </MyRatingSection>,
      );
      expect(details().open).toBe(true);
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

describe("MyRatingSection: times watched (R84)", () => {
  it("says how many times on the closed line", () => {
    render(
      <MyRatingSection rating={{ quality: 3, enjoyment: 9 }} timesWatched={4}>
        <p>the form</p>
      </MyRatingSection>,
    );
    expect(summary().textContent).toContain("Watched 4 times");
  });

  it("says nothing for a first watch", () => {
    render(
      <MyRatingSection rating={{ quality: 3, enjoyment: 9 }} timesWatched={1}>
        <p>the form</p>
      </MyRatingSection>,
    );
    expect(summary().textContent).not.toContain("Watched");
  });
});
