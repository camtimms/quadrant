import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Where a signed-in person who is NOT on the invite list gets sent (R4).
 *
 * It ends their session and shows the invite-only message on the sign-in
 * page. This exists as its own address because pages are not allowed to
 * change cookies while they render, and ending a session means clearing
 * cookies; a Route Handler like this one is allowed to.
 *
 * Who ends up here: someone who had an account and was later removed from the
 * invite list, or anyone at all if the sign-up hook were ever switched off.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(
    new URL("/login?error=not-invited", request.nextUrl.origin),
  );
}
