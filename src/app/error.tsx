"use client";

// Error pages must be client components (see ErrorMessage).

import { ErrorMessage, type ErrorPageProps } from "@/components/ErrorMessage";

/**
 * The same error page for pages outside the signed-in area: /login,
 * /welcome and /about. Signed-in pages use (app)/error.tsx, which keeps
 * the header.
 *
 * This one cannot catch a failure in the root layout itself; that would
 * need "global-error.tsx", and the root layout does nothing that can fail.
 */
export default function RootError(props: ErrorPageProps) {
  return <ErrorMessage {...props} />;
}
