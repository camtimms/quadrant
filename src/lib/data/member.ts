// Reads with the member's session, so server only.
import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The display name of the member with this id, or null if there is no such
 * member (R46).
 *
 * It reads with the signed-in visitor's own session. The database's rules
 * let a member read every member's profile and let anyone else read none,
 * so for a non-member this always answers null.
 *
 * A member who has since been removed from the invite list still has their
 * profile, so their page and their name on old ratings keep working (E16).
 */
export async function loadMemberName(memberId: string): Promise<string | null> {
  const supabase = await createClient();

  // maybeSingle(): one row or none, and "none" is not an error.
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the member.", { cause: error });
  }
  return data?.display_name ?? null;
}
