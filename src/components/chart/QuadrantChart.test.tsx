// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ChartFrame,
  QuadrantChart,
  type ChartFilm,
} from "@/components/chart/QuadrantChart";
import {
  chartX,
  chartY,
  zoomScale,
  zoomTransform,
  zoomWindow,
} from "@/components/chart/scale";
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

/** The top-right quadrant chosen, as its chip sets it (R89). */
const TOP_RIGHT = { quarter: "top-right", placement: null } as const;

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

  // NFR24 (design 17.5): each quarter of the plot is lightly tinted, under
  // the lines, so the lines and points are drawn on top of the colour.
  it.each([
    // quarter, quality from, to, enjoyment from, to
    ["tr", MIDPOINT, 10, MIDPOINT, 10],
    ["tl", 0, MIDPOINT, MIDPOINT, 10],
    ["br", MIDPOINT, 10, 0, MIDPOINT],
    ["bl", 0, MIDPOINT, 0, MIDPOINT],
  ] as const)(
    "tints the %s quarter, under the dividing lines",
    (quarter, qLow, qHigh, eLow, eHigh) => {
      const { container } = render(<ChartFrame />);
      const rect = container.querySelector(`rect[data-quarter="${quarter}"]`)!;

      expect(rect.getAttribute("class")).toContain(`fill-q-${quarter}`);
      expect(num(rect, "x")).toBe(chartX(qLow));
      expect(num(rect, "x") + num(rect, "width")).toBe(chartX(qHigh));
      expect(num(rect, "y")).toBe(chartY(eHigh));
      expect(num(rect, "y") + num(rect, "height")).toBe(chartY(eLow));

      // Earlier in the drawing means underneath.
      const divider = container.querySelector('[data-divider="quality"]')!;
      expect(
        rect.compareDocumentPosition(divider) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    },
  );

  // A corner's and an inner band's name take their quarter's colour, so the
  // names group with their part of the chart. The words still say it all
  // (NFR14); the colours are measured in theme.test.ts.
  it.each([
    ["masterpieces", "tr"],
    ["worth-watching", "tr"],
    ["guilty-pleasures", "tl"],
    ["cheap-thrills", "tl"],
    ["serious-watches", "br"],
    ["respectable", "br"],
    ["dumpster-fires", "bl"],
    ["not-worth-watching", "bl"],
  ] as const)("writes %s in its quarter's colour", (placement, quarter) => {
    const { container } = render(<ChartFrame />);
    const label = container.querySelector(`[data-label="${placement}"]`)!;
    expect(label.getAttribute("class")).toContain(`fill-q-${quarter}-ink`);
  });

  it("draws only in the theme's colours", () => {
    const { container } = render(<ChartFrame />);
    expect(container.innerHTML).not.toMatch(/foreground|background/);
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

    it("merges nearby group averages when told to merge within 0.5", () => {
      // 6.1 and 6.2 are about 0.14 apart; 6.9 is over 0.5 from both.
      const films = [
        film(1, "A", 6.1, 6.1),
        film(2, "B", 6.2, 6.2),
        film(3, "C", 6.9, 6.9),
      ];
      render(<QuadrantChart films={films} mergeWithin={0.5} />);

      expect(screen.getAllByRole("button")).toHaveLength(2);
      // Drawn at the mean position, shown to one decimal place.
      expect(
        screen.getByRole("button", {
          name: /^2 films near quality 6\.\d, enjoyment 6\.\d$/,
        }),
      ).toBeTruthy();
    });
  });

  // T29g: zoomed in, the scores are drawn larger, so closer films get a
  // dot each.
  describe("merging when zoomed in (R31, R53)", () => {
    const pair = [film(1, "A", 7.0, 7.0), film(2, "B", 7.4, 7.0)];

    it("shares a dot on the whole chart", () => {
      render(<QuadrantChart films={pair} mergeWithin={0.5} />);
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });

    it("gives each its own dot when zoomed in on the quadrant", () => {
      render(
        <QuadrantChart films={pair} mergeWithin={0.5} zoomTo={TOP_RIGHT} />,
      );
      expect(screen.getAllByRole("button")).toHaveLength(2);
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
          // Two links go there: the row itself and the "Film page" button.
          .getAllByRole("link", { name: /Commando/ })
          .map((link) => link.getAttribute("href")),
      ).toEqual(["/film/10999", "/film/10999"]);
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
          within(item).getAllByRole("link")[0].getAttribute("href"),
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

  describe("zooming to a filter (R53)", () => {
    const layer = (container: HTMLElement) =>
      container.querySelector<HTMLElement>("[data-zoom-layer]")!;

    it("shows the whole chart when no filter is chosen", () => {
      const { container } = render(<QuadrantChart films={[commando]} />);
      expect(layer(container).style.transform).toBe("none");
      expect(screen.getByRole("button", { name: /Commando/ }).style.scale).toBe(
        "1",
      );
    });

    it("moves and enlarges the chart to the chosen placement", () => {
      const { container } = render(
        <QuadrantChart films={[heat]} zoomTo={TOP_RIGHT} />,
      );
      expect(layer(container).style.transform).toBe(
        zoomTransform(zoomWindow(TOP_RIGHT)),
      );
      expect(layer(container).style.transform).toMatch(
        /^scale\(.+\) translate/,
      );
    });

    // The frame and the points are in the one layer, so they move together.
    it("zooms the frame and the points together", () => {
      const { container } = render(
        <QuadrantChart films={[heat]} zoomTo={TOP_RIGHT} />,
      );
      expect(layer(container).querySelector("svg")).not.toBeNull();
      expect(
        layer(container).contains(screen.getByRole("button", { name: /Heat/ })),
      ).toBe(true);
    });

    it("keeps the points the same size on screen", () => {
      render(<QuadrantChart films={[heat]} zoomTo={TOP_RIGHT} />);
      const point = screen.getByRole("button", { name: /Heat/ });
      // Shrunk by exactly as much as the layer is enlarged.
      expect(Number(point.style.scale)).toBeCloseTo(
        1 / zoomScale(zoomWindow(TOP_RIGHT)),
      );
    });

    it("zooms back out when the filter is cleared", () => {
      const { container, rerender } = render(
        <QuadrantChart films={[heat]} zoomTo={TOP_RIGHT} />,
      );
      // The same component, given new props: what following a filter link
      // does. This is why the change can animate.
      rerender(<QuadrantChart films={[heat, commando]} zoomTo={null} />);
      expect(layer(container).style.transform).toBe("none");
    });

    // jsdom does not run animations, so the test checks the instructions
    // given to the browser: animate the transform, but not for anyone who
    // has asked their device to reduce motion.
    it("animates, except for members who have asked for reduced motion", () => {
      const { container } = render(
        <QuadrantChart films={[heat]} zoomTo={TOP_RIGHT} />,
      );
      for (const element of [
        layer(container),
        screen.getByRole("button", { name: /Heat/ }),
      ]) {
        expect(element.classList.contains("transition-transform")).toBe(true);
        expect(
          element.classList.contains("motion-reduce:transition-none"),
        ).toBe(true);
      }
    });

    it("clips what the zoom pushes out of view", () => {
      const { container } = render(
        <QuadrantChart films={[heat]} zoomTo={TOP_RIGHT} />,
      );
      expect(
        layer(container).parentElement!.classList.contains("overflow-hidden"),
      ).toBe(true);
    });
  });

  describe("pointing out a film (R23)", () => {
    it("starts with that film's point open", () => {
      render(
        <QuadrantChart films={[commando, heat]} initialSelectedId={10999} />,
      );
      const panel = screen.getByRole("region", { name: /selected/i });
      expect(within(panel).getByText("Commando")).toBeTruthy();
      expect(
        screen
          .getByRole("button", { name: /Commando/ })
          .getAttribute("aria-expanded"),
      ).toBe("true");
    });

    it("opens the whole cluster when the film shares its point", () => {
      render(
        <QuadrantChart
          films={[heat, alien, clue]}
          initialSelectedId={348} // Alien, the second film at 9/9
        />,
      );
      const panel = screen.getByRole("region", { name: /selected/i });
      expect(within(panel).getAllByRole("listitem")).toHaveLength(3);
    });

    it("opens nothing when the film is not on the chart", () => {
      render(<QuadrantChart films={[commando]} initialSelectedId={424242} />);
      expect(screen.queryByRole("region")).toBeNull();
    });

    // A filter can remove the selected film from the chart. The panel must
    // close, not jump to whichever film now sits at the same position in
    // the list.
    it("closes the panel when a filter removes the selected film", () => {
      const { rerender } = render(
        <QuadrantChart films={[commando, heat]} initialSelectedId={10999} />,
      );
      rerender(<QuadrantChart films={[heat]} zoomTo={TOP_RIGHT} />);
      expect(screen.queryByRole("region")).toBeNull();
    });
  });

  // On a phone the panel opens below the chart, off screen.
  describe("bringing the panel into view (NFR23)", () => {
    const scrollIntoView = vi.fn();
    beforeEach(() => {
      // jsdom has no layout, so it has no scrollIntoView at all.
      Element.prototype.scrollIntoView = scrollIntoView;
    });
    afterEach(() => {
      scrollIntoView.mockReset();
    });

    it("scrolls to the panel when the member selects a point", () => {
      render(<QuadrantChart films={[commando]} />);

      fireEvent.click(screen.getByRole("button", { name: /Commando/ }));

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      // As little movement as possible.
      expect(scrollIntoView.mock.calls[0][0]).toMatchObject({
        block: "nearest",
      });
      // Called on something that holds the panel.
      const scrolled = scrollIntoView.mock.contexts[0] as HTMLElement;
      expect(scrolled.contains(screen.getByRole("region"))).toBe(true);
    });

    it("does not scroll when a point is closed", () => {
      render(<QuadrantChart films={[commando]} />);
      const point = screen.getByRole("button", { name: /Commando/ });
      fireEvent.click(point);
      scrollIntoView.mockReset();

      fireEvent.click(point);

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    // Landing on My films after a save must leave the member at the top,
    // looking at the "Saved" line and the chart.
    it("does not scroll for a point the page opened by itself", () => {
      render(<QuadrantChart films={[commando]} initialSelectedId={10999} />);
      expect(screen.getByRole("region")).toBeTruthy();
      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });

  // NFR12. Without this, a keyboard user who opens a point would have to
  // Tab past every other point on the chart to reach its panel.
  describe("keyboard focus (NFR12)", () => {
    beforeEach(() => {
      Element.prototype.scrollIntoView = vi.fn();
    });

    it("moves to the panel when the member opens a point", () => {
      render(<QuadrantChart films={[commando]} />);

      fireEvent.click(screen.getByRole("button", { name: /Commando/ }));

      expect(document.activeElement).toBe(screen.getByRole("region"));
    });

    it("goes back to the point when the panel is closed", () => {
      render(<QuadrantChart films={[commando]} />);
      const point = screen.getByRole("button", { name: /Commando/ });
      fireEvent.click(point);

      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(screen.queryByRole("region")).toBeNull();
      expect(document.activeElement).toBe(point);
    });

    it("closes the panel with Escape, back on the point", () => {
      render(<QuadrantChart films={[commando]} />);
      const point = screen.getByRole("button", { name: /Commando/ });
      fireEvent.click(point);

      fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" });

      expect(screen.queryByRole("region")).toBeNull();
      expect(document.activeElement).toBe(point);
    });

    // The page opening a point (after a save) must not pull focus away
    // from the top of the page.
    it("stays where it is for a point the page opened by itself", () => {
      render(<QuadrantChart films={[commando]} initialSelectedId={10999} />);

      expect(document.activeElement).toBe(document.body);
    });
  });

  describe("touch (NFR23)", () => {
    it("gives each point a touch area larger than its dot, and a pressed look", () => {
      render(<QuadrantChart films={[commando]} />);
      const classes = screen.getByRole("button", {
        name: /Commando/,
      }).className;
      expect(classes).toContain("before:-inset-2");
      expect(classes).toMatch(/\bactive:/);
    });
  });
});
