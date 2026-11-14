"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  parseDisplayName,
  type DisplayNameFormState,
} from "@/lib/validation/profile";

/**
 * Save the member's display name, creating their profile the first time (R7).
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

  // 1. Check it here even though the form also limits the length: a request
  //    can be sent without using our form at all.
  const parsed = parseDisplayName(typed);
  if (!parsed.ok) return { message: parsed.message, value };

  // 2. Who is asking? The id comes from the verified session, never from the
  //    form, so nobody can save a name against someone else's account.
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) {
    return {
      message: "Your session expired. Sign in again to save.",
      value,
    };
  }

  // 3. "upsert" = insert the row, or update it if it already exists. One
  //    statement covers both the first visit and later changes. The database
  //    rules still apply: a member can only write their own row, and a
  //    non-member cannot write at all.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, display_name: parsed.value });
  if (error) {
    return {
      message: "That couldn't be saved. Please try again.",
      value,
    };
  }

  // redirect() works by throwing a special signal, so it must stay outside
  // any try/catch and be the last thing the action does.
  redirect("/");
}
