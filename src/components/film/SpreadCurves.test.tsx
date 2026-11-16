// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SpreadCurves } from "@/components/film/SpreadCurves";
import { describeSpread, type Point } from "@/lib/quadrant";

// R73, R74, E55, E56 (design 21.1): the spread curves on a film's page.

afterEach(cleanup);

const points = (pairs: [number, number][]): Point[] =>
  pairs.map(([quality, enjoyment]) => ({ quality, enjoyment }));

const FIVE = points([
  [4, 6],
  [6, 6],
  [6, 7],
  [7, 9],
  [9, 4],
]);

describe("SpreadCurves", () => {
  // E55, the owner's threshold.
  it("shows nothing below five ratings", () => {
    const { container } = render(<SpreadCurves points={FIVE.slice(0, 4)} />);
    expect(container.innerHTML).toBe("");
  });

  it("says each scale's spread in words (R74)", () => {
    render(<SpreadCurves points={FIVE} />);
    const qualities = FIVE.map((point) => point.quality);
    const enjoyments = FIVE.map((point) => point.enjoyment);
    expect(screen.getByText(describeSpread("Quality", qualities))).toBeTruthy();
    expect(
      screen.getByText(describeSpread("Enjoyment", enjoyments)),
    ).toBeTruthy();
  });

  it("draws a curve for each scale, hidden from screen readers", () => {
    const { container } = render(<SpreadCurves points={FIVE} />);
    for (const scale of ["quality", "enjoyment"]) {
      const curve = container.querySelector(`[data-curve="${scale}"]`)!;
      expect(curve).toBeTruthy();
      expect(curve.closest("svg")!.getAttribute("aria-hidden")).toBe("true");
    }
  });

  // R73: every member's score is marked; members on the same score share
  // one mark with a count.
  it("marks every score, sharing a mark for equal scores", () => {
    const { container } = render(<SpreadCurves points={FIVE} />);
    const dots = [
      ...container.querySelectorAll('[data-scale="quality"] [data-dot]'),
    ].map((dot) => [
      dot.getAttribute("data-dot"),
      dot.getAttribute("data-count"),
    ]);
    expect(dots).toEqual([
      ["4", "1"],
      ["6", "2"],
      ["7", "1"],
      ["9", "1"],
    ]);
  });

  // E56: everyone gave the same Quality, but Enjoyment still varies.
  it("says so in words instead of a curve when everyone agrees", () => {
    const agreed = points([
      [7, 2],
      [7, 5],
      [7, 6],
      [7, 8],
      [7, 9],
    ]);
    const { container } = render(<SpreadCurves points={agreed} />);
    expect(screen.getByText("Everyone gave Quality 7")).toBeTruthy();
    expect(container.querySelector('[data-curve="quality"]')).toBeNull();
    expect(container.querySelector('[data-curve="enjoyment"]')).toBeTruthy();
  });

  it("draws only in the theme's colours", () => {
    const { container } = render(<SpreadCurves points={FIVE} />);
    expect(container.innerHTML).not.toMatch(
      /foreground|background|#[0-9a-f]{3}/i,
    );
  });
});
