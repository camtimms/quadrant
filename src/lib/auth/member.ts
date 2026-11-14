import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { suggestDisplayName } from "@/lib/validation/profile";

/** What the app knows about whoever is making the current request. */
export type CurrentMember = {
  userId: string;
  /** On the invite list right now? Checked by the database, not by us. */
  isMember: boolean;
  /** Their chosen name, or null if they have not picked one yet. */
  displayName: string | null;
  /** A starting suggestion from their Google profile ("" if none). */
  suggestedName: string;
};

/**
 * Look up the current visitor: who they are, whether they are a member, and
 * their display name. Returns null if nobody is signed in.
 *
 * Wrapped in React's cache() so that the header, the membership check and
 * the page itself can each call this during one request and the database is
 * only asked once. The cache lasts for a single request and is never shared
 * between visitors.
 */
export const getCurrentMember = cache(
  async (): Promise<CurrentMember | null> => {
    const supabase = await createClient();

    // getClaims() verifies the session token's signature (see proxy.ts).
    const { data: claimsData } = await supabase.auth.getClaims();
    const claims = claimsData?.claims;
    if (!claims) return null;

    const { data: isMember, error: memberError } = await supabase.rpc(
      "is_current_user_member",
    );
    // A failed check is not the same as "not a member". Throwing shows the
    // error page rather than wrongly signing a real member out.
    if (memberError) {
      throw new Error("Could not check membership.", { cause: memberError });
    }

    let displayName: string | null = null;
    if (isMember) {
      // maybeSingle(): one row or none, and "none" is not an error. A member
      // who has just signed in for the first time has no profile yet.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", claims.sub)
        .maybeSingle();
      if (profileError) {
        throw new Error("Could not load your profile.", {
          cause: profileError,
        });
      }
      displayName = profile?.display_name ?? null;
    }

    return {
      userId: claims.sub,
      isMember: Boolean(isMember),
      displayName,
      suggestedName: suggestDisplayName(claims.user_metadata),
    };
  },
);
