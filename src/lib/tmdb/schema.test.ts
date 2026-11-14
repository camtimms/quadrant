import { describe, expect, it } from "vitest";
import { parseMovie, parseSearchResponse, yearOf } from "@/lib/tmdb/schema";

// These fixtures are REAL responses captured from TMDB (see fixtures/README.md),
// not shapes written from memory. If the parser passes these, it works on what
// TMDB actually sends.
import movieNoPoster from "./fixtures/movie-no-poster.json";
import movieNoReleaseDate from "./fixtures/movie-no-release-date.json";
import movieNormal from "./fixtures/movie-normal.json";
import movieNotFound from "./fixtures/movie-not-found.json";
import searchCommando from "./fixtures/search-commando.json";
import searchEmpty from "./fixtures/search-empty.json";

describe("parseSearchResponse", () => {
  const films = parseSearchResponse(searchCommando);

  it("keeps every result on the page", () => {
    expect(films).toHaveLength(searchCommando.results.length);
    expect(films).toHaveLength(20);
  });

  it("reads a normal film: id, title, year and poster path", () => {
    expect(films[0]).toEqual({
      tmdbId: 10999,
      title: "Commando",
      year: 1985,
      posterPath: "/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg",
    });
  });

  it("keeps only the four fields we use", () => {
    // TMDB sends about fifteen fields per film. Dropping the rest here means
    // nothing else in the app can start depending on them by accident.
    for (const film of films) {
      expect(Object.keys(film).sort()).toEqual([
        "posterPath",
        "title",
        "tmdbId",
        "year",
      ]);
    }
  });

  // V1: TMDB sends a missing poster as null...
  it("keeps a film with no poster, with posterPath null (R10)", () => {
    const film = films.find((f) => f.tmdbId === 1420715);
    expect(film).toEqual({
      tmdbId: 1420715,
      title: "Commando",
      year: 2013,
      posterPath: null,
    });
  });

  // ...but a missing release date as an empty string, not null.
  it("keeps a film with no release date, with year null (R10)", () => {
    const raw = searchCommando.results.find((r) => r.id === 718096);
    expect(raw?.release_date).toBe("");

    const film = films.find((f) => f.tmdbId === 718096);
    expect(film?.year).toBeNull();
    expect(film?.title).toBe("Commando");
  });

  it("returns an empty list for a search with no matches (R11)", () => {
    expect(parseSearchResponse(searchEmpty)).toEqual([]);
  });

  it("drops a result marked as adult", () => {
    const [first, ...rest] = searchCommando.results;
    const withAdult = {
      ...searchCommando,
      results: [{ ...first, adult: true }, ...rest],
    };
    const ids = parseSearchResponse(withAdult).map((f) => f.tmdbId);
    expect(ids).toHaveLength(19);
    expect(ids).not.toContain(first.id);
  });

  it("fails loudly on a shape it does not recognise", () => {
    expect(() => parseSearchResponse({ items: [] })).toThrow();
    expect(() => parseSearchResponse(null)).toThrow();
    // An error body is not a search result.
    expect(() => parseSearchResponse(movieNotFound)).toThrow();
  });

  it("fails loudly when one result is missing its title", () => {
    const broken = {
      results: [{ id: 1, release_date: "", poster_path: null }],
    };
    expect(() => parseSearchResponse(broken)).toThrow();
  });
});

describe("parseMovie", () => {
  it("reads a normal film from the details endpoint", () => {
    expect(parseMovie(movieNormal)).toEqual({
      tmdbId: 10999,
      title: "Commando",
      year: 1985,
      posterPath: "/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg",
    });
  });

  it("reads a film with no poster", () => {
    expect(parseMovie(movieNoPoster)).toEqual({
      tmdbId: 1420715,
      title: "Commando",
      year: 2013,
      posterPath: null,
    });
  });

  it("reads a film with no release date", () => {
    expect(movieNoReleaseDate.release_date).toBe("");
    expect(parseMovie(movieNoReleaseDate)).toMatchObject({
      tmdbId: 718096,
      year: null,
    });
  });

  it("rejects TMDB's 'not found' body", () => {
    expect(() => parseMovie(movieNotFound)).toThrow();
  });
});

describe("yearOf", () => {
  it("takes the year from a YYYY-MM-DD date", () => {
    expect(yearOf("1985-10-03")).toBe(1985);
  });

  it.each([[""], [null], [undefined], ["soon"], ["85-10-03"]])(
    "treats %j as 'year unknown'",
    (value) => {
      expect(yearOf(value)).toBeNull();
    },
  );
});
