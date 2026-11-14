import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

/**
 * A Supabase client for code that runs in the browser (Client Components).
 *
 * It uses only the public URL and publishable key. That is safe because the
 * key alone grants nothing: every table is protected by row-level security in
 * the database, which checks who is signed in (design section 3.5).
 *
 * The signed-in session lives in a cookie, so the server can read the same
 * session the browser has. That is what @supabase/ssr adds over the plain
 * supabase-js client.
 */
export function createClient() {
  const env = getPublicEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
