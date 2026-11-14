import { describe, expect, it } from "vitest";
import {
  CHART_SIZE,
  PLOT_END,
  PLOT_START,
  chartX,
  chartY,
  formatScore,
  toPercent,
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
