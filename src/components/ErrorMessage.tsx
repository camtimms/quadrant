"use client";

// "use client" because error pages must be: Next.js shows them from a React
// error boundary, which runs in the browser, and the "Try again" button
// needs a click handler.

import { useEffect } from "react";
import { ProblemPage } from "@/components/ProblemPage";
import { buttonMain } from "@/components/ui/styles";

export type ErrorPageProps = {
  /**
   * Whatever was thrown. From the server it is an Error whose message
   * Next.js has replaced with a generic one in production, plus a `digest`
   * that matches the server's log. From the browser it can be anything.
   */
  error: unknown;
  /** Asks Next.js to fetch and draw the page again. */
  retry: () => void;
};

/**
 * What a member sees when something unexpected fails, such as the database
 * being unreachable (design 6, "Database unreachable / unexpected error").
 *
 * It never shows the error's own text: that can name tables or internal
 * details, and it means nothing to a member. The error goes to the
 * browser's console instead, where its digest can be matched to the server
 * log.
 */
export function ErrorMessage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ProblemPage
      heading="Something went wrong"
      actions={
        <button type="button" onClick={() => retry()} className={buttonMain}>
          Try again
        </button>
      }
    >
      <p>
        That didn&apos;t work, probably for a moment only. Your ratings are
        safe. Try again, or go back to your films.
      </p>
    </ProblemPage>
  );
}
