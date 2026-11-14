import { Suspense } from "react";
import { signOut } from "@/app/(app)/actions/auth";
import { SITE_NAME } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

/**
 * The frame around every signed-in page: a header with the site name and a
 * sign-out button.
 *
 * "(app)" in the folder name is a route group. The brackets mean it does not
 * appear in the address: (app)/page.tsx is still "/". It exists so that the
 * signed-in pages can share this layout while /login does not.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-foreground/15 px-4 py-3">
        <span className="font-semibold">{SITE_NAME}</span>
        <div className="flex items-center gap-3 text-sm">
          {/* Who is signed in differs per request, so it streams in inside
              Suspense while the rest of the header is ready immediately. */}
          <Suspense fallback={null}>
            <SignedInAs />
          </Suspense>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded border border-foreground/30 px-3 py-1 hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </>
  );
}

/** Shows the signed-in address. Replaced by the display name in task T13. */
async function SignedInAs() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;
  if (!email) return null;
  return <span className="opacity-70">{email}</span>;
}
