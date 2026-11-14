import { describe, expect, it } from "vitest";
import {
  FILTER_ROWS,
  filterHref,
  filterFilms,
  newestFirst,
  parseFilter,
} from "@/lib/filters";
import { PLACEMENTS, countByPlacement } from "@/lib/quadrant";

/** A film with just the parts these functions look at. */
function film(title: string, quality: number, enjoyment: number, ratedAt = "") {
  return { title, point: { quality, enjoyment }, ratedAt };
}

describe("parseFilter", () => {
  it.each(PLACEMENTS)("accepts %s", (placement) => {
    expect(parseFilter(placement)).toBe(placement);
  });

  // The value comes from the address bar, so it can be anything. Anything
  // unrecognised simply means "no filter": the page shows everything rather
  // than an error or an empty list.
  it.each([
    [undefined],
    [""],
    ["nonsense"],
    ["Masterpieces"], // the display label, not the internal name
    ["MASTERPIECES"],
    ["masterpieces "],
    ["masterpieces,good"],
    ["__proto__"],
    ["constructor"],
    ["toString"],
  ])("ignores %j", (value) => {
    expect(parseFilter(value)).toBeNull();
  });

  // ?filter=a&filter=b arrives as a list.
  it("uses the first value when the address repeats the filter", () => {
    expect(parseFilter(["good", "bad"])).toBe("good");
    expect(parseFilter(["nonsense", "bad"])).toBeNull();
    expect(parseFilter([])).toBeNull();
  });
});

describe("filterFilms (R34)", () => {
  const films = [
    film("Heat", 9, 9), // masterpieces
    film("Commando", 3, 9), // cheap-thrills
    film("Fine", 5, 5), // on-the-fence
    film("Solid", 8, 5), // good
    film("Alien", 10, 8), // masterpieces
  ];

  it("returns every film when there is no filter", () => {
    expect(filterFilms(films, null)).toEqual(films);
  });

  it("keeps only films with the chosen placement, in their original order", () => {
    expect(filterFilms(films, "masterpieces").map((f) => f.title)).toEqual([
      "Heat",
      "Alien",
    ]);
    expect(filterFilms(films, "good").map((f) => f.title)).toEqual(["Solid"]);
  });

  // E23: the "On the fence" filter lists exactly the films left at 5/5.
  it("finds the films left at 5/5", () => {
    expect(filterFilms(films, "on-the-fence").map((f) => f.title)).toEqual([
      "Fine",
    ]);
  });

  it("returns an empty list when nothing has that placement", () => {
    expect(filterFilms(films, "dumpster-fires")).toEqual([]);
  });

  // The list under a chip must be as long as the number on the chip.
  it("always agrees with the counts shown on the chips", () => {
    const counts = countByPlacement(films.map((f) => f.point));
    for (const placement of PLACEMENTS) {
      expect(filterFilms(films, placement)).toHaveLength(counts[placement]);
    }
  });

  it("does not change the list it was given", () => {
    const before = [...films];
    filterFilms(films, "good");
    expect(films).toEqual(before);
  });
});

describe("newestFirst (R36)", () => {
  it("puts the most recently rated film first", () => {
    const films = [
      film("Oldest", 5, 5, "2026-01-01T10:00:00Z"),
      film("Newest", 5, 5, "2026-11-14T10:00:00Z"),
      film("Middle", 5, 5, "2026-06-01T10:00:00Z"),
    ];
    expect(newestFirst(films).map((f) => f.title)).toEqual([
      "Newest",
      "Middle",
      "Oldest",
    ]);
  });

  // Postgres writes times with an offset and microseconds. Comparing them
  // as text would get this pair the wrong way round.
  it("compares real moments, not text", () => {
    const films = [
      film("Earlier", 5, 5, "2026-11-14T23:30:00+00:00"),
      film("Later", 5, 5, "2026-11-14T09:00:00.123456-18:00"),
    ];
    expect(newestFirst(films).map((f) => f.title)).toEqual([
      "Later",
      "Earlier",
    ]);
  });

  it("keeps films rated at the same moment in their original order", () => {
    const films = [
      film("A", 5, 5, "2026-11-14T10:00:00Z"),
      film("B", 5, 5, "2026-11-14T10:00:00Z"),
    ];
    expect(newestFirst(films).map((f) => f.title)).toEqual(["A", "B"]);
  });

  it("does not change the list it was given", () => {
    const films = [
      film("Old", 5, 5, "2026-01-01T00:00:00Z"),
      film("New", 5, 5, "2026-02-01T00:00:00Z"),
    ];
    newestFirst(films);
    expect(films.map((f) => f.title)).toEqual(["Old", "New"]);
  });
});

describe("FILTER_ROWS", () => {
  it("has three rows: corners, inner bands, on a line", () => {
    expect(FILTER_ROWS.map((row) => row.placements.length)).toEqual([4, 4, 5]);
  });

  it("contains each of the thirteen placements exactly once", () => {
    const all = FILTER_ROWS.flatMap((row) => row.placements);
    expect(all).toHaveLength(13);
    expect([...all].sort()).toEqual([...PLACEMENTS].sort());
  });
});

describe("filterHref", () => {
  it("adds the filter to the page address", () => {
    expect(filterHref("/", "guilty-pleasures")).toBe(
      "/?filter=guilty-pleasures",
    );
    expect(filterHref("/friends", "good")).toBe("/friends?filter=good");
  });

  it("gives the plain address for 'all films'", () => {
    expect(filterHref("/", null)).toBe("/");
    expect(filterHref("/friends", null)).toBe("/friends");
  });

  // The friends page also has ?sort=. Choosing a filter must not undo it.
  it("keeps other settings that are in the address", () => {
    expect(filterHref("/friends", "good", { sort: "disagreement" })).toBe(
      "/friends?sort=disagreement&filter=good",
    );
    expect(filterHref("/friends", null, { sort: "disagreement" })).toBe(
      "/friends?sort=disagreement",
    );
  });
});
