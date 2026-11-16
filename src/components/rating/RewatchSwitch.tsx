"use client";

// "use client" because it remembers which of the two forms is showing.

import { useState, type ReactNode } from "react";
import { RatingForm } from "@/components/rating/RatingForm";
import { buttonSecondary, mutedText } from "@/components/ui/styles";
import type { RatingInput } from "@/lib/validation/rating";

type Props = {
  tmdbId: number;
  /** The member's current rating: the rewatch form starts from its scores. */
  initialRating: RatingInput;
  /** Shown under the edit form only: the delete button. */
  children?: ReactNode;
};

/**
 * The open "Your rating" section of a film the member has rated: the edit
 * form, and "Log a rewatch" (R83).
 *
 * The two are different on purpose (Q11). Editing corrects the current
 * rating ("I mis-tapped"); a rewatch keeps it as an earlier viewing and adds
 * a new one. Only one form shows at a time, so it is always clear which of
 * the two a press of the button will do.
 */
export function RewatchSwitch({ tmdbId, initialRating, children }: Props) {
  const [rewatching, setRewatching] = useState(false);

  if (rewatching) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">Log a rewatch</h3>
          <p className={`text-sm ${mutedText}`}>
            Your current rating will be kept as an earlier viewing, and these
            scores become your rating.
          </p>
        </div>
        <RatingForm tmdbId={tmdbId} initialRating={initialRating} rewatch />
        <button
          type="button"
          onClick={() => setRewatching(false)}
          className={`${buttonSecondary} self-start text-sm`}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RatingForm tmdbId={tmdbId} initialRating={initialRating} />
      {children}
      <div className="flex flex-col gap-2 border-t border-well pt-4">
        <p className={`text-sm ${mutedText}`}>Watched it again?</p>
        <button
          type="button"
          onClick={() => setRewatching(true)}
          className={`${buttonSecondary} self-start text-sm`}
        >
          Log a rewatch
        </button>
      </div>
    </div>
  );
}
