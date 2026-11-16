"use client";

// "use client" because the button changes the moment it is pressed, before
// the server has answered, and needs a click handler.

import { useOptimistic, useState, useTransition } from "react";
import { setReviewLike } from "@/app/(app)/actions/like";
import type { Liker } from "@/components/film/RatingCards";
import { focusRing } from "@/components/ui/styles";

type Props = {
  /** The rating whose review this is (what a like points at). */
  ratingId: number;
  /** The reviewer's name, for the button's label. */
  reviewerName: string;
  /** True on the viewer's own card: liking your own is allowed (R71). */
  isOwnReview: boolean;
  /** Whoever is looking at the page. */
  viewer: Liker;
  /** Who liked the review so far, sorted by name (R70). */
  likes: readonly Liker[];
};

// Two looks, written out in full rather than layered over a shared pill, so
// no two background colours ever compete on one element. Pressed is the
// theme's "chosen" yellow, outlined in light mode (NFR14), like the current
// page in the header.
const BASE = `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm hover:brightness-95 active:brightness-90 dark:hover:brightness-125 dark:active:brightness-150`;
const RESTING = `${BASE} bg-well text-ink`;
const PRESSED = `${BASE} bg-accent font-semibold text-on-accent ring-1 ring-accent-outline`;

/**
 * The like button under a review on the film page (R69–R71, design 20.3),
 * with the number of likes, and the names of those who liked it below.
 *
 * Pressing it changes the button at once (React's useOptimistic) and asks
 * the server to save the like. The server then redraws the page with the
 * database's own answer. If saving fails, the optimistic change simply
 * falls away when the attempt ends, and a message says so (E53).
 */
export function LikeButton({
  ratingId,
  reviewerName,
  isOwnReview,
  viewer,
  likes,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);

  // What is shown: the real likes, with the viewer's press applied on top
  // until the server's answer arrives.
  const [shown, applyPress] = useOptimistic(
    likes,
    (current: readonly Liker[], liked: boolean) =>
      liked
        ? [...current.filter((like) => like.userId !== viewer.userId), viewer]
        : current.filter((like) => like.userId !== viewer.userId),
  );

  const likedByViewer = shown.some((like) => like.userId === viewer.userId);
  const label = `${likedByViewer ? "Unlike" : "Like"} ${
    isOwnReview ? "your review" : `${reviewerName}'s review`
  }`;

  function press() {
    const wanted = !likedByViewer;
    setProblem(null);
    startTransition(async () => {
      applyPress(wanted);
      const result = await setReviewLike(ratingId, wanted);
      if (result.status === "error") setProblem(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={press}
        aria-pressed={likedByViewer}
        aria-label={label}
        // Pressing again while a save is on its way would only race it.
        aria-disabled={pending || undefined}
        className={`self-start ${focusRing} ${likedByViewer ? PRESSED : RESTING}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          // Filled when liked, an outline when not: shape, not only
          // colour, says which (NFR14).
          fill={likedByViewer ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
        >
          <path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z" />
        </svg>
        {shown.length > 0 ? (
          <span className="tabular-nums">{shown.length}</span>
        ) : null}
      </button>
      {shown.length > 0 ? (
        <p className="text-sm text-ink-muted">
          Liked by {namesOf(shown, viewer)}
        </p>
      ) : null}
      {problem ? (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      ) : null}
    </div>
  );
}

/** "you, Priya and Sam": the viewer first, as "you", then the rest. */
function namesOf(likes: readonly Liker[], viewer: Liker): string {
  const names = [
    ...likes.filter((like) => like.userId === viewer.userId).map(() => "you"),
    ...likes
      .filter((like) => like.userId !== viewer.userId)
      .map((like) => like.displayName),
  ];
  return names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
