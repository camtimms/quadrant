import { isScheduledCall } from "@/lib/keepAlive";
import { countTitles } from "@/lib/titles/store";

/**
 * GET /api/keep-alive — called by Vercel's scheduler three times a day
 * (vercel.json) so the free Supabase project never sees a quiet week and
 * is not paused (NFR26, design section 19).
 *
 * It is on the public list in src/lib/auth/paths.ts, because the scheduler
 * has no member's session. The check below is what keeps everyone else
 * out: no database query happens without the secret (E48, E49).
 *
 * The answer is only for Vercel's logs: 200 with the number of stored films
 * when the database answered, 503 when it did not (E50, for example while
 * the project is paused, which this cannot undo).
 */
export async function GET(request: Request): Promise<Response> {
  // "Do not store this": a cached answer would mean a run that never
  // reached the database.
  const headers = { "Cache-Control": "private, no-store" };

  if (
    !isScheduledCall(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return Response.json({ ok: false }, { status: 401, headers });
  }

  try {
    const films = await countTitles();
    return Response.json({ ok: true, films }, { headers });
  } catch (error) {
    // The reason goes to the server log only; it can name internal hosts.
    console.error("Keep-alive: the database did not answer.", error);
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
