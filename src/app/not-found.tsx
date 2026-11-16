import type { Metadata } from "next";
import { ProblemPage } from "@/components/ProblemPage";

export const metadata: Metadata = { title: "Page not found" };

/**
 * Shown for any address the site does not have. Next.js also sends this
 * file with every page, so it is kept small and free of client code.
 *
 * Signed-out visitors rarely see it: proxy.ts sends them to sign in first.
 */
export default function NotFound() {
  return (
    <ProblemPage heading="Page not found">
      <p>There&apos;s nothing at this address.</p>
    </ProblemPage>
  );
}
