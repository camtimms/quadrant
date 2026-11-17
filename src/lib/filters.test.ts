import { describe, expect, it } from "vitest";
import {
  filterHref,
  filterFilms,
  filterTitle,
  matchesFilter,
  newestFirst,
  NO_FILTER,
  parseFilmFilter,
  parseFilter,
  quarterCount,
  QUARTERS,
  type FilmFilter,
  type Quarter,
} from "@/lib/filters";
import {
  classify,
  PLACEMENTS,
  countByPlacement,
  type Placement,
} from "@/lib/quadrant";

/** A filter for one placement, the way a finer chip or an old link sets it. */
const only = (
  placement: Placement,
  quarter: Quarter | null = null,
): FilmFilter => ({
  quarter,
  placement,
});
const whole = (quarter: Quarter): FilmFilter => ({ quarter, placement: null });

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
    expect(filterFilms(films, NO_FILTER)).toEqual(films);
  });

  it("keeps only films with the chosen placement, in their original order", () => {
    expect(
      filterFilms(films, only("masterpieces")).map((f) => f.title),
    ).toEqual(["Heat", "Alien"]);
    expect(filterFilms(films, only("good")).map((f) => f.title)).toEqual([
      "Solid",
    ]);
  });

  // E23: the "On the fence" filter lists exactly the films left at 5/5.
  it("finds the films left at 5/5", () => {
    expect(
      filterFilms(films, only("on-the-fence")).map((f) => f.title),
    ).toEqual(["Fine"]);
  });

  it("returns an empty list when nothing has that placement", () => {
    expect(filterFilms(films, only("dumpster-fires"))).toEqual([]);
  });

  // The list under a chip must be as long as the number on the chip.
  it("always agrees with the counts shown on the chips", () => {
    const counts = countByPlacement(films.map((f) => f.point));
    for (const placement of PLACEMENTS) {
      expect(filterFilms(films, only(placement))).toHaveLength(
        counts[placement],
      );
    }
  });

  it("does not change the list it was given", () => {
    const before = [...films];
    filterFilms(films, only("good"));
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

// R88, R91: the four quadrants and what each holds.
describe("QUARTERS", () => {
  const holds = (quarter: Quarter) =>
    QUARTERS.find((q) => q.quarter === quarter)!.placements;

  it("are the four quadrants, named by their corners", () => {
    expect(QUARTERS.map((q) => [q.quarter, q.corner])).toEqual([
      ["top-right", "masterpieces"],
      ["top-left", "guilty-pleasures"],
      ["bottom-right", "serious-watches"],
      ["bottom-left", "dumpster-fires"],
    ]);
  });

  it("hold their corner, band and two edges, in chip order", () => {
    expect(holds("top-right")).toEqual([
      "masterpieces",
      "worth-watching",
      "good",
      "enjoyable",
    ]);
    expect(holds("top-left")).toEqual([
      "guilty-pleasures",
      "cheap-thrills",
      "bad",
      "enjoyable",
    ]);
    expect(holds("bottom-right")).toEqual([
      "serious-watches",
      "respectable",
      "good",
      "not-enjoyable",
    ]);
    expect(holds("bottom-left")).toEqual([
      "dumpster-fires",
      "not-worth-watching",
      "bad",
      "not-enjoyable",
    ]);
  });

  it("put each line placement in two quadrants and On the fence in none", () => {
    const times = (placement: Placement) =>
      QUARTERS.filter((q) => q.placements.includes(placement)).length;
    for (const placement of [
      "good",
      "bad",
      "enjoyable",
      "not-enjoyable",
    ] as const) {
      expect(times(placement)).toBe(2);
    }
    expect(times("on-the-fence")).toBe(0);
    for (const placement of PLACEMENTS.slice(0, 8)) {
      expect(times(placement)).toBe(1);
    }
  });
});

describe("parseFilmFilter", () => {
  it("is no filter when the address has none", () => {
    expect(parseFilmFilter(undefined, undefined)).toEqual(NO_FILTER);
  });

  it("reads a quadrant on its own", () => {
    expect(parseFilmFilter("top-left", undefined)).toEqual(whole("top-left"));
  });

  it("reads a quadrant with one of its finer chips", () => {
    expect(parseFilmFilter("bottom-right", "good")).toEqual(
      only("good", "bottom-right"),
    );
    expect(parseFilmFilter("top-right", "masterpieces")).toEqual(
      only("masterpieces", "top-right"),
    );
  });

  // E75: a placement outside the quadrant is dropped.
  it("ignores a placement that is not in the quadrant", () => {
    expect(parseFilmFilter("top-right", "dumpster-fires")).toEqual(
      whole("top-right"),
    );
    expect(parseFilmFilter("top-right", "on-the-fence")).toEqual(
      whole("top-right"),
    );
  });

  // E74: an address from before quadrants still works.
  it.each([
    ["masterpieces", "top-right"],
    ["worth-watching", "top-right"],
    ["guilty-pleasures", "top-left"],
    ["cheap-thrills", "top-left"],
    ["serious-watches", "bottom-right"],
    ["respectable", "bottom-right"],
    ["dumpster-fires", "bottom-left"],
    ["not-worth-watching", "bottom-left"],
    ["good", "top-right"],
    ["bad", "top-left"],
    ["enjoyable", "top-right"],
    ["not-enjoyable", "bottom-right"],
  ] as const)("opens %s in the %s quadrant", (placement, quarter) => {
    expect(parseFilmFilter(undefined, placement)).toEqual(
      only(placement, quarter),
    );
  });

  // R90: On the fence belongs to no quadrant.
  it("keeps On the fence on its own", () => {
    expect(parseFilmFilter(undefined, "on-the-fence")).toEqual(
      only("on-the-fence"),
    );
  });

  it.each([
    ["nonsense", undefined],
    ["Top-Right", undefined],
    ["__proto__", "good"],
    [["top-left", "top-right"], undefined],
  ] as const)("ignores a quadrant of %j", (quarter, placement) => {
    const parsed = parseFilmFilter(quarter as never, placement);
    if (quarter === "__proto__")
      expect(parsed).toEqual(only("good", "top-right"));
    else if (Array.isArray(quarter)) expect(parsed).toEqual(whole("top-left"));
    else expect(parsed).toEqual(NO_FILTER);
  });
});

describe("matchesFilter (R89, R91)", () => {
  // Every whole-number point on the chart.
  const points = Array.from({ length: 121 }, (_, i) => ({
    quality: Math.floor(i / 11),
    enjoyment: i % 11,
  }));

  it("matches everything with no filter", () => {
    expect(points.every((point) => matchesFilter(point, NO_FILTER))).toBe(true);
  });

  it("matches a quadrant's four placements and nothing else", () => {
    for (const { quarter, placements } of QUARTERS) {
      for (const point of points) {
        expect(matchesFilter(point, whole(quarter))).toBe(
          placements.includes(classify(point)),
        );
      }
    }
  });

  it("puts a film on a line in both neighbouring quadrants", () => {
    const good = { quality: 8, enjoyment: 5 };
    expect(matchesFilter(good, whole("top-right"))).toBe(true);
    expect(matchesFilter(good, whole("bottom-right"))).toBe(true);
    expect(matchesFilter(good, whole("top-left"))).toBe(false);
  });

  it("puts a 5 / 5 film in no quadrant", () => {
    const fence = { quality: 5, enjoyment: 5 };
    for (const { quarter } of QUARTERS) {
      expect(matchesFilter(fence, whole(quarter))).toBe(false);
    }
    expect(matchesFilter(fence, only("on-the-fence"))).toBe(true);
  });

  it("narrows to the chosen finer chip", () => {
    expect(
      matchesFilter(
        { quality: 9, enjoyment: 9 },
        only("masterpieces", "top-right"),
      ),
    ).toBe(true);
    expect(
      matchesFilter(
        { quality: 6, enjoyment: 6 },
        only("masterpieces", "top-right"),
      ),
    ).toBe(false);
  });
});

describe("quarterCount", () => {
  // The number on a quadrant chip is the length of its list.
  it("agrees with the list under the quadrant", () => {
    const films = [
      film("A", 9, 9),
      film("B", 6, 6),
      film("C", 8, 5),
      film("D", 5, 8),
      film("E", 5, 5),
      film("F", 1, 1),
    ];
    const counts = countByPlacement(films.map((f) => f.point));
    for (const { quarter } of QUARTERS) {
      expect(quarterCount(counts, quarter)).toBe(
        filterFilms(films, whole(quarter)).length,
      );
    }
    expect(quarterCount(counts, "top-right")).toBe(4);
  });
});

describe("filterHref", () => {
  it("adds a quadrant, and a finer chip within it, to the address", () => {
    expect(filterHref("/", whole("top-left"))).toBe("/?quarter=top-left");
    expect(filterHref("/friends", only("good", "bottom-right"))).toBe(
      "/friends?quarter=bottom-right&filter=good",
    );
    expect(filterHref("/", only("on-the-fence"))).toBe("/?filter=on-the-fence");
  });

  it("gives the plain address for 'all films'", () => {
    expect(filterHref("/", NO_FILTER)).toBe("/");
    expect(filterHref("/friends", NO_FILTER)).toBe("/friends");
  });

  // The friends page also has ?sort=. Choosing a filter must not undo it.
  it("keeps other settings that are in the address", () => {
    expect(
      filterHref("/friends", only("good", "top-right"), {
        sort: "disagreement",
      }),
    ).toBe("/friends?sort=disagreement&quarter=top-right&filter=good");
    expect(filterHref("/friends", NO_FILTER, { sort: "disagreement" })).toBe(
      "/friends?sort=disagreement",
    );
  });

  it("round-trips through parseFilmFilter", () => {
    for (const filter of [
      NO_FILTER,
      whole("bottom-left"),
      only("bad", "bottom-left"),
      only("on-the-fence"),
    ]) {
      const params = new URL(filterHref("/", filter), "http://x").searchParams;
      expect(
        parseFilmFilter(
          params.get("quarter") ?? undefined,
          params.get("filter") ?? undefined,
        ),
      ).toEqual(filter);
    }
  });
});

// The heading above the list names what is shown.
describe("filterTitle", () => {
  it.each([
    [NO_FILTER, "All films"],
    [whole("top-right"), "Masterpieces quadrant"],
    [whole("bottom-left"), "Dumpster Fires quadrant"],
    [only("masterpieces", "top-right"), "Only Masterpieces"],
    [only("good", "bottom-right"), "Good"],
    [only("on-the-fence"), "On the fence"],
  ] as const)("names %j as %s", (filter, title) => {
    expect(filterTitle(filter)).toBe(title);
  });
});
