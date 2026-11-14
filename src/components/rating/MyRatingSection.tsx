import type { ReactNode } from "react";
import { formatScore } from "@/components/chart/scale";
import { classify, PLACEMENT_LABELS, type Point } from "@/lib/quadrant";

type Props = {
  /** The member's current scores for this film, or null if unrated. */
  rating: Point | null;
  /** The rating form and, for a rated film, the delete button. */
  children: ReactNode;
};

/**
 * The member's own rating on a film's page, as a section that folds away
 * (R56).
 *
 * Once a film is rated, the two sliders and the review box are tall and
 * mostly not needed: the member came to read, not to re-rate. So a rated
 * film shows one line (the scores and the placement) and the form opens
 * when that line is pressed. An unrated film starts open, because rating it
 * is the likeliest reason to be here.
 *
 * It is built from the browser's own <details> and <summary> elements.
 * They open and close with a click, a tap, Enter or Space, and tell screen
 * readers whether they are open, all without any JavaScript of ours. That
 * also means this stays a server component.
 */
export function MyRatingSection({ rating, children }: Props) {
  return (
    <details
      // The key makes React build a new element when a rating appears or
      // disappears (after a delete, say), so the section takes its starting
      // state again: open for an unrated film, closed for a rated one.
      // Without it, React would keep whatever the member last left it as.
      key={rating ? "rated" : "unrated"}
      open={rating === null}
      // "group" lets the arrow inside react to this element being open
      // (the group-open: classes below).
      className="group rounded border border-foreground/20"
    >
      <summary
        // list-none and the ::-webkit-details-marker rule hide the browser's
        // own triangle, which cannot be positioned; ours is drawn below.
        // flex-wrap: the heading, the word and the arrow share the first
        // line, and the scores (basis-full, further down) take a second.
        className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-0.5 rounded p-3 hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 active:bg-foreground/25 [&::-webkit-details-marker]:hidden"
      >
        {/* A heading is allowed directly inside <summary>, and keeps this
            section in the page's outline for screen-reader users who move
            from heading to heading. */}
        <h2 className="min-w-0 flex-1 text-lg font-semibold">
          {rating ? "Your rating" : "Rate this film"}
        </h2>
        {/* Says what a press will do. Two spans, one shown at a time, so the
            words change with the state using CSS alone. */}
        <span className="text-sm underline underline-offset-4">
          <span className="group-open:hidden">
            {rating ? "Change" : "Show"}
          </span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
        {/* Decoration only: the words beside it already say it. Points
            right when closed and turns to point down when open. */}
        <span
          aria-hidden="true"
          className="transition-transform group-open:rotate-90 motion-reduce:transition-none"
        >
          ▸
        </span>
        {/* Worked out from the scores every time, like everywhere else. */}
        {rating ? (
          <span className="basis-full text-sm">
            Quality {formatScore(rating.quality)} · Enjoyment{" "}
            {formatScore(rating.enjoyment)} ·{" "}
            <span className="font-medium">
              {PLACEMENT_LABELS[classify(rating)]}
            </span>
          </span>
        ) : null}
      </summary>

      <div className="flex flex-col gap-4 border-t border-foreground/15 p-3">
        {children}
      </div>
    </details>
  );
}
