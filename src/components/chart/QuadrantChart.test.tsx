// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ChartFrame,
  QuadrantChart,
  type ChartFilm,
} from "@/components/chart/QuadrantChart";
import { chartX, chartY } from "@/components/chart/scale";
import {
  EXTREME_HIGH,
  EXTREME_LOW,
  MIDPOINT,
  PLACEMENT_LABELS,
  type Placement,
} from "@/lib/quadrant";

afterEach(cleanup);

function film(
  tmdbId: number,
  title: string,
  quality: number,
  enjoyment: number,
  extra: Partial<ChartFilm> = {},
): ChartFilm {
  return {
    tmdbId,
    title,
    year: 1990,
    posterPath: null,
    point: { quality, enjoyment },
    ...extra,
  };
}

/** Text of an element with all whitespace removed, for comparing labels
 *  that the chart splits over several lines. */
const squash = (text: string | null | undefined) =>
  (text ?? "").replace(/\s/g, "");

const num = (element: Element, attribute: string) =>
  Number(element.getAttribute(attribute));

describe("ChartFrame (R28)", () => {
  it("draws the two dividing lines at 5", () => {
    const { container } = render(<ChartFrame />);

    const vertical = container.querySelector('[data-divider="quality"]')!;
    expect(num(vertical, "x1")).toBe(chartX(MIDPOINT));
    expect(num(vertical, "x2")).toBe(chartX(MIDPOINT));
    expect(num(vertical, "y1")).toBe(chartY(10));
    expect(num(vertical, "y2")).toBe(chartY(0));

    const horizontal = container.querySelector('[data-divider="enjoyment"]')!;
    expect(num(horizontal, "y1")).toBe(chartY(MIDPOINT));
    expect(num(horizontal, "y2")).toBe(chartY(MIDPOINT));
    expect(num(horizontal, "x1")).toBe(chartX(0));
    expect(num(horizontal, "x2")).toBe(chartX(10));
  });

  // Each outer corner is a shaded square: from 7.5 up, or from 2.5 down, on
  // BOTH scales. The expected edges are worked out from the same constants
  // classify() uses, so the picture and the rule cannot drift apart.
  it.each([
    // placement, left edge (quality), right edge, bottom edge (enjoyment), top edge
    ["masterpieces", EXTREME_HIGH, 10, EXTREME_HIGH, 10],
    ["guilty-pleasures", 0, EXTREME_LOW, EXTREME_HIGH, 10],
    ["serious-watches", EXTREME_HIGH, 10, 0, EXTREME_LOW],
    ["dumpster-fires", 0, EXTREME_LOW, 0, EXTREME_LOW],
  ] as const)(
    "shades the %s corner over the right square",
    (placement, qLow, qHigh, eLow, eHigh) => {
      const { container } = render(<ChartFrame />);
      const rect = container.querySelector(`rect[data-corner="${placement}"]`)!;

      expect(num(rect, "x")).toBe(chartX(qLow));
      expect(num(rect, "x") + num(rect, "width")).toBe(chartX(qHigh));
      // y grows downwards, so the square's top edge is the HIGH score.
      expect(num(rect, "y")).toBe(chartY(eHigh));
      expect(num(rect, "y") + num(rect, "height")).toBe(chartY(eLow));
    },
  );

  // NFR22: every word on the chart comes from the one label table.
  it.each([
    "masterpieces",
    "guilty-pleasures",
    "serious-watches",
    "dumpster-fires",
    "worth-watching",
    "cheap-thrills",
    "respectable",
    "not-worth-watching",
    "good",
    "bad",
    "enjoyable",
    "not-enjoyable",
  ] as const)("names %s using PLACEMENT_LABELS", (placement: Placement) => {
    const { container } = render(<ChartFrame />);
    const label = container.querySelector(`[data-label="${placement}"]`);
    expect(squash(label?.textContent)).toBe(
      squash(PLACEMENT_LABELS[placement]),
    );
  });

  // The names are kept out of the squares on purpose: a member's points
  // for scores of 8, 9 and 10 are drawn inside a corner, and a name there
  // would be hidden by the films it describes.
  it.each([
    ["masterpieces", "above"],
    ["guilty-pleasures", "above"],
    ["serious-watches", "below"],
    ["dumpster-fires", "below"],
  ] as const)(
    "writes the %s name in the margin %s its square",
    (placement, side) => {
      const { container } = render(<ChartFrame />);
      const rect = container.querySelector(`rect[data-corner="${placement}"]`)!;
      const label = container.querySelector(`[data-label="${placement}"]`)!;

      // Lined up with the square, left to right...
      expect(num(label, "x")).toBe(num(rect, "x") + num(rect, "width") / 2);
      // ...and outside the plot, top or bottom.
      if (side === "above") {
        expect(num(label, "y")).toBeLessThan(chartY(10));
      } else {
        expect(num(label, "y")).toBeGreaterThan(chartY(0));
      }
    },
  );

  // A member's points sit on whole-number rows. The inner-band names are
  // written on the half-score line between two rows, so they stay readable.
  it("writes the inner-band names between rows of points", () => {
    const { container } = render(<ChartFrame />);
    const wholeNumberRows = Array.from({ length: 11 }, (_, score) =>
      chartY(score),
    );
    for (const label of container.querySelectorAll(
      "[data-inner-band-labels] [data-label]",
    )) {
      expect(wholeNumberRows).not.toContain(num(label, "y"));
      // Inside the plot, unlike the corner names.
      expect(num(label, "y")).toBeGreaterThan(chartY(10));
      expect(num(label, "y")).toBeLessThan(chartY(0));
    }
  });

  // jsdom has no screen width, so the test checks the instruction given to
  // the browser: hidden by default, shown from the "sm" width (640px) up.
  it("hides the inner-band names at phone width", () => {
    const { container } = render(<ChartFrame />);
    const group = container.querySelector("[data-inner-band-labels]")!;

    expect(group.classList.contains("hidden")).toBe(true);
    expect(group.classList.contains("sm:block")).toBe(true);
    expect(group.querySelectorAll("[data-label]")).toHaveLength(4);
    // The corner and half-line names are NOT inside that group.
    expect(group.querySelector('[data-label="masterpieces"]')).toBeNull();
    expect(group.querySelector('[data-label="good"]')).toBeNull();
  });

  // The buttons and the list carry the information; the drawing is scenery.
  it("is hidden from screen readers", () => {
    const { container } = render(<ChartFrame />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});

describe("QuadrantChart", () => {
  const commando = film(10999, "Commando", 3, 9, { year: 1985 });
  const heat = film(949, "Heat", 9, 9, { year: 1995 });
  const alien = film(348, "Alien", 9, 9, { year: 1979 });
  const clue = film(15196, "Clue", 9, 9, { year: null });
  const fence = film(1, "Fine Film", 5, 5);

  describe("points (R30, NFR12)", () => {
    it("draws one focusable point per film, named in words", () => {
      render(<QuadrantChart films={[commando, fence]} />);

      const point = screen.getByRole("button", {
        name: "Commando (1985): quality 3, enjoyment 9, Cheap Thrills",
      });
      point.focus();
      expect(document.activeElement).toBe(point);

      expect(
        screen.getByRole("button", {
          name: "Fine Film (1990): quality 5, enjoyment 5, On the fence",
        }),
      ).toBeTruthy();
    });

    it("leaves the year out of the name when it is unknown", () => {
      render(
        <QuadrantChart films={[film(7, "Mystery", 6, 6, { year: null })]} />,
      );
      expect(
        screen.getByRole("button", {
          name: "Mystery: quality 6, enjoyment 6, Worth Watching",
        }),
      ).toBeTruthy();
    });

    it("places a point at its scores", () => {
      render(<QuadrantChart films={[commando]} />);
      const point = screen.getByRole("button", { name: /Commando/ });
      // 3 on quality, 9 on enjoyment, as percentages of the chart.
      expect(point.style.left).toBe(`${(chartX(3) / 120) * 100}%`);
      expect(point.style.top).toBe(`${(chartY(9) / 120) * 100}%`);
    });

    it("draws just the frame when there are no films", () => {
      const { container } = render(<QuadrantChart films={[]} />);
      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(container.querySelector("svg")).not.toBeNull();
    });
  });

  describe("films at the same spot (R31)", () => {
    it("become one point showing how many there are", () => {
      render(<QuadrantChart films={[heat, alien, clue, commando]} />);

      // Four films, two points.
      expect(screen.getAllByRole("button")).toHaveLength(2);
      const cluster = screen.getByRole("button", {
        name: "3 films at quality 9, enjoyment 9, Masterpieces",
      });
      // The count is visible text on the point, not only in its name.
      expect(cluster.textContent).toBe("3");
    });

    it("shows no number on a point that is a single film", () => {
      render(<QuadrantChart films={[commando]} />);
      expect(screen.getByRole("button", { name: /Commando/ }).textContent).toBe(
        "",
      );
    });

    it("merges nearby group averages when given a smaller cell size", () => {
      // 6.1 and 6.2 round to the same half-point cell; 6.9 does not.
      const films = [
        film(1, "A", 6.1, 6.1),
        film(2, "B", 6.2, 6.2),
        film(3, "C", 6.9, 6.9),
      ];
      render(<QuadrantChart films={films} cellSize={0.5} />);

      expect(screen.getAllByRole("button")).toHaveLength(2);
      // Drawn at the mean position, shown to one decimal place.
      expect(
        screen.getByRole("button", {
          name: /^2 films near quality 6\.\d, enjoyment 6\.\d$/,
        }),
      ).toBeTruthy();
    });
  });

  describe("selecting a point (R32)", () => {
    it("shows nothing selected to begin with", () => {
      render(<QuadrantChart films={[commando]} />);
      expect(screen.queryByRole("region")).toBeNull();
      expect(
        screen
          .getByRole("button", { name: /Commando/ })
          .getAttribute("aria-expanded"),
      ).toBe("false");
    });

    it("opens a panel with the film's title, year, scores, placement and link", () => {
      render(<QuadrantChart films={[commando]} />);

      fireEvent.click(screen.getByRole("button", { name: /Commando/ }));

      const panel = screen.getByRole("region", { name: /selected/i });
      expect(within(panel).getByText("Commando")).toBeTruthy();
      expect(panel.textContent).toContain("1985");
      expect(panel.textContent).toContain("Quality 3");
      expect(panel.textContent).toContain("Enjoyment 9");
      expect(panel.textContent).toContain(PLACEMENT_LABELS["cheap-thrills"]);
      expect(
        within(panel)
          .getByRole("link", { name: /Commando/ })
          .getAttribute("href"),
      ).toBe("/film/10999");
      // The poster (here its placeholder) is named after the film (NFR15).
      expect(within(panel).getByRole("img", { name: "Commando" })).toBeTruthy();
    });

    it("lists every film in a cluster, so none is hidden behind another", () => {
      render(<QuadrantChart films={[heat, alien, clue]} />);

      fireEvent.click(screen.getByRole("button", { name: /3 films/ }));

      const panel = screen.getByRole("region", { name: /selected/i });
      const items = within(panel).getAllByRole("listitem");
      expect(items).toHaveLength(3);
      expect(
        items.map((item) =>
          within(item).getByRole("link").getAttribute("href"),
        ),
      ).toEqual(["/film/949", "/film/348", "/film/15196"]);
      expect(panel.textContent).toContain("Year unknown"); // Clue
    });

    it("marks which point is open", () => {
      render(<QuadrantChart films={[commando, heat]} />);
      const point = screen.getByRole("button", { name: /Commando/ });

      fireEvent.click(point);

      expect(point.getAttribute("aria-expanded")).toBe("true");
      expect(
        screen
          .getByRole("button", { name: /Heat/ })
          .getAttribute("aria-expanded"),
      ).toBe("false");
    });

    it("switches to another point when that one is selected", () => {
      render(<QuadrantChart films={[commando, heat]} />);
      fireEvent.click(screen.getByRole("button", { name: /Commando/ }));

      fireEvent.click(screen.getByRole("button", { name: /Heat/ }));

      const panel = screen.getByRole("region", { name: /selected/i });
      expect(within(panel).getByText("Heat")).toBeTruthy();
      expect(within(panel).queryByText("Commando")).toBeNull();
    });

    it("closes when the same point is selected again, or with the Close button", () => {
      render(<QuadrantChart films={[commando]} />);
      const point = screen.getByRole("button", { name: /Commando/ });

      fireEvent.click(point);
      fireEvent.click(point);
      expect(screen.queryByRole("region")).toBeNull();

      fireEvent.click(point);
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("region")).toBeNull();
    });
  });
});
