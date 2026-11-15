import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { signOut } from "@/app/(app)/actions/auth";
import { getCurrentMember } from "@/lib/auth/member";
import { SiteLogo } from "@/components/SiteLogo";
import { SITE_NAME } from "@/lib/site";

/**
 * The frame around every signed-in page: a header with the site name and a
 * sign-out button, and a check that the visitor is actually a member.
 *
 * "(app)" in the folder name is a route group. The brackets mean it does not
 * appear in the address: (app)/page.tsx is still "/". It exists so that the
 * signed-in pages can share this layout while /login and /welcome do not.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* flex-wrap: on a narrow phone the links drop to a second line
          instead of pushing the page wider than the screen. */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-foreground/15 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <SiteLogo size={24} />
          {SITE_NAME}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {/* A stop-gap so these pages can be reached. The full navigation
              arrives in task T31. */}
          <Link
            href="/friends"
            className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Friends
          </Link>
          <Link
            href="/search"
            className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Search
          </Link>
          {/* Who is signed in differs per request, so it streams in inside
              Suspense while the rest of the header is ready immediately. */}
          <Suspense fallback={null}>
            <SignedInAs />
          </Suspense>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded border border-foreground/30 px-3 py-1 hover:bg-foreground/10 active:bg-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2"
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
      className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      // The visible text is just the name; this says what the link does.
      aria-label={`${member.displayName}: change your name or picture`}
    >
      {member.displayName}
    </Link>
  );
}
