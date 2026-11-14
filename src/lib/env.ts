import { z } from "zod";

/**
 * Environment variables, checked once and in one place (NFR2).
 *
 * Why bother? Without this, a missing or mistyped variable shows up much
 * later as a confusing network error deep inside a library. With it, the app
 * stops at the first use with a message naming exactly what is wrong.
 *
 * This file holds only PUBLIC variables: names starting with NEXT_PUBLIC_ are
 * copied into the JavaScript sent to browsers, so anything here is visible to
 * everyone. Secrets (added in later tasks) get their own server-only module.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .url("must be a full URL such as https://your-project-ref.supabase.co")
    // A valid URL, but the wrong one: the address of the dashboard page
    // rather than the project itself. Easy to copy by mistake.
    .refine((url) => !url.includes("supabase.com/dashboard"), {
      message:
        "is the dashboard page address, not the project URL. Use https://<project-ref>.supabase.co (Project Settings > API Keys)",
    }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string("is missing")
    .min(1, "is empty"),
});

/** The checked, typed public variables. */
export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Check a set of raw values and return them typed, or throw one error that
 * lists every problem. Kept separate from process.env so it can be unit
 * tested with plain objects.
 *
 * The message names variables but never prints their values, so a mistake
 * cannot leak a key into a log.
 */
export function parsePublicEnv(raw: Record<string, unknown>): PublicEnv {
  const result = publicEnvSchema.safeParse(raw);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const name = issue.path.join(".");
    // Zod's own wording for an absent value is technical ("expected string,
    // received undefined"), so say it plainly instead.
    const absent = raw[name] === undefined;
    return `  - ${name} ${absent ? "is missing" : issue.message}`;
  });

  throw new Error(
    [
      "Invalid environment variables:",
      ...problems,
      "Copy .env.example to .env.local and fill in the values, then restart the dev server.",
    ].join("\n"),
  );
}

let cached: PublicEnv | undefined;

/**
 * The public variables for the running app.
 *
 * Each one is written out as process.env.NEXT_PUBLIC_... in full on purpose.
 * Next.js replaces those exact expressions with their values when it builds
 * the browser bundle; looking them up dynamically (process.env[name]) would
 * leave them undefined in the browser.
 *
 * Checked on first use rather than when this file is imported, so that code
 * which never touches Supabase (and the unit tests) can load without them.
 */
export function getPublicEnv(): PublicEnv {
  cached ??= parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cached;
}
