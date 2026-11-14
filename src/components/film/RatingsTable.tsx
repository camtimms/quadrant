import { formatScore } from "@/components/chart/scale";
import { classify, PLACEMENT_LABELS, type Point } from "@/lib/quadrant";

/** One member's current rating of a film, ready to show. */
export type MemberRating = {
  userId: string;
  displayName: string;
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
 * Every member's rating of one film: name, both scores and placement in a
 * table, then the reviews underneath (R37).
 *
 * The reviews are a separate list, not a fifth column, because a review can
 * be 500 characters long and a table column on a phone is a few words wide.
 *
 * It shows whatever it is given, whether or not the viewer has rated the
 * film themselves (E12).
 */
export function RatingsTable({ ratings }: Props) {
  if (ratings.length === 0) {
    return (
      <p className="text-sm opacity-70">
        Nobody has rated this film yet. Be the first.
      </p>
    );
  }

  const reviews = ratings.filter((rating) => rating.review);

  return (
    <div className="flex flex-col gap-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-foreground/20">
            {/* scope tells a screen reader which cells a heading belongs
                to: "col" for the column below it, "row" for the row beside
                it. */}
            <th scope="col" className="py-2 pr-2 font-medium">
              Member
            </th>
            <th scope="col" className="px-2 py-2 font-medium">
              Quality
            </th>
            <th scope="col" className="px-2 py-2 font-medium">
              Enjoyment
            </th>
            <th scope="col" className="py-2 pl-2 font-medium">
              Placement
            </th>
          </tr>
        </thead>
        <tbody>
          {ratings.map((rating) => (
            <tr key={rating.userId} className="border-b border-foreground/10">
              <th scope="row" className="py-2 pr-2 font-medium break-words">
                {rating.displayName}
                {rating.isViewer ? (
                  <span className="font-normal opacity-70"> (you)</span>
                ) : null}
              </th>
              <td className="px-2 py-2">{formatScore(rating.point.quality)}</td>
              <td className="px-2 py-2">
                {formatScore(rating.point.enjoyment)}
              </td>
              {/* Worked out from the scores every time, never stored. */}
              <td className="py-2 pl-2">
                {PLACEMENT_LABELS[classify(rating.point)]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {reviews.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Reviews</h3>
          <ul className="flex flex-col gap-3">
            {reviews.map((rating) => (
              <li
                key={rating.userId}
                data-testid="review"
                className="flex flex-col gap-1 text-sm"
              >
                <span className="font-medium">
                  {rating.displayName}
                  {rating.isViewer ? (
                    <span className="font-normal opacity-70"> (you)</span>
                  ) : null}
                </span>
                {/* React writes this out as plain text, so anything in a
                    review that looks like HTML is shown, not run.
                    "whitespace-pre-line" keeps the member's line breaks. */}
                <p className="break-words whitespace-pre-line opacity-90">
                  {rating.review}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
