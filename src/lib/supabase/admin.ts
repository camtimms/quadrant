// This file holds the most powerful secret in the app. It must only ever run
// on the server; this import makes the build fail otherwise.
import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { getSupabaseSecretKey } from "@/lib/env.server";
import type { Database } from "@/lib/supabase/database.types";

/**
 * A Supabase client that acts as the OWNER, not as a member.
 *
 * Compare with server.ts. That client carries the signed-in member's session,
 * so the database's row-level security applies to everything it does. This
 * one carries the secret key instead, and the secret key BYPASSES EVERY RULE:
 * it can read and write any row in any table.
 *
 * So it is used for exactly one job: writing rows in `titles`, which members
 * are deliberately not allowed to write themselves (design section 4.2). The
 * only file that may import this is src/lib/titles/store.ts, and a test
 * (src/lib/server-only.test.ts) fails if anything else does.
 *
 * Never use it to read or write something on a member's behalf. If a member's
 * own session cannot do a thing, the answer is a policy, not this client.
 */
export function createAdminClient() {
  return createClient<Database>(
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
    getSupabaseSecretKey(),
    {
      // There is no user and no browser here, so there is no session to
      // store or to keep refreshing in the background.
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
