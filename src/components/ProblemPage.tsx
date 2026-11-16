import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  heading: string;
  children: ReactNode;
  /** Extra controls (such as "Try again") placed before the link home. */
  actions?: ReactNode;
};

/**
 * The shared look of the "something went wrong" and "page not found"
 * pages: a heading, a sentence or two, and a way back to My films.
 *
 * Server-safe (no state, no hooks), so the not-found pages stay server
 * components; the error pages pass their own client-side button in.
 */
export function ProblemPage({ heading, children, actions }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{heading}</h1>
      <div className="flex flex-col gap-2">{children}</div>
      <div className="flex flex-wrap items-center gap-4">
        {actions}
        <Link
          href="/"
          className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60"
        >
          Go to My films
        </Link>
      </div>
    </main>
  );
}
