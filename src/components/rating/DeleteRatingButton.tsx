"use client";

// "use client" because it remembers whether the member has pressed Delete
// once and is now being asked to confirm.

import { useActionState, useState } from "react";
import { deleteRating } from "@/app/(app)/actions/rating";
import type { DeleteRatingState } from "@/lib/validation/rating";

type Props = {
  /** OUR id for the film (titles.id), which is what ratings point at. */
  titleId: number;
  /** Shown in the question, so the member knows exactly what will go. */
  filmTitle: string;
};

/**
 * Delete the member's rating of a film, in two steps (R21).
 *
 * The first press only reveals the question. Nothing is deleted until the
 * member answers "Yes, delete". The question is part of the page rather
 * than a browser pop-up (window.confirm) so that it can name the film, be
 * styled like everything else, and be used comfortably with a keyboard.
 */
export function DeleteRatingButton({ titleId, filmTitle }: Props) {
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
        className="self-start rounded border border-foreground/30 px-3 py-1 text-sm hover:bg-foreground/10 active:bg-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Delete rating
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded border border-red-600/60 p-3"
    >
      <input type="hidden" name="title_id" value={titleId} />
      <p className="text-sm">
        Delete your rating of {filmTitle}? Your scores and review will be
        removed. This cannot be undone.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-red-700 px-3 py-1 text-sm font-medium text-white hover:opacity-90 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
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
          className="rounded border border-foreground/30 px-3 py-1 text-sm hover:bg-foreground/10 active:bg-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Cancel
        </button>
      </div>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
