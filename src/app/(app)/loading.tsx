import { Spinner } from "@/components/Spinner";

/**
 * What is shown, instantly, while any signed-in page is loading (NFR23).
 *
 * "loading.tsx" is a special file name in Next.js. When a link is followed,
 * Next.js shows this straight away in place of the old page, then swaps in
 * the real page once its data has arrived. Without it, the old page just
 * sits there until the new one is completely ready, which feels like the tap
 * did nothing.
 *
 * This one covers every page in the (app) folder that does not have a
 * loading file of its own. The film page has its own, shaped like a film.
 *
 * One exception worth knowing: changing only the "?filter=" part of the
 * address does NOT show this. That is deliberate. The chart has to stay on
 * screen for its zoom to animate, so filter chips show a small spinner on
 * the chip instead (see PendingMark).
 */
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      {/* role="status" makes a screen reader say "Loading". */}
      <p role="status" className="flex items-center gap-2 text-sm opacity-80">
        <Spinner /> Loading…
      </p>
      {/* Grey blocks roughly where content will be, so the page does not
          jump about when the real thing arrives. "animate-pulse" fades them
          gently in and out. They mean nothing to a screen reader. */}
      <div
        aria-hidden="true"
        className="flex animate-pulse flex-col gap-4 motion-reduce:animate-none"
      >
        <div className="h-7 w-40 rounded bg-foreground/10" />
        <div className="h-24 rounded bg-foreground/10" />
        <div className="h-24 rounded bg-foreground/10" />
        <div className="h-24 rounded bg-foreground/10" />
      </div>
    </main>
  );
}
