"use server";

// "use server" turns every exported function in this file into a Server
// Action: something a form in the browser can call, but which always runs on
// the server. A Server Action is a public door. Anyone can call it with any
// values, without using our form, so each one checks everything itself.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/member";
import { createClient } from "@/lib/supabase/server";
import { ensureTitle } from "@/lib/titles/ensureTitle";
import {
  parseRatingInput,
  parseTmdbId,
  type DeleteRatingState,
  type RatingFormState,
  type RatingFormValues,
} from "@/lib/validation/rating";

// Messages the member can act on. Internal details (database error text,
// TMDB status codes) go to the server log and are never shown (design §9).
const SESSION_EXPIRED = "Your session expired. Sign in again to save.";
const NOT_SAVED = "That couldn't be saved. Please try again.";

/** Postgres's code for "permission denied", or a policy refusing a row. */
const PERMISSION_DENIED = "42501";

/** Form values are text or files; treat anything else as empty text. */
function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/**
 * Save the member's rating of a film: create it, or change it if they have
 * already rated the film (R15, R19, R20). On success it does not return:
 * it sends the member to My films, where the film is pointed out (R23).
 *
 * Used with React's useActionState, which is why the first argument is
 * "whatever this returned last time" (unused, hence the underscore).
 *
 * The form sends: tmdb_id, quality, enjoyment, review.
 *
 * Expected problems are RETURNED as { status: "error", ... } together with
 * what was typed, so the form can show the message and refill itself. A
 * failed save must never lose someone's review (E19).
 */
export async function saveRating(
  _previous: RatingFormState,
  formData: FormData,
): Promise<RatingFormState> {
  // What was typed, kept as text so it can be handed straight back.
  const values: RatingFormValues = {
    quality: text(formData.get("quality")),
    enjoyment: text(formData.get("enjoyment")),
    review: text(formData.get("review")),
  };
  const fail = (
    message: string,
    field?: "quality" | "enjoyment" | "review",
  ): RatingFormState => ({ status: "error", message, field, values });

  // 1. Is the request well-formed? Checked first because it is free: no
  //    database, no network. The raw form values are passed (not `values`)
  //    so that a field left out entirely is caught as missing.
  const tmdbId = parseTmdbId(formData.get("tmdb_id"));
  if (tmdbId === null) return fail("We couldn't find that film.");

  const parsed = parseRatingInput({
    quality: formData.get("quality"),
    enjoyment: formData.get("enjoyment"),
    review: formData.get("review"),
  });
  if (!parsed.ok) return fail(parsed.message, parsed.field);
  const rating = parsed.value;

  try {
    // 2. Who is asking? This MUST come before step 3. Storing a film uses
    //    the secret key, which bypasses the database's rules, so nothing
    //    else stands between a stranger and that step.
    const member = await getCurrentMember();
    if (!member) return fail(SESSION_EXPIRED);
    if (!member.isMember) {
      return fail(
        "You are no longer on the invite list, so this wasn't saved.",
      );
    }
    if (member.displayName === null) {
      return fail("Choose a display name before rating a film.");
    }

    // 3. Make sure we have our own copy of the film. The browser sent only
    //    an id; the title, year and poster come from TMDB (design §4.2).
    const film = await ensureTitle(tmdbId);
    if (!film.ok) {
      return fail(
        film.reason === "not-found"
          ? "We couldn't find that film."
          : "Film details can't be loaded right now, so this wasn't saved. Try again in a moment.",
      );
    }

    // 4. Save, as the member. This client carries their session, so the
    //    database's own rules apply: it stores the rating under THEIR id
    //    whatever this code says, and re-checks the scores and the review.
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_rating", {
      p_title_id: film.title.id,
      p_quality: rating.quality,
      p_enjoyment: rating.enjoyment,
      // "No review" is sent as "", which save_rating stores as null.
      p_review: rating.review,
    });
    if (error) {
      console.error("save_rating failed:", error);
      // The session can run out between step 2 and here.
      return fail(
        error.code === PERMISSION_DENIED ? SESSION_EXPIRED : NOT_SAVED,
      );
    }
  } catch (error) {
    // Something unexpected (the database unreachable, say). For most actions
    // throwing would be right, but here the member may have a review typed
    // in, and the error page would throw it away.
    console.error("saveRating failed unexpectedly:", error);
    return fail(NOT_SAVED);
  }

  // 5. Saved. Take the member to My films, where the film now sits on
  //    their chart (R23). "?rated=" tells that page which film to point
  //    out; it is only a pointer, and the page works out the placement
  //    itself from what is stored.
  //
  //    redirect() works by throwing a special signal that Next.js catches,
  //    so it MUST be outside the try/catch above. Inside it, our own catch
  //    would swallow the signal and report a successful save as a failure.
  redirect(`/?rated=${tmdbId}`);
}

/**
 * Delete the member's own rating of a film (R21). The form sends title_id,
 * which is OUR id for the film (titles.id), not TMDB's.
 *
 * Asking "are you sure?" is the form's job; by the time this runs, the
 * member has confirmed.
 */
export async function deleteRating(
  _previous: DeleteRatingState,
  formData: FormData,
): Promise<DeleteRatingState> {
  const fail = (message: string): DeleteRatingState => ({
    status: "error",
    message,
  });

  const rawTitleId = formData.get("title_id");
  if (typeof rawTitleId !== "string" || !/^[1-9]\d{0,15}$/.test(rawTitleId)) {
    return fail("We couldn't find that film.");
  }
  const titleId = Number(rawTitleId);

  try {
    const member = await getCurrentMember();
    if (!member) return fail("Your session expired. Sign in again to delete.");

    // Only rows that are the member's own AND for this film. The user id
    // comes from the verified session, never from the form. Even if it did
    // not, the database's policy lets a member delete only their own rows.
    const supabase = await createClient();
    const { error } = await supabase
      .from("ratings")
      .delete()
      .eq("user_id", member.userId)
      .eq("title_id", titleId)
      .eq("is_current", true);
    if (error) {
      console.error("Deleting a rating failed:", error);
      return fail("That couldn't be deleted. Please try again.");
    }
  } catch (error) {
    console.error("deleteRating failed unexpectedly:", error);
    return fail("That couldn't be deleted. Please try again.");
  }

  // Nothing to delete is still a success: the rating is gone either way,
  // which is what the member asked for (pressing Delete twice is harmless).
  refresh();
  return { status: "deleted" };
}
