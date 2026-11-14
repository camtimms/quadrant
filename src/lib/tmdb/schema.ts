import { z } from "zod";

/**
 * Turning TMDB's JSON into the small shape this app uses (design section 4.1).
 *
 * TMDB sends about fifteen fields per film in a search and nearly thirty on
 * the details endpoint. We keep four. Everything is checked with Zod here, in
 * one place, so that a surprise from TMDB becomes one clear error instead of
 * an `undefined` turning up somewhere in the UI.
 *
 * What the real API does with missing values (checked with real calls on
 * 2026-11-14; the captured responses are in ./fixtures):
 *   - no poster        -> "poster_path": null
 *   - no release date  -> "release_date": ""   (an empty string, NOT null)
 *
 * This file has no secrets and makes no network calls, so it is safe to import
 * from anywhere, including tests.
 */

/** A film as the rest of the app sees it. */
export type TmdbFilm = {
  /** TMDB's own id for the film. */
  tmdbId: number;
  title: string;
  /** Release year, or null when TMDB has no date ("year unknown", R10). */
  year: number | null;
  /** TMDB's path such as "/abc.jpg" (not a full URL), or null (R10). */
  posterPath: string | null;
};

/**
 * The year from TMDB's "YYYY-MM-DD" release date.
 *
 * Anything that is not a date starting with four digits counts as unknown.
 * Every response seen so far uses "" for a missing date, but null and a
 * missing field are treated the same way: all three mean "we don't know",
 * and none of them is worth failing a whole search over.
 */
export function yearOf(releaseDate: string | null | undefined): number | null {
  const match = /^(\d{4})-/.exec(releaseDate ?? "");
  return match ? Number(match[1]) : null;
}

// The fields we read from one film. Zod ignores every other field by default,
// which is how the output ends up with only four.
const rawFilmSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  // Lenient on purpose: see yearOf above.
  release_date: z.string().nullish(),
  poster_path: z.string().nullish(),
});

// .transform runs after the checks pass and renames TMDB's snake_case fields
// to the camelCase names used in the rest of the app.
const filmSchema = rawFilmSchema.transform((raw): TmdbFilm => ({
  tmdbId: raw.id,
  title: raw.title,
  year: yearOf(raw.release_date),
  // An empty path would build a broken image address, so treat it as none.
  posterPath: raw.poster_path || null,
}));

const searchResponseSchema = z.object({ results: z.array(filmSchema) });

/**
 * Parse the body of `GET /3/search/movie`. Throws if it is not the expected
 * shape (for example an error body); an empty result list is fine.
 */
export function parseSearchResponse(body: unknown): TmdbFilm[] {
  return searchResponseSchema.parse(body).results;
}

/** Parse the body of `GET /3/movie/{id}`. Throws on any other shape. */
export function parseMovie(body: unknown): TmdbFilm {
  return filmSchema.parse(body);
}
