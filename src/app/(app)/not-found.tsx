import { ProblemPage } from "@/components/ProblemPage";

/**
 * Shown when a signed-in page calls notFound(): a film id TMDB does not
 * know, or a member id that is nobody's. Living inside (app) keeps the
 * header above it; the root not-found.tsx would replace the header too.
 */
export default function AppNotFound() {
  return (
    <ProblemPage heading="Page not found">
      <p>
        There&apos;s no film or member at this address. The link may be mistyped
        or out of date.
      </p>
    </ProblemPage>
  );
}
