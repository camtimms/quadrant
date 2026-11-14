import { Spinner } from "@/components/Spinner";

/**
 * Shown the instant a film is tapped, while its page loads (NFR23).
 *
 * The film page has the most to fetch of any page: our copy of the film or
 * TMDB's, plus the member's rating. This placeholder has the same shape as
 * the real page (a poster-sized block, two lines for the title and year, a
 * block for the form), so the member can see where they have arrived before
 * the details fill in.
 */
export default function FilmLoading() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <p role="status" className="flex items-center gap-2 text-sm opacity-80">
        <Spinner /> Loading film…
      </p>
      <div
        aria-hidden="true"
        className="flex animate-pulse flex-col gap-6 motion-reduce:animate-none"
      >
        <div className="flex items-start gap-4">
          {/* Same size as the poster on the real page (w-44, 2:3). */}
          <div className="aspect-[2/3] w-44 shrink-0 rounded bg-foreground/10" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-7 w-3/4 rounded bg-foreground/10" />
            <div className="h-5 w-16 rounded bg-foreground/10" />
          </div>
        </div>
        <div className="h-6 w-32 rounded bg-foreground/10" />
        <div className="h-16 rounded bg-foreground/10" />
        <div className="h-16 rounded bg-foreground/10" />
      </div>
    </main>
  );
}
