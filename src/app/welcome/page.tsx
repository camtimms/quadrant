import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DisplayNameForm } from "@/components/profile/DisplayNameForm";
import { getCurrentMember } from "@/lib/auth/member";
import { SITE_NAME } from "@/lib/site";

/**
 * Choose or change a display name (R7).
 *
 * A member lands here automatically the first time they sign in, because the
 * signed-in layout sends anyone without a profile to this page. They can
 * come back later from the header to change the name.
 *
 * This page deliberately lives OUTSIDE the (app) folder. Everything in (app)
 * requires a profile, so a page whose job is to create one cannot be inside
 * it: the member would be redirected here, forever.
 */
export default function WelcomePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <Suspense fallback={<p className="text-sm opacity-70">Loading…</p>}>
        <WelcomeContent />
      </Suspense>
    </main>
  );
}

async function WelcomeContent() {
  const member = await getCurrentMember();

  // proxy.ts already redirects signed-out visitors, but this page is outside
  // the (app) layout, so it does its own membership check too.
  if (!member) redirect("/login");
  if (!member.isMember) redirect("/auth/not-invited");

  const isFirstVisit = member.displayName === null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">
          {isFirstVisit ? `Welcome to ${SITE_NAME}` : "Your display name"}
        </h1>
        <p>
          {isFirstVisit
            ? "What should your friends see you as?"
            : "Change the name your friends see beside your ratings."}
        </p>
      </div>
      <DisplayNameForm
        initialName={member.displayName ?? member.suggestedName}
        submitLabel={isFirstVisit ? "Continue" : "Save"}
      />
      {isFirstVisit ? null : (
        <Link href="/" className="text-sm underline">
          Cancel
        </Link>
      )}
    </>
  );
}
