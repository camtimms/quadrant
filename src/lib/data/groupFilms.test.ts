import { describe, expect, it } from "vitest";
import {
  groupFilms,
  parseSort,
  sortGroupFilms,
  sortHref,
  type GroupFilm,
  type RatingRow,
} from "@/lib/data/groupFilms";

/** One member's rating of a film, as the loader hands it over. */
function row(
  tmdbId: number,
  quality: number,
  enjoyment: number,
  ratedAt = "2026-11-01T10:00:00+00:00",
): RatingRow {
  return {
    tmdbId,
    title: `Film ${tmdbId}`,
    year: 1990,
    posterPath: null,
    point: { quality, enjoyment },
    ratedAt,
  };
}

describe("groupFilms (R43, R44, R45)", () => {
  it("makes one film out of every member's rating of it", () => {
    const films = groupFilms([row(1, 9, 9), row(2, 3, 3), row(1, 7, 8)]);

    expect(films.map((film) => film.tmdbId)).toEqual([1, 2]);
  });

  it("keeps the film's own details", () => {
    const [film] = groupFilms([
      { ...row(1, 9, 9), title: "Heat", year: 1995, posterPath: "/h.jpg" },
    ]);

    expect(film).toMatchObject({
      tmdbId: 1,
      title: "Heat",
      year: 1995,
      posterPath: "/h.jpg",
    });
  });

  it("places the film at the average of its ratings", () => {
    const [film] = groupFilms([row(1, 9, 4), row(1, 6, 5), row(1, 7, 9)]);

    // (9 + 6 + 7) / 3 = 7.33 → 7.3, and (4 + 5 + 9) / 3 = 6.
    expect(film.point).toEqual({ quality: 7.3, enjoyment: 6 });
  });

  // The same rounding rule as everywhere else: halves round up (R27).
  it("rounds an average ending in exactly .05 up", () => {
    // 101 / 20 = 5.05, which a computer holds as 5.0499999...
    const rows = [
      ...Array.from({ length: 19 }, () => row(1, 5, 5)),
      row(1, 6, 5),
    ];

    expect(groupFilms(rows)[0].point.quality).toBe(5.1);
  });

  it("counts how many members rated each film", () => {
    const films = groupFilms([row(1, 9, 9), row(2, 3, 3), row(1, 7, 8)]);

    expect(films.map((film) => film.ratedBy)).toEqual([2, 1]);
  });

  it("gives the biggest disagreement between any two of its ratings", () => {
    // 5/5 and 2/9 are 5 apart (a 3-4-5 triangle); the third is nearer both.
    const [film] = groupFilms([row(1, 5, 5), row(1, 2, 9), row(1, 4, 6)]);

    expect(film.disagreement).toBe(5);
  });

  it("gives a disagreement of 0 when everyone agrees exactly", () => {
    expect(groupFilms([row(1, 7, 7), row(1, 7, 7)])[0].disagreement).toBe(0);
  });

  // R45, E11: one rating is nobody disagreeing with anybody. That is "no
  // value", which is different from 0.
  describe("a film only one member has rated", () => {
    const [film] = groupFilms([row(1, 3, 9)]);

    it("has no disagreement value, not 0", () => {
      expect(film.disagreement).toBeNull();
    });

    it("has that one rating as its average", () => {
      expect(film.point).toEqual({ quality: 3, enjoyment: 9 });
      expect(film.ratedBy).toBe(1);
    });
  });

  // E14: 0 is a real score, not a missing one.
  it("counts a score of 0 in the average", () => {
    expect(groupFilms([row(1, 0, 0), row(1, 10, 5)])[0].point).toEqual({
      quality: 5,
      enjoyment: 2.5,
    });
  });

  it("dates the film by the most recent time anyone rated it", () => {
    const [film] = groupFilms([
      row(1, 5, 5, "2026-11-03T10:00:00+00:00"),
      row(1, 5, 5, "2026-11-09T10:00:00+00:00"),
      row(1, 5, 5, "2026-11-05T10:00:00+00:00"),
    ]);

    expect(film.ratedAt).toBe("2026-11-09T10:00:00+00:00");
  });

  // Compared as moments, not as text: 23:00 at +00:00 is LATER than 23:30
  // at +02:00, though it sorts earlier as text.
  it("compares times written with different offsets correctly", () => {
    const [film] = groupFilms([
      row(1, 5, 5, "2026-11-09T23:30:00+02:00"),
      row(1, 5, 5, "2026-11-09T23:00:00+00:00"),
    ]);

    expect(film.ratedAt).toBe("2026-11-09T23:00:00+00:00");
  });

  it("returns nothing when nobody has rated anything", () => {
    expect(groupFilms([])).toEqual([]);
  });
});

