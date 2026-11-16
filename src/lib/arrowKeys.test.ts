// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { ABOVE_FIRST, nextArrowIndex, takesArrowKeys } from "@/lib/arrowKeys";

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

describe("takesArrowKeys (R64, v9)", () => {
  function element(html: string): Element {
    document.body.innerHTML = html;
    return document.querySelector("[data-test]")!;
  }

  it("is true where the arrow keys already have a job", () => {
    for (const html of [
      '<input data-test type="search">',
      '<input data-test type="text">',
      '<input data-test type="range">',
      "<textarea data-test></textarea>",
      "<select data-test></select>",
      '<div data-test contenteditable="true"></div>',
    ]) {
      expect(takesArrowKeys(element(html))).toBe(true);
    }
  });

  it("is true anywhere inside a film list, which handles them itself", () => {
    expect(
      takesArrowKeys(
        element(
          '<ul data-arrow-list="primary"><li><button data-test>x</button></li></ul>',
        ),
      ),
    ).toBe(true);
  });

  it("is false on the page, a link, a button or a checkbox", () => {
    for (const html of [
      '<a data-test href="/">x</a>',
      '<button data-test type="button">x</button>',
      '<input data-test type="checkbox">',
      "<div data-test></div>",
    ]) {
      expect(takesArrowKeys(element(html))).toBe(false);
    }
  });
});
