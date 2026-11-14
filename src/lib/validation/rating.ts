import type { Score } from "@/lib/quadrant";
import { characterCount } from "@/lib/validation/text";

/**
 * Rules for a submitted rating (R15–R17).
 *
 * The same rules exist as CHECK constraints in the database (migration 3),
 * which is the copy that cannot be bypassed. This copy exists so the member
 * gets a clear message naming the field, instead of a database error.
 *
 * Everything arrives from a form, so everything arrives as TEXT ("7", not 7)
 * and from the browser, so it could be anything at all. Hence `unknown`.
 */

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;
export const REVIEW_MAX_LENGTH = 500;

/** A checked rating, ready to save. `review` is "" when there is none. */
export type RatingInput = { quality: Score; enjoyment: Score; review: string };

/** Which form field a problem belongs to, so the form can point at it. */
export type RatingField = "quality" | "enjoyment" | "review";

export type ParsedRating =
  | { ok: true; value: RatingInput }
  | { ok: false; field: RatingField; message: string };

/**
 * Check one score. Returns the number, or null if it is not a whole number
 * from 0 to 10.
 *
 * The check is on the text itself, before converting. That matters because
 * JavaScript's Number() is far too forgiving: Number("") is 0, so a MISSING
 * score would quietly become a real 0 (E14); Number("1e1") is 10; and
 * Number(" 7 ") is 7. Only one or two plain digits get through here.
 */
function parseScore(input: unknown): Score | null {
  if (typeof input !== "string" || !/^\d{1,2}$/.test(input)) return null;
  const value = Number(input);
  if (value < SCORE_MIN || value > SCORE_MAX) return null;
  return value as Score;
}

/** Check a submitted rating. Reports the first problem found. */
export function parseRatingInput(input: {
  quality: unknown;
  enjoyment: unknown;
  review: unknown;
}): ParsedRating {
  const quality = parseScore(input.quality);
  if (quality === null) {
    return {
      ok: false,
      field: "quality",
      message: `Choose a Quality score from ${SCORE_MIN} to ${SCORE_MAX}.`,
    };
  }

  const enjoyment = parseScore(input.enjoyment);
  if (enjoyment === null) {
    return {
      ok: false,
      field: "enjoyment",
      message: `Choose an Enjoyment score from ${SCORE_MIN} to ${SCORE_MAX}.`,
    };
  }

  // A review is optional: a missing field means the same as an empty one.
  const rawReview = input.review ?? "";
  if (typeof rawReview !== "string") {
    return { ok: false, field: "review", message: "The review must be text." };
  }
  // Browsers send a line break as "\r\n" (two characters) but count it as
  // one against a text box's limit. Store it the way it was counted.
  const review = rawReview.replaceAll("\r\n", "\n").trim();
  const length = characterCount(review);
  if (length > REVIEW_MAX_LENGTH) {
    return {
      ok: false,
      field: "review",
      message: `Reviews can be up to ${REVIEW_MAX_LENGTH} characters. Yours is ${length}.`,
    };
  }

  // Note what is NOT done: no HTML is stripped or escaped. The review is
  // stored exactly as typed and shown as plain text by React (R18).
  return { ok: true, value: { quality, enjoyment, review } };
}

/**
 * Check a TMDB film id sent by a form. Returns the number, or null if it is
 * not a positive whole number that fits the database column.
 */
export function parseTmdbId(input: unknown): number | null {
  if (typeof input !== "string" || !/^\d{1,10}$/.test(input)) return null;
  const value = Number(input);
  // 2^31 - 1: the largest value a 32-bit integer column can hold.
  return value >= 1 && value <= 2 ** 31 - 1 ? value : null;
}

/** What the member had in the form, as text, so it can be put back. */
export type RatingFormValues = {
  quality: string;
  enjoyment: string;
  review: string;
};

/**
 * What the save action hands back to the rating form.
 *
 *  - "idle"   nothing has been submitted yet
 *  - "error"  it did not work; `message` says why, `field` says which input
 *             (if any), and `values` is what was typed, so the form can
 *             refill itself: a failed save must never lose a review (E19)
 *
 * There is no "saved" state. A successful save leaves the page altogether:
 * the action redirects to My films (R23).
 */
export type RatingFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      field?: RatingField;
      values: RatingFormValues;
    };

/** What the delete action hands back. */
export type DeleteRatingState =
  | { status: "idle" }
  | { status: "deleted" }
  | { status: "error"; message: string };
