import { describe, expect, it } from "vitest";
import { ABOVE_FIRST, nextArrowIndex } from "@/lib/arrowKeys";

describe("nextArrowIndex (R64)", () => {
  it("moves down to the next film", () => {
    expect(nextArrowIndex(0, 3, "ArrowDown")).toBe(1);
    expect(nextArrowIndex(1, 3, "ArrowDown")).toBe(2);
  });

  it("moves up to the previous film", () => {
    expect(nextArrowIndex(2, 3, "ArrowUp")).toBe(1);
  });

  // No wrap-around: the ends are felt as ends.
  it("stays on the last film when Down is pressed there", () => {
    expect(nextArrowIndex(2, 3, "ArrowDown")).toBe(2);
  });

  // The search box uses this to take focus back.
  it("says 'above the first' when Up is pressed on the first film", () => {
    expect(nextArrowIndex(0, 3, "ArrowUp")).toBe(ABOVE_FIRST);
  });

  it("ignores every other key", () => {
    for (const key of ["ArrowLeft", "ArrowRight", "Tab", "Enter", " ", "a"]) {
      expect(nextArrowIndex(1, 3, key)).toBeNull();
    }
  });

  it("does nothing when the focus is not one of the films", () => {
    expect(nextArrowIndex(-1, 3, "ArrowDown")).toBeNull();
  });

  it("does nothing for an empty list", () => {
    expect(nextArrowIndex(0, 0, "ArrowDown")).toBeNull();
  });
});
