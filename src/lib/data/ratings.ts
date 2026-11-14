// Reads with the member's session, so server only.
import "server-only";

import type { ListFilm } from "@/components/film/FilmList";
import { createClient } from "@/lib/supabase/server";

/**
 * Every film one member has rated, with their scores: the data behind the
 * "My films" chart and list (R30, R33), and later a friend's page (R46).
 *
 * It reads with the signed-in member's own session, so the database's rules
 * decide what comes back: a member sees every member's ratings, and anyone
 * else sees nothing at all. This function adds no access checks of its own
 * and needs none.
 *
 * One query fetches each rating together with its film. In the select
 * below, "titles (...)" tells Supabase to follow the link from
 * ratings.title_id to the titles table and bring those columns back nested
 * inside each row. That is one round trip instead of one per film.
 */
export async function loadMemberFilms(userId: string): Promise<ListFilm[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ratings")
    .select(
      "quality, enjoyment, created_at, updated_at, titles (tmdb_id, title, release_year, poster_path)",
    )
    .eq("user_id", userId)
    // Only the member's current opinion of each film. Older viewings (when
    // the rewatch log exists, NFR19) are not part of the chart.
    .eq("is_current", true);

  if (error) {
    throw new Error("Could not load the films.", { cause: error });
  }

  return data.map((row) => ({
    tmdbId: row.titles.tmdb_id,
    title: row.titles.title,
    year: row.titles.release_year,
    posterPath: row.titles.poster_path,
    point: { quality: row.quality, enjoyment: row.enjoyment },
    // "Most recently rated" means when the film was FIRST rated, not when
    // the rating was last changed (the owner's decision, 2026-11-14). The
    // list then stays in the order films were logged, and correcting a
    // score in place does not make the film jump to the top.
    ratedAt: row.created_at,
    // Stamped by the database on every save. Used only to tell that a
    // rating has just been saved again, never for ordering.
    changedAt: row.updated_at,
  }));
}
