import Link from "next/link";
import type { ListFilm } from "@/components/film/FilmList";
import { PosterImage } from "@/components/film/PosterImage";
import { FILM_LINK } from "@/components/film/rowLayout";
import {
  formatScore,
  roundToOneDecimal,
  type FilmInCommon,
  type Point,
} from "@/lib/quadrant";

type Props = {
  /** From filmsInCommon: the biggest disagreement first. */
  pairs: readonly FilmInCommon<ListFilm>[];
  /** The other member's name, for their line on each film. */
  theirName: string;
};

/** "Quality 8 · Enjoyment 9": both numbers always carry their names. */
const scores = (point: Point) =>
  `Quality ${formatScore(point.quality)} · Enjoyment ${formatScore(point.enjoyment)}`;

/**
 * The films two members have both rated (R76, design 21.2): each with both
 * ratings and how far apart they are, the biggest disagreement first, each
 * linking to its film page. Server-drawn.
 */
export function CommonFilms({ pairs, theirName }: Props) {
  if (pairs.length === 0) {
    // E57, E58
    return (
      <p className="text-sm text-ink-muted">
        No films rated by both of you yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-well rounded-2xl bg-card">
      {pairs.map(({ film, mine, theirs, apart }) => (
        <li key={film.tmdbId}>
          <Link href={`/film/${film.tmdbId}`} className={FILM_LINK}>
            <PosterImage
              posterPath={film.posterPath}
              title={film.title}
              size="list"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium break-words">{film.title}</span>
              <span className="text-sm">You: {scores(mine)}</span>
              <span className="text-sm break-words">
                {theirName}: {scores(theirs)}
              </span>
              {/* The spoke map's distance, rounded only here, in words
                  when it is zero (as in the disagreement table, E13). */}
              <span className="text-sm font-medium">
                {apart === 0
                  ? "Same scores"
                  : `${formatScore(roundToOneDecimal(apart))} apart`}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
