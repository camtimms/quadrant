import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isApiPath, isPublicPath } from "@/lib/auth/paths";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Runs on the server before every page request (Next.js 16 calls this file
 * "proxy"; older versions called it "middleware").
 *
 * It does two jobs:
 *
 * 1. Keeps the member signed in (R3). A session is a short-lived token plus a
 *    longer-lived "refresh token", both stored in cookies. When the short one
 *    has expired, Supabase swaps the refresh token for a new pair, and the
 *    new cookies must be sent back to the browser. Pages are not allowed to
 *    set cookies while rendering, so it has to happen here.
 *
 * 2. Sends signed-out visitors to the sign-in page (R1).
 *
 * Job 2 is for a good experience, not for security. The data is protected by
 * the database's own rules whether or not this file exists.
 */
export async function proxy(request: NextRequest) {
  const env = getPublicEnv();

  // The response we will eventually return. It starts as "carry on to the
  // page", and gets rebuilt below if Supabase needs to set fresh cookies.
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Called when the session was refreshed. The new cookies go in two
        // places: onto the request, so the page that renders next sees the
        // fresh session, and onto the response, so the browser stores it.
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Supabase also supplies "do not cache this" headers, so a response
          // carrying one member's session is never stored and shown to another.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // getClaims() checks the token's signature, so a forged cookie is rejected.
  // It is also what triggers the refresh described above. (getSession() must
  // not be used for this: it trusts the cookie without checking it.)
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && !isPublicPath(pathname)) {
    // A data endpoint is called by code, which cannot use a sign-in page:
    // answer with a plain "not signed in" instead of redirecting. The body
    // matches what the endpoints themselves send (see src/lib/search.ts).
    if (isApiPath(pathname)) {
      return NextResponse.json(
        { error: "signed-out" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    // Remember where they were heading, so sign-in can take them there.
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in? The sign-in page has nothing to offer.
  if (isSignedIn && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    const redirect = NextResponse.redirect(homeUrl);
    // Carry any refreshed session cookies over onto the redirect.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return response;
}

export const config = {
  // Run on everything EXCEPT Next.js's own static files and images. Those
  // hold no private data, and checking a session for each one would slow
  // every page down for nothing.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