describe("parseSort", () => {
  it("accepts the two orders", () => {
    expect(parseSort("recent")).toBe("recent");
    expect(parseSort("disagreement")).toBe("disagreement");
  });

  it("falls back to most recent for anything else", () => {
    expect(parseSort(undefined)).toBe("recent");
    expect(parseSort("")).toBe("recent");
    expect(parseSort("DISAGREEMENT")).toBe("recent");
    expect(parseSort("constructor")).toBe("recent");
  });

  it("uses the first value when the address repeats the setting", () => {
    expect(parseSort(["disagreement", "recent"])).toBe("disagreement");
  });
});

describe("sortGroupFilms (R44)", () => {
  function film(
    tmdbId: number,
    disagreement: number | null,
    ratedAt: string,
  ): GroupFilm {
    return {
      ...row(tmdbId, 5, 5, ratedAt),
      ratedBy: disagreement === null ? 1 : 2,
      disagreement,
    };
  }
  const ids = (films: GroupFilm[]) => films.map((f) => f.tmdbId);

  const FILMS = [
    film(1, 2, "2026-11-01T10:00:00+00:00"),
    film(2, null, "2026-11-09T10:00:00+00:00"),
    film(3, 9.5, "2026-11-03T10:00:00+00:00"),
    film(4, 0, "2026-11-07T10:00:00+00:00"),
    film(5, null, "2026-11-02T10:00:00+00:00"),
  ];

  it("puts the most recently rated first", () => {
    expect(ids(sortGroupFilms(FILMS, "recent"))).toEqual([2, 4, 3, 5, 1]);
  });

  it("puts the largest disagreement first", () => {
    expect(ids(sortGroupFilms(FILMS, "disagreement")).slice(0, 3)).toEqual([
      3, 1, 4,
    ]);
  });

  // A film with one rating has no disagreement at all. It goes after even a
  // film everyone agrees on exactly (0), which does have a value.
  it("puts films with a single rating last, after a disagreement of 0", () => {
    expect(ids(sortGroupFilms(FILMS, "disagreement"))).toEqual([3, 1, 4, 2, 5]);
  });

  it("orders films with the same disagreement by most recent", () => {
    const tied = [
      film(1, 4, "2026-11-01T10:00:00+00:00"),
      film(2, 4, "2026-11-09T10:00:00+00:00"),
      film(3, 4, "2026-11-05T10:00:00+00:00"),
    ];

    expect(ids(sortGroupFilms(tied, "disagreement"))).toEqual([2, 3, 1]);
  });

  it("leaves the list it was given alone", () => {
    const before = ids(FILMS);
    sortGroupFilms(FILMS, "disagreement");
    sortGroupFilms(FILMS, "recent");

    expect(ids(FILMS)).toEqual(before);
  });
});

describe("sortHref", () => {
  it("leaves the default order out of the address", () => {
    expect(sortHref("recent", null)).toBe("/friends");
  });

  it("names the other order", () => {
    expect(sortHref("disagreement", null)).toBe("/friends?sort=disagreement");
  });

  it("keeps the chosen filter", () => {
    expect(sortHref("recent", "masterpieces")).toBe(
      "/friends?filter=masterpieces",
    );
    expect(sortHref("disagreement", "masterpieces")).toBe(
      "/friends?sort=disagreement&filter=masterpieces",
    );
  });
});
