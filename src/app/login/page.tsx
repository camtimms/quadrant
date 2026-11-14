import { Suspense } from "react";
import { signInWithGoogle } from "@/app/(app)/actions/auth";
import { loginErrorMessage } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/paths";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// In this version of Next.js a page's props arrive as promises, and reading
// the URL's query string makes that part of the page "per request". Anything
// per-request must sit inside <Suspense> so the rest of the page can be
// prepared ahead of time (Cache Components; see CLAUDE.md).
type LoginPageProps = PageProps<"/login">;

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{SITE_NAME}</h1>
        <p>{SITE_DESCRIPTION}</p>
      </div>
      {/* Until the query string has been read, show the plain button. */}
      <Suspense fallback={<SignInForm next="/" />}>
        <SignInSection searchParams={searchParams} />
      </Suspense>
      <p className="text-sm opacity-70">This is a private, invite-only site.</p>
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
          className="rounded border border-red-600 p-3 text-sm text-red-700 dark:text-red-400"
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
      <button
        type="submit"
        className="w-full rounded bg-foreground px-4 py-3 font-medium text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Sign in with Google
      </button>
    </form>
  );
}
