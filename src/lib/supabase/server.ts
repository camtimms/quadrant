// Importing "server-only" makes the build fail if this file is ever pulled
// into browser code by mistake.
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * A Supabase client for code that runs on the server: Server Components,
 * Server Actions and Route Handlers.
 *
 * It acts AS THE SIGNED-IN MEMBER. It reads their session from the request's
 * cookies, so every query it makes is subject to the database's row-level
 * security exactly as if the member had made it themselves. This is how the
 * database, not our code, stays the security boundary (design section 1).
 *
 * Create a new one for every request; never share one between requests,
 * because each carries one member's session.
 */
export async function createClient() {
  const env = getPublicEnv();
  // In Next.js 15+ cookies() is asynchronous, hence the await.
  const cookieStore = await cookies();

  // <Database> gives TypeScript the shape of every table, so a misspelt
  // table or column name is a compile error rather than a runtime surprise.
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components are not allowed to set cookies, so this throws
            // when called from one. That is safe to ignore here: refreshing
            // the session cookie is the job of proxy.ts (task T11), which runs
            // before every request and is allowed to write cookies.
          }
        },
      },
    },
  );
}
