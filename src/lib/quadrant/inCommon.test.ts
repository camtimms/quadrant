import { describe, expect, it } from "vitest";
import { disagreement } from "@/lib/quadrant/disagreement";
import { filmsInCommon } from "@/lib/quadrant/inCommon";

// R76 (design 21.2): the films two members have both rated.

const film = (
  tmdbId: number,
  title: string,
  quality: number,
  enjoyment: number,
) => ({
  tmdbId,
  title,
  point: { quality, enjoyment },
});

describe("filmsInCommon", () => {
  it("pairs only the films both have rated", () => {
    const mine = [film(1, "Heat", 8, 9), film(2, "Alien", 9, 7)];
    const theirs = [film(2, "Alien", 4, 4), film(3, "Jaws", 6, 6)];
    const common = filmsInCommon(mine, theirs);
    expect(common.map((pair) => pair.film.tmdbId)).toEqual([2]);
    expect(common[0]).toEqual({
      film: mine[1],
      mine: { quality: 9, enjoyment: 7 },
      theirs: { quality: 4, enjoyment: 4 },
      apart: disagreement(
        { quality: 9, enjoyment: 7 },
        { quality: 4, enjoyment: 4 },
      ),
    });
  });

  it("puts the biggest disagreement first", () => {
    const mine = [
      film(1, "Heat", 8, 8),
      film(2, "Alien", 5, 5),
      film(3, "Jaws", 2, 9),
    ];
    const theirs = [
      film(1, "Heat", 7, 8),
      film(2, "Alien", 0, 0),
      film(3, "Jaws", 9, 2),
    ];
    expect(filmsInCommon(mine, theirs).map((pair) => pair.film.title)).toEqual([
      "Jaws",
      "Alien",
      "Heat",
    ]);
  });

  it("breaks ties by title", () => {
    const mine = [film(1, "Zodiac", 5, 5), film(2, "Alien", 5, 5)];
    const theirs = [film(1, "Zodiac", 8, 9), film(2, "Alien", 8, 9)];
    expect(filmsInCommon(mine, theirs).map((pair) => pair.film.title)).toEqual([
      "Alien",
      "Zodiac",
    ]);
  });

  it("includes films they agree on exactly, last", () => {
    const mine = [film(1, "Heat", 8, 9), film(2, "Alien", 5, 5)];
    const theirs = [film(1, "Heat", 8, 9), film(2, "Alien", 6, 5)];
    const common = filmsInCommon(mine, theirs);
    expect(common.map((pair) => [pair.film.title, pair.apart])).toEqual([
      ["Alien", 1],
      ["Heat", 0],
    ]);
  });

  // E57, E58
  it("is empty when nothing is shared, or either has rated nothing", () => {
    expect(
      filmsInCommon([film(1, "Heat", 8, 9)], [film(2, "Alien", 1, 1)]),
    ).toEqual([]);
    expect(filmsInCommon([], [film(2, "Alien", 1, 1)])).toEqual([]);
    expect(filmsInCommon([film(1, "Heat", 8, 9)], [])).toEqual([]);
  });
});
