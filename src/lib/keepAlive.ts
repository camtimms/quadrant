import { timingSafeEqual } from "node:crypto";

/**
 * Keeping the free database awake (NFR26, design section 19).
 *
 * Supabase pauses a free project after a week of low database activity.
 * Vercel's scheduler (vercel.json) calls KEEP_ALIVE_PATH three times a day,
 * and that route asks the database one small question, so there is never a
 * quiet week.
 */

/** The address the scheduled jobs call. */
export const KEEP_ALIVE_PATH = "/api/keep-alive";

/**
 * How many jobs vercel.json schedules. Vercel's free plan lets each job run
 * at most once a day, so "a few requests a day" (Supabase's guidance) means
 * a few jobs.
 */
export const RUNS_PER_DAY = 3;

/**
 * Is this request really from Vercel's scheduler?
 *
 * Vercel sends the project's CRON_SECRET as `Authorization: Bearer <secret>`.
 * With no secret configured, nobody is let in (E49): otherwise an empty
 * secret would make "Bearer " a valid password.
 *
 * The comparison takes the same time however much of the guess is right
 * (`timingSafeEqual`). A plain `===` stops at the first wrong character,
 * and the tiny difference in time can, in principle, be used to guess a
 * secret one character at a time.
 */
export function isScheduledCall(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authorization);
  // timingSafeEqual needs equal lengths; a different length is simply wrong.
  return given.length === expected.length && timingSafeEqual(given, expected);
}
