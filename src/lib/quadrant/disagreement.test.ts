import { describe, expect, it } from "vitest";
import {
  disagreement,
  filmDisagreement,
  MAX_DISAGREEMENT,
} from "@/lib/quadrant/disagreement";

describe("disagreement", () => {
  // Two members who gave the same scores do not disagree at all (E13).
  it("is 0 for identical ratings", () => {
    const rating = { quality: 7, enjoyment: 3 };
    expect(disagreement(rating, { ...rating })).toBe(0);
  });

  it("is the gap itself when only one scale differs", () => {
    expect(
      disagreement({ quality: 2, enjoyment: 6 }, { quality: 9, enjoyment: 6 }),
    ).toBe(7);
    expect(
      disagreement({ quality: 4, enjoyment: 1 }, { quality: 4, enjoyment: 5 }),
    ).toBe(4);
  });

  // The straight-line distance on the chart: a 3-4-5 right-angled triangle.
  it("is the straight-line distance when both scales differ", () => {
    expect(
      disagreement({ quality: 1, enjoyment: 1 }, { quality: 4, enjoyment: 5 }),
    ).toBe(5);
  });

  it("is the same whichever member comes first", () => {
    const a = { quality: 3, enjoyment: 9 };
    const b = { quality: 8, enjoyment: 2 };
    expect(disagreement(a, b)).toBe(disagreement(b, a));
  });

  // The furthest apart two ratings can be: opposite corners of the chart.
  it("is about 14.14 for opposite corners, the maximum possible", () => {
    const corners = disagreement(
      { quality: 0, enjoyment: 0 },
      { quality: 10, enjoyment: 10 },
    );
    expect(corners).toBeCloseTo(14.142, 3);
    expect(corners).toBe(MAX_DISAGREEMENT);
    expect(
      disagreement(
        { quality: 0, enjoyment: 10 },
        { quality: 10, enjoyment: 0 },
      ),
    ).toBe(MAX_DISAGREEMENT);
  });

  it("is not rounded: rounding happens only when it is displayed", () => {
    // 1 apart on each scale = the square root of 2.
    expect(
      disagreement({ quality: 5, enjoyment: 5 }, { quality: 6, enjoyment: 6 }),
    ).toBe(Math.SQRT2);
  });
});

describe("filmDisagreement", () => {
  // R45: with fewer than two ratings there is nobody to disagree with.
  // null (shown as a dash), never 0, which would wrongly claim agreement.
  it("is null when nobody has rated the film", () => {
    expect(filmDisagreement([])).toBeNull();
  });

  it("is null when only one member has rated the film", () => {
    expect(filmDisagreement([{ quality: 9, enjoyment: 9 }])).toBeNull();
  });

  it("is the distance between them when two members have rated it", () => {
    expect(
      filmDisagreement([
        { quality: 1, enjoyment: 1 },
        { quality: 4, enjoyment: 5 },
      ]),
    ).toBe(5);
  });

  // Two members agreeing exactly is a real 0, different from "no value".
  it("is 0, not null, when two members agree exactly", () => {
    expect(
      filmDisagreement([
        { quality: 6, enjoyment: 6 },
        { quality: 6, enjoyment: 6 },
      ]),
    ).toBe(0);
  });

  // R44: a film's disagreement is its single biggest clash.
  it("is the largest distance between any two of many ratings", () => {
    const ratings = [
      { quality: 5, enjoyment: 5 },
      { quality: 6, enjoyment: 5 },
      { quality: 0, enjoyment: 10 }, // these two are
      { quality: 10, enjoyment: 0 }, // the furthest apart
      { quality: 5, enjoyment: 6 },
    ];
    expect(filmDisagreement(ratings)).toBe(MAX_DISAGREEMENT);
  });

  it("finds the furthest pair wherever they sit in the list", () => {
    const far1 = { quality: 1, enjoyment: 1 };
    const far2 = { quality: 4, enjoyment: 5 };
    const middle = { quality: 2, enjoyment: 3 };
    expect(filmDisagreement([far1, middle, far2])).toBe(5);
    expect(filmDisagreement([middle, far2, far1])).toBe(5);
    expect(filmDisagreement([far2, far1, middle])).toBe(5);
  });

  it("does not change the list it is given", () => {
    const ratings = [
      { quality: 1, enjoyment: 2 },
      { quality: 3, enjoyment: 4 },
    ];
    const copy = structuredClone(ratings);
    filmDisagreement(ratings);
    expect(ratings).toEqual(copy);
  });
});
