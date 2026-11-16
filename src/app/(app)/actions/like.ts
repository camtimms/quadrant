"use server";

// "use server": the exported function is a Server Action, callable from the
// like button in the browser but always run on the server. Like every
// Server Action it is a public door, callable with any values, so it checks
// everything itself (see rating.ts).

import { refresh } from "next/cache";
import { getCurrentMember } from "@/lib/auth/member";
import { createClient } from "@/lib/supabase/server";

export type LikeResult =
  { status: "ok" } | { status: "error"; message: string };

/** Postgres's "already exists" code: the like is already there. */
const ALREADY_LIKED = "23505";

/**
 * Like (`liked` true) or take back a like of (`liked` false) one review
 * (R69, design 20.3).
 *
 * It is told the state the member wants, not "flip it": two quick presses,
 * or a press that arrives late, then cannot leave the like the wrong way
 * round. Liking an already-liked review, or unliking one that is not, is
 * simply done (E51).
 *
 * The liker is always the signed-in member, taken from the session. The
 * database's own rules (migration 6) also refuse a like on someone else's
 * behalf, by a non-member, or on a rating with no review (E54).
 */
export async function setReviewLike(
  ratingId: number,
  liked: boolean,
): Promise<LikeResult> {
  const fail = (message: string): LikeResult => ({ status: "error", message });

  // Checked before anything else: a Server Action can be sent anything.
  if (
    typeof ratingId !== "number" ||
    !Number.isSafeInteger(ratingId) ||
    ratingId < 1 ||
    typeof liked !== "boolean"
  ) {
    return fail("That review couldn't be found.");
  }

  try {
    const member = await getCurrentMember();
    if (!member) return fail("Your session expired. Sign in again to like.");
    if (!member.isMember) return fail("Only members can like reviews.");

    const supabase = await createClient();
    const { error } = liked
      ? await supabase
          .from("review_likes")
          .insert({ rating_id: ratingId, user_id: member.userId })
      : await supabase
          .from("review_likes")
          .delete()
          .eq("rating_id", ratingId)
          .eq("user_id", member.userId);

    if (error && !(liked && error.code === ALREADY_LIKED)) {
      console.error("Saving a like failed:", error);
      return fail("That like couldn't be saved. Please try again.");
    }
  } catch (error) {
    console.error("setReviewLike failed unexpectedly:", error);
    return fail("That like couldn't be saved. Please try again.");
  }

  // Redraw the page with the database's own answer: the count and names.
  refresh();
  return { status: "ok" };
}
