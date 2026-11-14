import { NextResponse, type NextRequest } from "next/server";
import { getCurrentMember } from "@/lib/auth/member";
import {
  parseSearchQuery,
  type SearchError,
  type SearchResponse,
} from "@/lib/search";
import { searchMovies } from "@/lib/tmdb/client";

/**
 * GET /api/search?q=commando — film search for the search page (R9).
 *
 * Why does this exist, rather than the browser asking TMDB directly? Because
 * calling TMDB needs our secret token, and anything the browser can use, every
 * visitor can read. So the browser asks us, and we ask TMDB (design section 1).
 *
 * The order of the checks matters: who is asking, then what they asked, and
 * only then a call to TMDB. A refused request costs TMDB nothing.
 */
export async function GET(request: NextRequest) {
  // 1. Members only. Without this, anyone who found the address could use it
  //    as a free TMDB search paid for with our token and our rate limit
  //    (design section 4.4). The proxy turns signed-out visitors away too,
  //    but each endpoint checks for itself rather than trusting that.
  const member = await getCurrentMember();
  if (!member) return failure("signed-out", 401);
  if (!member.isMember) return failure("not-a-member", 403);

  // 2. The search page will not send a query this short, but a hand-written
  //    request could, so the rule is enforced here as well (R9, NFR10).
  const query = parseSearchQuery(request.nextUrl.searchParams.get("q"));
  if (!query) return failure("query-too-short", 400);

  // 3. Ask TMDB.
  try {
    return respond({ results: await searchMovies(query) }, 200);
  } catch (error) {
    // Whatever went wrong (outage, timeout, rate limit, a rejected token),
    // the member gets the same answer: unavailable, try again (R12). The real
    // cause goes to the server log (visible in Vercel), never to the browser.
    console.error("Film search failed:", error);
    return failure("unavailable", 503);
  }
}

function failure(error: SearchError, status: number) {
  return respond({ error }, status);
}

function respond(body: SearchResponse, status: number) {
  return NextResponse.json(body, {
    status,
    // Results are fetched live every time and never stored (design section
    // 4.2); "private" also stops any shared cache keeping a member's response.
    headers: { "Cache-Control": "private, no-store" },
  });
}
