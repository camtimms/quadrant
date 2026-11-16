import { disagreement } from "@/lib/quadrant/disagreement";
import type { Point } from "@/lib/quadrant/types";

/** The least a film needs to be paired: which film, its name, the scores. */
type Rated = { tmdbId: number; title: string; point: Point };

export type FilmInCommon<T extends Rated> = {
  /** The film, as the viewer's own list describes it. */
  film: T;
  mine: Point;
  theirs: Point;
  /** How far apart the two ratings are: the spoke map's measure (R41). */
  apart: number;
};

/**
 * The films two members have both rated, with both ratings and how far apart
 * they are, the biggest disagreement first (R76, design 21.2). Ties, and
 * exact agreement, are ordered by title, so the list reads the same on
 * every load.
 */
export function filmsInCommon<T extends Rated>(
  mine: readonly T[],
  theirs: readonly Rated[],
): FilmInCommon<T>[] {
  const theirsByFilm = new Map(theirs.map((film) => [film.tmdbId, film.point]));

  return mine
    .flatMap((film) => {
      const theirPoint = theirsByFilm.get(film.tmdbId);
      return theirPoint
        ? [
            {
              film,
              mine: film.point,
              theirs: theirPoint,
              apart: disagreement(film.point, theirPoint),
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        b.apart - a.apart ||
        a.film.title.localeCompare(b.film.title, undefined, {
          sensitivity: "base",
        }),
    );
}
