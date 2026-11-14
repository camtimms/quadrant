// Makes the build fail if this file is ever imported into browser code.
import "server-only";

import { z } from "zod";
import { checkEnv } from "@/lib/env";

/**
 * SECRET environment variables (NFR2).
 *
 * These have no NEXT_PUBLIC_ prefix, so Next.js never copies them into the
 * JavaScript sent to browsers. They are kept apart from the public ones in
 * env.ts so that importing a public value can never drag a secret along.
 */

const serverEnvSchema = z.object({
  TMDB_API_READ_ACCESS_TOKEN: z
    .string("is missing")
    .min(1, "is empty")
    // TMDB's settings page shows two credentials. We need the long "API Read
    // Access Token" (three parts joined by dots), not the short "API Key",
    // which belongs to a different way of signing requests.
    .refine((value) => value.split(".").length === 3, {
      message:
        'does not look like the TMDB "API Read Access Token" (the long one starting "eyJ"). The short "API Key" will not work',
    }),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Check the secret variables. Separate from process.env so it can be tested. */
export function parseServerEnv(raw: Record<string, unknown>): ServerEnv {
  return checkEnv(serverEnvSchema, raw);
}

let cached: ServerEnv | undefined;

/** The secret variables for the running server, checked on first use. */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv({
    TMDB_API_READ_ACCESS_TOKEN: process.env.TMDB_API_READ_ACCESS_TOKEN,
  });
  return cached;
}

// ---------------------------------------------------------------------------
// The Supabase secret key
// ---------------------------------------------------------------------------
// Checked separately from the TMDB token, and only when first needed, so
// that film search does not depend on a key it never uses.

const supabaseSecretSchema = z.object({
  SUPABASE_SECRET_KEY: z
    .string("is missing")
    .min(1, "is empty")
    // The easy mistake: the dashboard lists the public key right above it.
    .refine((value) => !value.startsWith("sb_publishable_"), {
      message:
        'is the PUBLISHABLE key. Use the SECRET key (it starts "sb_secret_") from Project Settings > API Keys',
    }),
});

/** Check the Supabase secret key. Separate from process.env for testing. */
export function parseSupabaseSecretKey(raw: Record<string, unknown>): string {
  return checkEnv(supabaseSecretSchema, raw).SUPABASE_SECRET_KEY;
}

let cachedSecretKey: string | undefined;

/**
 * The key that bypasses every database rule. Used by exactly one module,
 * src/lib/supabase/admin.ts.
 */
export function getSupabaseSecretKey(): string {
  cachedSecretKey ??= parseSupabaseSecretKey({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  return cachedSecretKey;
}
