"use client";

// "use client" because it remembers whether the member has pressed Delete
// once and is now being asked to confirm.

import { useActionState, useState } from "react";
import { deleteRating } from "@/app/(app)/actions/rating";
import {
  buttonDanger,
  buttonSecondary,
  errorText,
} from "@/components/ui/styles";
import type { DeleteRatingState } from "@/lib/validation/rating";

type Props = {
  /** OUR id for the film (titles.id), which is what ratings point at. */
  titleId: number;
  /** Shown in the question, so the member knows exactly what will go. */
  filmTitle: string;
  /** How many earlier viewings go with it (R87); none if left out. */
  earlierViewings?: number;
};

/**
 * Delete the member's rating of a film, in two steps (R21).
 *
 * The first press only reveals the question. Nothing is deleted until the
 * member answers "Yes, delete". The question is part of the page rather
 * than a browser pop-up (window.confirm) so that it can name the film, be
 * styled like everything else, and be used comfortably with a keyboard.
 */
export function DeleteRatingButton({
  titleId,
  filmTitle,
  earlierViewings = 0,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, isPending] = useActionState<
    DeleteRatingState,
    FormData
  >(deleteRating, { status: "idle" });

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`${buttonSecondary} self-start text-sm`}
      >
        Delete rating
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-danger p-3"
    >
      <input type="hidden" name="title_id" value={titleId} />
      <p className="text-sm">
        Delete your rating of {filmTitle}
        {earlierViewings === 1
          ? " and your earlier viewing"
          : earlierViewings > 1
            ? ` and your ${earlierViewings} earlier viewings`
            : ""}
        ? Your scores and review will be removed. This cannot be undone.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className={`${buttonDanger} text-sm`}
        >
          {isPending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setConfirming(false)}
          // The safe choice gets the focus, so a stray press of Enter
          // cancels instead of deleting.
          autoFocus
          className={`${buttonSecondary} text-sm`}
        >
          Cancel
        </button>
      </div>
      {state.status === "error" ? (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
