import Link from "next/link";
import { PendingMark } from "@/components/PendingMark";
import { PosterImage } from "@/components/film/PosterImage";
import type { TmdbFilm } from "@/lib/tmdb/schema";

/**
 * One film in a list: poster, title and year, all one link to the film's
 * page (R13).
 *
 * The year matters as much as the title: remakes share a name, and the year
 * and poster are how a member tells them apart (edge case E7).
 */
export function FilmCard({ film }: { film: TmdbFilm }) {
  return (
    <Link
      href={`/film/${film.tmdbId}`}
      className="flex items-center gap-4 rounded p-2 hover:bg-foreground/10 active:bg-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <PosterImage
        posterPath={film.posterPath}
        title={film.title}
        size="list"
      />
      {/* min-w-0 lets a very long title wrap instead of pushing the row
          wider than a phone screen. */}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-medium break-words">{film.title}</span>
        <span className="text-sm opacity-70">
          {film.year ?? "Year unknown"}
        </span>
      </span>
      {/* Spins while this film's page is loading. "ml-auto" pushes it
          to the right-hand end of the row. */}
      <PendingMark className="ml-auto" />
    </Link>
  );
}
