import "server-only";

import { cache } from "react";
import { googlePictureFrom } from "@/lib/picture";
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
  /**
   * Their choice to show their Google picture to friends (R63). True for a
   * member with no profile yet: the choice is on by default.
   */
  showPicture: boolean;
  /**
   * Their OWN Google picture, from their session, or null if their account
   * has none. For showing a member their own picture on /welcome only; what
   * friends see comes from the database.
   */
  googlePicture: string | null;
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
    let showPicture = true;
    if (isMember) {
      // maybeSingle(): one row or none, and "none" is not an error. A member
      // who has just signed in for the first time has no profile yet.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, show_picture")
        .eq("id", claims.sub)
        .maybeSingle();
      if (profileError) {
        throw new Error("Could not load your profile.", {
          cause: profileError,
        });
      }
      displayName = profile?.display_name ?? null;
      showPicture = profile?.show_picture ?? true;
    }

    return {
      userId: claims.sub,
      isMember: Boolean(isMember),
      displayName,
      suggestedName: suggestDisplayName(claims.user_metadata),
      showPicture,
      googlePicture: googlePictureFrom(claims.user_metadata),
    };
  },
);
