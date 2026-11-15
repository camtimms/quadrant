import { formatScore } from "@/components/chart/scale";
import { MemberName, type MemberRating } from "@/components/film/RatingsTable";
import { roundToOneDecimal, spokesFrom } from "@/lib/quadrant";

type Props = {
  /** Every member's current rating of the film, the viewer's included. */
  ratings: readonly MemberRating[];
};

/**
 * The spoke map in words: how far each friend's rating is from the
 * viewer's, with the furthest marked "biggest disagreement" (R41).
 *
 * A chart is never the only way to get information (NFR13). The lengths of
 * the lines on the spoke map are hard to judge by eye and invisible to a
 * screen reader, so each one is stated here as a number.
 *
 * It renders nothing when there is nothing to measure: the viewer has not
 * rated the film (R40), or nobody else has (E11).
 */
export function DisagreementTable({ ratings }: Props) {
  const viewer = ratings.find((rating) => rating.isViewer);
  if (!viewer) return null;

  const friends = ratings.filter((rating) => !rating.isViewer);
  if (friends.length === 0) return null;

  // All the arithmetic is in the tested function (NFR17); this component
  // only decides how to word the result.
  const spokes = spokesFrom(viewer.point, friends);

  return (
    <table className="w-full text-left text-sm">
      {/* A caption is the table's title: sighted readers see it above the
          table, and a screen reader announces it on entering the table. */}
      <caption className="pb-2 text-left">
        <span className="font-semibold">How far each friend is from you</span>
        <span className="block opacity-70">
          The length of each line on the chart, in points: 0 is the same scores,
          and about 14 is opposite corners.
        </span>
      </caption>
      <thead>
        <tr className="border-b border-foreground/20">
          <th scope="col" className="py-2 pr-2 font-medium">
            Friend
          </th>
          <th scope="col" className="px-2 py-2 font-medium">
            Quality
          </th>
          <th scope="col" className="px-2 py-2 font-medium">
            Enjoyment
          </th>
          <th scope="col" className="py-2 pl-2 font-medium">
            Disagreement
          </th>
        </tr>
      </thead>
      <tbody>
        {spokes.map(({ item: friend, disagreement, isLargest }) => (
          <tr key={friend.userId} className="border-b border-foreground/10">
            <th scope="row" className="py-2 pr-2 font-medium break-words">
              <MemberName rating={friend} />
            </th>
            <td className="px-2 py-2">{formatScore(friend.point.quality)}</td>
            <td className="px-2 py-2">{formatScore(friend.point.enjoyment)}</td>
            <td className="py-2 pl-2">
              {disagreement === 0 ? (
                // E13: said in words. A bare "0" could be read as "no data".
                "You agree exactly"
              ) : (
                <>
                  {/* Rounded only here, at the moment it is shown. */}
                  <span className={isLargest ? "font-semibold" : undefined}>
                    {formatScore(roundToOneDecimal(disagreement))}
                  </span>
                  {/* Marked in words, not just in bold or a colour (NFR14). */}
                  {isLargest ? (
                    <span className="ml-2 inline-block rounded border border-foreground/40 px-1.5 text-xs font-medium">
                      Biggest disagreement
                    </span>
                  ) : null}
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
