import { z } from "zod";
import { characterCount } from "@/lib/validation/text";

/**
 * Rules for a member's display name (R7).
 *
 * The same rules exist as a CHECK constraint in the database (migration 1).
 * Why have both? The database is the one that cannot be bypassed. This copy
 * exists so the member gets a friendly message beside the field straight
 * away, rather than a database error. The two must agree; the tests here and
 * in tests/rls/members.test.ts pin down the same boundaries.
 */
export const DISPLAY_NAME_MAX_LENGTH = 40;

const displayNameSchema = z
  .string("Enter a name.")
  .trim()
  .refine((value) => characterCount(value) >= 1, "Enter a name.")
  .refine(
    (value) => characterCount(value) <= DISPLAY_NAME_MAX_LENGTH,
    `Use ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
  );

/** Either the cleaned-up value, or a message to show beside the field. */
export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

/**
 * Check a submitted display name. Takes `unknown` because form data comes
 * from the browser and could be anything at all.
 */
export function parseDisplayName(input: unknown): Parsed<string> {
  const result = displayNameSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  // Show the first problem only; one message per field is enough.
  return { ok: false, message: result.error.issues[0].message };
}

/**
 * A starting value for the display-name field, from the profile details
 * Google passed along at sign-in. Returns "" when there is nothing usable.
 *
 * That data comes from outside the app, so nothing about its shape is
 * assumed: every field is checked before use.
 */
export function suggestDisplayName(metadata: unknown): string {
  if (typeof metadata !== "object" || metadata === null) return "";
  const fields = metadata as Record<string, unknown>;

  for (const candidate of [fields.full_name, fields.name]) {
    if (typeof candidate !== "string") continue;
    const name = candidate.trim();
    // Never offer an email address as a name: members must not see each
    // other's addresses (NFR5), and a pre-filled field is easy to accept
    // without reading.
    if (name === "" || name.includes("@")) continue;
    return [...name].slice(0, DISPLAY_NAME_MAX_LENGTH).join("").trim();
  }
  return "";
}

/**
 * What the save action hands back to the display-name form.
 *
 * `message` is the problem to show, if any. `value` is what the member typed,
 * returned so the field can be refilled with it: a failed save must never
 * throw away someone's typing. `pictureChoice` is the picture they chose,
 * handed back for the same reason.
 */
export type DisplayNameFormState = {
  message?: string;
  value?: string;
  pictureChoice?: PictureChoice;
};

/** The three pictures a member can show (R79). */
export type PictureChoice = "google" | "upload" | "initial";

/**
 * Which picture the name-and-picture form chose (R79, design 23.4): its
 * "picture" field. A page opened before the three choices arrived sends
 * the old checkbox instead (R63): ticked ("show_picture=on") meant the
 * Google picture, unticked (absent) the initial. Anything else, from a
 * forged request, counts as the initial: the choice that shows least.
 */
export function pictureChoiceFrom(form: FormData): PictureChoice {
  const picked = form.get("picture");
  if (picked === "google" || picked === "upload" || picked === "initial") {
    return picked;
  }
  if (picked === null) return form.has("show_picture") ? "google" : "initial";
  return "initial";
}
