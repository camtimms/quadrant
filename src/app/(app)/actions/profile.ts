"use server";

import { redirect } from "next/navigation";
import { PICTURE_BUCKET } from "@/lib/picture";
import { createClient } from "@/lib/supabase/server";
import {
  parseDisplayName,
  pictureChoiceFrom,
  type DisplayNameFormState,
} from "@/lib/validation/profile";

/**
 * Save the member's display name and their picture choice, creating their
 * profile the first time (R7, R79).
 *
 * The first argument is whatever this action returned last time; React passes
 * it in automatically when the action is used with useActionState. We do not
 * need it, hence the underscore.
 *
 * Expected problems (a bad name, an expired session) are RETURNED as a
 * message for the form to show. Only genuinely unexpected failures throw.
 */
export async function saveDisplayName(
  _previous: DisplayNameFormState,
  formData: FormData,
): Promise<DisplayNameFormState> {
  const typed = formData.get("display_name");
  const value = typeof typed === "string" ? typed : "";
  // R79: the Google picture, their own upload, or just their initial (or
  // the old checkbox, from a page opened before the three choices).
  const pictureChoice = pictureChoiceFrom(formData);

  // 1. Check it here even though the form also limits the length: a request
  //    can be sent without using our form at all.
  const parsed = parseDisplayName(typed);
  if (!parsed.ok) return { message: parsed.message, value, pictureChoice };

  // 2. Who is asking? The id comes from the verified session, never from the
  //    form, so nobody can save a name against someone else's account.
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) {
    return {
      message: "Your session expired. Sign in again to save.",
      value,
      pictureChoice,
    };
  }

  // E69: "my own picture" needs one uploaded first. The member's folder in
  // the picture bucket says whether there is one.
  if (pictureChoice === "upload") {
    const { data: files } = await supabase.storage
      .from(PICTURE_BUCKET)
      .list(userId);
    if (!files || files.length === 0) {
      return {
        message: "Upload a picture first, or choose another.",
        value,
        pictureChoice,
      };
    }
  }

  // 3. "upsert" = insert the row, or update it if it already exists. One
  //    statement covers both the first visit and later changes. The database
  //    rules still apply: a member can only write their own row, and a
  //    non-member cannot write at all.
  //
  //    Only the CHOICE is sent, never a picture address. Members are not
  //    allowed to write the address column at all; the database fills it in
  //    itself in step 4 (design 16.1).
  //    The old on/off switch (show_picture) is kept in step with the choice
  //    by the database itself (migration 7).
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: parsed.value,
    picture_source: pictureChoice,
  });
  if (error) {
    return {
      message: "That couldn't be saved. Please try again.",
      value,
      pictureChoice,
    };
  }

  // 4. Have the database store the member's Google picture address, now
  //    that it knows their choice (R62). If the choice was "off", the
  //    database has already removed the address in step 3 and this changes
  //    nothing.
  //
  //    A failure here is logged, not shown: the name and the choice ARE
  //    saved, and the picture is stored the next time the member signs in.
  const { error: pictureError } = await supabase.rpc("sync_profile_picture");
  if (pictureError) {
    console.error("Could not store the member's picture.", pictureError);
  }

  // redirect() works by throwing a special signal, so it must stay outside
  // any try/catch and be the last thing the action does.
  redirect("/");
}
