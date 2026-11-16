"use client";

// Error pages must be client components (see ErrorMessage).

import { ErrorMessage, type ErrorPageProps } from "@/components/ErrorMessage";

/**
 * "error.tsx" is a special file name in Next.js: when anything in a
 * signed-in page fails unexpectedly, this is drawn in place of that page.
 * Because it lives inside the (app) folder, the header above it stays, so
 * the member can still move to another page.
 */
export default function AppError(props: ErrorPageProps) {
  return <ErrorMessage {...props} />;
}
