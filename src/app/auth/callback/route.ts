import { NextResponse, type NextRequest } from "next/server";
import { loginErrorFromCallback, type LoginError } from "@/lib/auth/errors";
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
  const { searchParams, origin } = request.nextUrl;
  const backToLogin = (error: LoginError) =>
    NextResponse.redirect(new URL(`/login?error=${error}`, origin));

  // 1. Did Supabase send them back with an error instead of a code? This is
  //    how the sign-up hook's "not invited" refusal arrives (R4).
  const callbackError = loginErrorFromCallback(searchParams);
  if (callbackError) return backToLogin(callbackError);

  const code = searchParams.get("code");
  if (!code) return backToLogin("sign-in-failed");

  // 2. Swap the code for a session.
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return backToLogin("sign-in-failed");

  // 3. Signed in, but are they on the invite list? The hook only runs when an
  //    account is first created, so this catches someone who had an account
  //    and was later removed. (If this check were missing they would still
  //    see no data, because the database refuses them; they would just get an
  //    empty app instead of an explanation.)
  const { data: isMember } = await supabase.rpc("is_current_user_member");
  if (!isMember) {
    await supabase.auth.signOut({ scope: "local" });
    return backToLogin("not-invited");
  }

  // 4. Keep the member's picture in step with their Google account (R62).
  //    The database copies the address from what Google said at sign-in, if
  //    the member has left their picture switched on, and checks it really
  //    is a Google picture (design 16.1). Someone signing in for the first
  //    time has no profile yet, so this does nothing for them; their picture
  //    is stored when they save their display name.
  //
  //    A picture is not worth refusing a sign-in over, so any failure here
  //    is logged and otherwise ignored.
  try {
    const { error: pictureError } = await supabase.rpc("sync_profile_picture");
    if (pictureError) {
      console.error("Could not store the member's picture.", pictureError);
    }
  } catch (pictureError) {
    console.error("Could not store the member's picture.", pictureError);
  }

  return NextResponse.redirect(
    new URL(safeNextPath(searchParams.get("next")), origin),
  );
}
