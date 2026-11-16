import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";

describe("contrastRatio (WCAG 2)", () => {
  it("is 21 for black on white, the largest possible", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("is 1 for a colour against itself", () => {
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("does not care which colour is the text", () => {
    expect(contrastRatio("#171717", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#171717"),
      10,
    );
  });

  // A published pair: #767676 on white is the classic "just passes AA".
  it("matches a known value", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});
