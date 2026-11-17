// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NO_FILTER, type FilmFilter } from "@/lib/filters";
import { countByPlacement, type Point } from "@/lib/quadrant";
import { FilterChips } from "./FilterChips";

afterEach(cleanup);

// Nine films: two Masterpieces, one Worth Watching, one Good (top right
// AND bottom right), one Guilty Pleasure, one Serious Watch, two On the
// fence, and nothing in the bottom left.
const POINTS: Point[] = [
  { quality: 9, enjoyment: 9 },
  { quality: 10, enjoyment: 8 },
  { quality: 6, enjoyment: 6 },
  { quality: 8, enjoyment: 5 },
  { quality: 1, enjoyment: 9 },
  { quality: 9, enjoyment: 1 },
  { quality: 5, enjoyment: 5 },
  { quality: 5, enjoyment: 5 },
];
const COUNTS = countByPlacement(POINTS);

function show(active: FilmFilter = NO_FILTER) {
  render(
    <FilterChips
      counts={COUNTS}
      active={active}
      basePath="/friends"
      otherParams={{ sort: "disagreement" }}
    />,
  );
}

const row = (name: string) => screen.getByRole("list", { name });
const chip = (name: RegExp) => screen.getByRole("link", { name });
const chipText = (list: HTMLElement) =>
  within(list)
    .getAllByRole("listitem")
    .map((item) => item.textContent?.replace(/\s+/g, " ").trim());

describe("FilterChips (R88)", () => {
  it("shows All, the four quadrants by their corners, and On the fence", () => {
    show();
    expect(chipText(row("Quadrants"))).toEqual([
      "All 8",
      "Masterpieces 4",
      "Guilty Pleasures 1",
      "Serious Watches 2",
      "Dumpster Fires 0",
      "On the fence 2",
    ]);
  });

  it("shows no finer chips until a quadrant is chosen", () => {
    show();
    expect(screen.getAllByRole("list")).toHaveLength(1);
  });

  it("links each quadrant to its address, keeping the sort", () => {
    show();
    expect(chip(/^Masterpieces/).getAttribute("href")).toBe(
      "/friends?sort=disagreement&quarter=top-right",
    );
    expect(chip(/^On the fence/).getAttribute("href")).toBe(
      "/friends?sort=disagreement&filter=on-the-fence",
    );
    expect(chip(/^All/).getAttribute("aria-current")).toBe("true");
  });

  // E76
  it("greys out a quadrant with no films instead of linking it", () => {
    show();
    expect(screen.queryByRole("link", { name: /^Dumpster Fires/ })).toBeNull();
    expect(
      screen.getByText(/^Dumpster Fires/).closest("[aria-disabled]"),
    ).not.toBeNull();
  });
});

describe("FilterChips: inside a quadrant (R89, R91)", () => {
  it("reveals the quadrant's finer chips", () => {
    show({ quarter: "top-right", placement: null });
    expect(chipText(row("Within Masterpieces"))).toEqual([
      "Only Masterpieces 2",
      "Worth Watching 1",
      "Good 1",
      "Enjoyable 0",
    ]);
  });

  it("shows Good again under the bottom-right quadrant", () => {
    show({ quarter: "bottom-right", placement: null });
    expect(chipText(row("Within Serious Watches"))).toEqual([
      "Only Serious Watches 1",
      "Respectable 0",
      "Good 1",
      "Not Enjoyable 0",
    ]);
  });

  it("keeps the quadrant in each finer chip's address", () => {
    show({ quarter: "bottom-right", placement: null });
    expect(chip(/^Good/).getAttribute("href")).toBe(
      "/friends?sort=disagreement&quarter=bottom-right&filter=good",
    );
  });

  it("marks the quadrant as current while it is shown whole", () => {
    show({ quarter: "top-right", placement: null });
    expect(chip(/^Masterpieces/).getAttribute("aria-current")).toBe("true");
    expect(chip(/^All/).getAttribute("aria-current")).toBeNull();
  });

  // The quadrant stays highlighted, but the finer chip is the current one.
  it("marks the finer chip as current once one is chosen", () => {
    show({ quarter: "top-right", placement: "worth-watching" });
    expect(chip(/^Worth Watching/).getAttribute("aria-current")).toBe("true");
    const quadrant = chip(/^Masterpieces/);
    expect(quadrant.getAttribute("aria-current")).toBeNull();
    // Still drawn as chosen, and choosing it shows the whole quadrant again.
    expect(quadrant.className).toBe(chip(/^Worth Watching/).className);
    expect(quadrant.getAttribute("href")).toBe(
      "/friends?sort=disagreement&quarter=top-right",
    );
  });

  it("shows no finer chips for On the fence", () => {
    show({ quarter: null, placement: "on-the-fence" });
    expect(screen.getAllByRole("list")).toHaveLength(1);
    expect(chip(/^On the fence/).getAttribute("aria-current")).toBe("true");
  });
});
