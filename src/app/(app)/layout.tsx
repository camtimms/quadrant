import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { signOut } from "@/app/(app)/actions/auth";
import { getCurrentMember } from "@/lib/auth/member";
import { Nav } from "@/components/Nav";
import { SiteLogo } from "@/components/SiteLogo";
import { SITE_NAME } from "@/lib/site";

/**
 * The frame around every signed-in page: a header with the site name, the
 * member's name, a sign-out button and the main navigation, and a check
 * that the visitor is actually a member.
 *
 * "(app)" in the folder name is a route group. The brackets mean it does not
 * appear in the address: (app)/page.tsx is still "/". It exists so that the
 * signed-in pages can share this layout while /login and /welcome do not.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* Two rows, the same at every width: the site name and the member's
          own controls on top, the main navigation below (T31). On a phone
          a single row could not hold three links, a name and a button
          without squeezing them; two rows keep each one tappable. */}
      <header className="flex flex-col gap-1 border-b border-foreground/15 px-4 pt-3 pb-1">
        {/* flex-wrap: a very long display name drops below the site name
            instead of pushing the page wider than the screen. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <SiteLogo size={24} />
            {SITE_NAME}
          </Link>
          <div className="flex min-w-0 items-center gap-3 text-sm">
            {/* Who is signed in differs per request, so it streams in
                inside Suspense while the rest of the header is ready
                immediately. */}
            <Suspense fallback={null}>
              <SignedInAs />
            </Suspense>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded border border-foreground/30 px-3 py-1 whitespace-nowrap hover:bg-foreground/10 active:bg-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <Nav />
      </header>
      {/* Nothing inside the app is shown until membership is confirmed. */}
      <Suspense fallback={<p className="p-6 text-sm opacity-70">Loading…</p>}>
        <MembersOnly>{children}</MembersOnly>
      </Suspense>
    </>
  );
}

/**
 * Shows its contents only to members who have chosen a display name.
 *
 * proxy.ts has already made sure the visitor is signed in. This asks two
 * further questions:
 *
 *  - Are they still on the invite list (R4, R6)? If not, they are sent to
 *    /auth/not-invited, which signs them out and explains why.
 *  - Have they picked a display name (R7)? If not, they are sent to
 *    /welcome to choose one, so every rating has a name to show beside it.
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
  const member = await getCurrentMember();

  if (!member) redirect("/login");
  if (!member.isMember) redirect("/auth/not-invited");
  if (member.displayName === null) redirect("/welcome");

  return children;
}

/**
 * The member's display name in the header, linking to where they can change
 * it. getCurrentMember() is shared with MembersOnly above, so this costs no
 * extra database query.
 */
async function SignedInAs() {
  const member = await getCurrentMember();
  if (!member?.displayName) return null;
  return (
    <Link
      href="/welcome"
      // min-w-0 and break-words: a 40-character name with no spaces wraps
      // inside the header instead of widening the page (E15).
      className="min-w-0 break-words underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      // The visible text is just the name; this says what the link does.
      aria-label={`${member.displayName}: change your name or picture`}
    >
      {member.displayName}
    </Link>
  );
}
