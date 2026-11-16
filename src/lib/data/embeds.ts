/**
 * Shared pieces of query text (Supabase's "select" strings).
 *
 * A rating's author, nested under it: the member's display name and
 * picture. The link is NAMED (`!ratings_user_id_fkey`, the foreign key from
 * ratings.user_id to profiles.id) because ratings and profiles are linked
 * two ways since migration 6: directly, and through review_likes (who liked
 * a review). Unnamed, Supabase cannot tell which is meant and refuses the
 * whole query (design 20.4). embeds.test.ts fails on any unnamed
 * "profiles (" in src/lib/data, so a new query cannot forget this.
 */
export const RATING_AUTHOR =
  "profiles!ratings_user_id_fkey (display_name, avatar_url)";

/**
 * Who liked a rating's review (R70), nested under the rating: each like's
 * member id and display name. The likes table links to profiles only once,
 * but the link is named anyway, so "always name it" has no exceptions.
 */
export const REVIEW_LIKERS =
  "review_likes (user_id, profiles!review_likes_user_id_fkey (display_name))";
