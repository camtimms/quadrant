import { Avatar } from "@/components/Avatar";
import { formatScore } from "@/components/chart/scale";
import { MemberName } from "@/components/film/MemberName";
import { classify, PLACEMENT_LABELS, type Point } from "@/lib/quadrant";

/** One member's current rating of a film, ready to show. */
export type MemberRating = {
  userId: string;
  displayName: string;
  /**
   * The address of the member's Google picture, or null when they have none
   * or have switched it off (R61, R63).
   */
  avatarUrl: string | null;
  point: Point;
  /** null when the member wrote no review. */
  review: string | null;
  /** True for the rating that belongs to whoever is looking at the page. */
  isViewer: boolean;
};

type Props = {
  /** Shown in the order given; the page's loader decides the order. */
  ratings: readonly MemberRating[];
};

/**
 * Every member's rating of one film, one card each (R60, and the content of
 * R37): picture and name, the placement, both scores, and the review.
 *
 * A card, not a table row, because a review can be 500 characters long and
 * belongs beside the scores it explains. In a table it had to live in a
 * separate list underneath.
 *
 * It shows whatever it is given, whether or not the viewer has rated the
 * film themselves (E12).
 *
 * This file has no "use client": it is rendered on the server. Only the
 * small Avatar inside it runs in the browser.
 */
export function RatingCards({ ratings }: Props) {
  if (ratings.length === 0) {
    return (
      <p className="text-sm opacity-70">
        Nobody has rated this film yet. Be the first.
      </p>
    );
  }

  return (
    // A real list: a screen reader announces "list, 3 items", which is how
    // someone who cannot see the cards learns how many ratings there are.
    <ul className="flex flex-col gap-3">
      {ratings.map((rating) => (
        <li
          key={rating.userId}
          data-testid="rating-card"
          className="flex flex-col gap-2 rounded-lg border border-foreground/20 p-4"
        >
          <div className="flex items-center gap-3">
            <Avatar
              name={rating.displayName}
              url={rating.avatarUrl}
              size="md"
            />
            {/* min-w-0 lets a very long name wrap inside the card instead
                of pushing the card wider than the screen. */}
            <span
              data-testid="card-name"
              className="min-w-0 font-medium break-words"
            >
              <MemberName rating={rating} />
            </span>
          </div>

          {/* The card's headline (R60 asks for it to be prominent): the
              largest, boldest text on the card. Worked out from the scores
              every time, never stored. It is words, so it does not depend
              on colour (NFR14). */}
          <p
            data-testid="card-placement"
            className="text-xl leading-tight font-semibold"
          >
            {PLACEMENT_LABELS[classify(rating.point)]}
          </p>

          {/* Each number carries its label, so "3 · 9" can never be read
              the wrong way round. */}
          <p data-testid="card-scores" className="text-sm opacity-80">
            Quality {formatScore(rating.point.quality)} · Enjoyment{" "}
            {formatScore(rating.point.enjoyment)}
          </p>

          {rating.review ? (
            // React writes this out as plain text, so anything in a review
            // that looks like HTML is shown, not run. "whitespace-pre-line"
            // keeps the member's line breaks; "break-words" stops one very
            // long word from stretching the card.
            <p
              data-testid="review"
              className="text-sm break-words whitespace-pre-line"
            >
              {rating.review}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
