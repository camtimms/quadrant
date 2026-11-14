import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";

/**
 * Where Google sends people back to after they approve the sign-in.
 *
 * The address arrives carrying a one-time "code". On its own the code is
 * useless to an eavesdropper: it only works together with a secret that was
 * stored in this browser's cookies when sign-in started (this pairing is
 * called PKCE). Exchanging the two gives us the session, which the Supabase
 * client then stores in cookies.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.nextUrl.origin));
    }
  }

  // No code, or the exchange failed (expired link, cancelled at Google, or a
  // refusal such as "not invited", which task T12 turns into its own message).
  return NextResponse.redirect(
    new URL("/login?error=sign-in-failed", request.nextUrl.origin),
  );
}
