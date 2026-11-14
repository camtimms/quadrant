import { describe, expect, it } from "vitest";
import { PLACEMENTS } from "@/lib/quadrant";
import {
  CHART_SIZE,
  PLOT_END,
  PLOT_START,
  chartX,
  chartY,
  formatScore,
  toPercent,
  ZOOM_SPAN,
  zoomScale,
  zoomTransform,
  zoomWindow,
} from "@/components/chart/scale";

describe("chart scale", () => {
  it("leaves an equal margin on every side of the plot", () => {
    expect(PLOT_START).toBe(CHART_SIZE - PLOT_END);
  });

  describe("chartX: quality runs left to right", () => {
    it("puts 0 at the left edge of the plot and 10 at the right", () => {
      expect(chartX(0)).toBe(PLOT_START);
      expect(chartX(10)).toBe(PLOT_END);
    });

    it("puts 5 exactly in the middle", () => {
      expect(chartX(5)).toBe(CHART_SIZE / 2);
    });

    it("spaces whole scores evenly", () => {
      const step = chartX(1) - chartX(0);
      for (let score = 0; score < 10; score++) {
        expect(chartX(score + 1) - chartX(score)).toBeCloseTo(step);
      }
    });

    it("places a group average between whole scores", () => {
      expect(chartX(7.5)).toBeCloseTo((chartX(7) + chartX(8)) / 2);
    });
  });

  // The one thing that is easy to get wrong: on a screen, y grows DOWNWARDS,
  // but on a chart a higher score belongs higher up.
  describe("chartY: enjoyment runs bottom to top", () => {
    it("puts 10 at the top of the plot and 0 at the bottom", () => {
      expect(chartY(10)).toBe(PLOT_START);
      expect(chartY(0)).toBe(PLOT_END);
    });

    it("puts 5 exactly in the middle", () => {
      expect(chartY(5)).toBe(CHART_SIZE / 2);
    });

    it("draws a higher score further up (a smaller y)", () => {
      expect(chartY(9)).toBeLessThan(chartY(3));
    });
  });

  describe("toPercent", () => {
    it("turns a chart position into a percentage of the chart's width", () => {
      expect(toPercent(0)).toBe("0%");
      expect(toPercent(CHART_SIZE / 2)).toBe("50%");
      expect(toPercent(CHART_SIZE)).toBe("100%");
    });
  });

  describe("formatScore", () => {
    it("shows a member's whole-number score plainly", () => {
      expect(formatScore(7)).toBe("7");
      expect(formatScore(0)).toBe("0");
      expect(formatScore(10)).toBe("10");
    });

    it("shows a group average to one decimal place", () => {
      expect(formatScore(6.3)).toBe("6.3");
      expect(formatScore(6.25)).toBe("6.3");
    });
  });
});

describe("zoomWindow (R53)", () => {
  it("is the whole chart (no window) when no filter is chosen", () => {
    expect(zoomWindow(null)).toBeNull();
    expect(zoomScale(null)).toBe(1);
    expect(zoomTransform(null)).toBe("none");
  });

  it.each(PLACEMENTS)("gives %s a window inside the drawing", (placement) => {
    const window = zoomWindow(placement)!;
    expect(window.left).toBeGreaterThanOrEqual(0);
    expect(window.top).toBeGreaterThanOrEqual(0);
    expect(window.left + window.size).toBeLessThanOrEqual(CHART_SIZE);
    expect(window.top + window.size).toBeLessThanOrEqual(CHART_SIZE);
  });

  // One zoom level for every filter keeps text and spacing predictable.
  it("makes every window the same size", () => {
    const sizes = new Set(PLACEMENTS.map((p) => zoomWindow(p)!.size));
    expect(sizes.size).toBe(1);
    expect([...sizes][0]).toBe(chartX(ZOOM_SPAN) - chartX(0));
  });

  it("zooms by a little under two times", () => {
    const scale = zoomScale(zoomWindow("masterpieces"));
    expect(scale).toBeCloseTo(CHART_SIZE / 65);
    expect(scale).toBeGreaterThan(1.5);
    expect(scale).toBeLessThan(2);
  });

  /** Is a score position inside the window? */
  function shows(placement: (typeof PLACEMENTS)[number], q: number, e: number) {
    const window = zoomWindow(placement)!;
    const x = chartX(q);
    const y = chartY(e);
    return (
      x >= window.left &&
      x <= window.left + window.size &&
      y >= window.top &&
      y <= window.top + window.size
    );
  }

  // Every whole-number score that HAS a placement must be in that
  // placement's view, or a filtered film could be off screen.
  it("keeps every film of a placement in view", async () => {
    const { classify } = await import("@/lib/quadrant");
    for (let q = 0; q <= 10; q++) {
      for (let e = 0; e <= 10; e++) {
        const placement = classify({ quality: q, enjoyment: e });
        expect(shows(placement, q, e), `${q}/${e} (${placement})`).toBe(true);
      }
    }
  });

  it("shows the top-right quarter for Masterpieces and for Worth Watching", () => {
    expect(zoomWindow("masterpieces")).toEqual(zoomWindow("worth-watching"));
    expect(shows("masterpieces", 10, 10)).toBe(true);
    expect(shows("masterpieces", 5, 5)).toBe(true);
    // The opposite corner is out of view.
    expect(shows("masterpieces", 0, 0)).toBe(false);
  });

  it("centres On the fence on the crossing", () => {
    const window = zoomWindow("on-the-fence")!;
    expect(window.left + window.size / 2).toBe(chartX(5));
    expect(window.top + window.size / 2).toBe(chartY(5));
  });

  // The names beside the window are written 5 units into the margin.
  it("keeps the margin names beside the window in view", () => {
    const window = zoomWindow("masterpieces")!;
    expect(window.top).toBeLessThan(chartY(10) - 5);
    expect(window.left + window.size).toBeGreaterThan(chartX(10) + 5);
  });

  it("builds a CSS transform that slides, then enlarges", () => {
    const window = zoomWindow("masterpieces")!;
    expect(zoomTransform(window)).toBe(
      `scale(${CHART_SIZE / 65}) translate(-${(window.left / CHART_SIZE) * 100}%, -${(window.top / CHART_SIZE) * 100}%)`,
    );
  });
});
