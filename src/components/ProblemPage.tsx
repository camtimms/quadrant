import Link from "next/link";
import type { ReactNode } from "react";
import { buttonSecondary, card } from "@/components/ui/styles";

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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className={`${card} flex flex-col gap-4`}>
        <h1 className="text-2xl font-semibold">{heading}</h1>
        <div className="flex flex-col gap-2">{children}</div>
        <div className="flex flex-wrap items-center gap-3">
          {actions}
          <Link href="/" className={buttonSecondary}>
            Go to My films
          </Link>
        </div>
      </div>
    </main>
  );
}
