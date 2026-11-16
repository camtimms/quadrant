import { Suspense } from "react";
import { signInWithGoogle } from "@/app/(app)/actions/auth";
import { loginErrorMessage } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/paths";
import { SiteLogo } from "@/components/SiteLogo";
import { buttonMain, card, errorText, mutedText } from "@/components/ui/styles";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// In this version of Next.js a page's props arrive as promises, and reading
// the URL's query string makes that part of the page "per request". Anything
// per-request must sit inside <Suspense> so the rest of the page can be
// prepared ahead of time (Cache Components; see CLAUDE.md).
type LoginPageProps = PageProps<"/login">;

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-4 sm:p-6">
      <div className={`${card} flex flex-col gap-6 p-6`}>
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-3 text-3xl font-semibold">
            <SiteLogo size={40} />
            {SITE_NAME}
          </h1>
          <p>{SITE_DESCRIPTION}</p>
        </div>
        {/* Until the query string has been read, show the plain button. */}
        <Suspense fallback={<SignInForm next="/" />}>
          <SignInSection searchParams={searchParams} />
        </Suspense>
        <p className={`text-sm ${mutedText}`}>
          This is a private, invite-only site.
        </p>
      </div>
    </main>
  );
}

async function SignInSection({
  searchParams,
}: Pick<LoginPageProps, "searchParams">) {
  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : undefined;
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : null,
  );
  // Only codes we define produce a message; text typed into the address bar
  // is never shown.
  const message = loginErrorMessage(errorCode);

  return (
    <>
      {message ? (
        // role="alert" makes screen readers announce the message (NFR15).
        <p
          role="alert"
          className={`rounded-xl border border-danger p-3 ${errorText}`}
        >
          {message}
        </p>
      ) : null}
      <SignInForm next={next} />
    </>
  );
}

function SignInForm({ next }: { next: string }) {
  return (
    // A plain HTML form whose "action" is a Server Action. It works even
    // before any JavaScript has loaded in the browser.
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <button type="submit" className={`${buttonMain} w-full py-3`}>
        Sign in with Google
      </button>
    </form>
  );
}
