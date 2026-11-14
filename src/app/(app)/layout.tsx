import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { signOut } from "@/app/(app)/actions/auth";
import { SITE_NAME } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

/**
 * The frame around every signed-in page: a header with the site name and a
 * sign-out button, and a check that the visitor is actually a member.
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
      {/* Nothing inside the app is shown until membership is confirmed. */}
      <Suspense fallback={<p className="p-6 text-sm opacity-70">Loading…</p>}>
        <MembersOnly>{children}</MembersOnly>
      </Suspense>
    </>
  );
}

/**
 * Shows its contents only to people on the invite list (R4).
 *
 * proxy.ts has already made sure the visitor is signed in. This asks the
 * further question "are they still invited?", which matters when someone is
 * removed from the list while signed in (R6). If not, they are sent to
 * /auth/not-invited, which signs them out and explains why.
 *
 * This is for a clear experience, not for security. The database already
 * refuses an uninvited person every row; without this they would simply see
 * an empty app with no explanation.
 *
 * Worth knowing: React starts rendering `children` at the same time as this
 * check, not after it, so a page's fixed text can reach the browser before
 * the redirect happens. That is harmless precisely because nothing private is
 * ever fixed text: every rating, review and name comes from a database query
 * that the database itself refuses for a non-member. Never rely on this
 * component to hide data.
 */
async function MembersOnly({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: isMember, error } = await supabase.rpc(
    "is_current_user_member",
  );

  // A failed check (database unreachable, say) is not the same as "not a
  // member". Throwing shows the error page instead of wrongly signing a real
  // member out.
  if (error) throw new Error("Could not check membership.", { cause: error });

  if (!isMember) redirect("/auth/not-invited");
  return children;
}

/** Shows the signed-in address. Replaced by the display name in task T13. */
async function SignedInAs() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;
  if (!email) return null;
  return <span className="opacity-70">{email}</span>;
}
