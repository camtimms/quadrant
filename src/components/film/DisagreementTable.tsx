import { friendColourClasses } from "@/components/chart/friendColours";
import { formatScore } from "@/components/chart/scale";
import { MemberName } from "@/components/film/MemberName";
import type { MemberRating } from "@/components/film/RatingCards";
import {
  groupAverage,
  memberColours,
  roundToOneDecimal,
  spokesFrom,
} from "@/lib/quadrant";

type Props = {
  /** Every member's current rating of the film, the viewer's included. */
  ratings: readonly MemberRating[];
  /**
   * What the distances are measured from, matching the map's switch (R100):
   * the viewer's own rating ("me", R41) or the group average.
   */
  hub?: "average" | "me";
};

/** The words that change with what the table measures from. */
const WORDING = {
  me: {
    title: "How far each friend is from you",
    detail:
      "The length of each line on the chart, in points: 0 is the same scores, and about 14 is opposite corners.",
    who: "Friend",
    distance: "Disagreement",
    largest: "Biggest disagreement",
    zero: "You agree exactly",
  },
  average: {
    title: "How far each member is from the group average",
    detail:
      "The length of each line on the chart, in points: 0 is exactly the average.",
    who: "Member",
    distance: "From average",
    largest: "Furthest from the group",
    zero: "Exactly the average",
  },
} as const;

/**
 * The spoke map in words: how far each friend's rating is from the
 * viewer's, with the furthest marked "biggest disagreement" (R41), or, as
 * the map's switch says (R100), how far each member is from the group
 * average, the furthest marked "furthest from the group".
 *
 * A chart is never the only way to get information (NFR13). The lengths of
 * the lines on the spoke map are hard to judge by eye and invisible to a
 * screen reader, so each one is stated here as a number.
 *
 * It renders nothing when there is nothing to measure: one rating (E87),
 * or, from the viewer, a viewer who has not rated the film (R41).
 */
export function DisagreementTable({ ratings, hub = "me" }: Props) {
  if (ratings.length < 2) return null;
  const viewer = ratings.find((rating) => rating.isViewer);
  const friends = ratings.filter((rating) => !rating.isViewer);
  const words = WORDING[hub];

  // All the arithmetic is in the tested functions (NFR17); this component
  // only decides how to word the result. From the average, every member is
  // listed, the viewer too; from the viewer, only their friends.
  let spokes;
  if (hub === "average") {
    spokes = spokesFrom(groupAverage(ratings.map((r) => r.point))!, ratings);
  } else {
    if (!viewer) return null;
    spokes = spokesFrom(viewer.point, friends);
  }

  // The same colours as the spoke map above, so a row can be matched to
  // its point (R67, Q18).
  const colours = memberColours(
    viewer?.userId ?? "",
    friends.map((friend) => friend.userId),
  );

  return (
    <table className="w-full text-left text-sm">
      {/* A caption is the table's title: sighted readers see it above the
          table, and a screen reader announces it on entering the table. */}
      <caption className="pb-2 text-left">
        <span className="font-semibold">{words.title}</span>
        <span className="block text-ink-muted">{words.detail}</span>
      </caption>
      <thead>
        <tr className="border-b border-edge">
          <th scope="col" className="py-2 pr-2 font-medium">
            {words.who}
          </th>
          <th scope="col" className="px-2 py-2 font-medium">
            Quality
          </th>
          <th scope="col" className="px-2 py-2 font-medium">
            Enjoyment
          </th>
          <th scope="col" className="py-2 pl-2 font-medium">
            {words.distance}
          </th>
        </tr>
      </thead>
      <tbody>
        {spokes.map(({ item: member, disagreement, isLargest }) => (
          <tr key={member.userId} className="border-b border-well">
            <th scope="row" className="py-2 pr-2 font-medium break-words">
              {/* One flex row, so the narrow first column never breaks
                  between the dot and the name; a long name still wraps
                  after the dot (E15). */}
              <span className="inline-flex items-center gap-1.5">
                {/* Decoration: the name beside it is the information. */}
                {/* The viewer's dot is yellow, as on the map. */}
                <span
                  data-colour-dot
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    member.isViewer
                      ? "bg-accent"
                      : friendColourClasses(colours.get(member.userId) ?? 1).bg
                  }`}
                />
                <span className="min-w-0">
                  {member.isViewer ? "You" : <MemberName rating={member} />}
                </span>
              </span>
            </th>
            <td className="px-2 py-2">{formatScore(member.point.quality)}</td>
            <td className="px-2 py-2">{formatScore(member.point.enjoyment)}</td>
            <td className="py-2 pl-2">
              {disagreement === 0 ? (
                // E13, E86: said in words. A bare "0" could be read as "no
                // data".
                words.zero
              ) : (
                <>
                  {/* Rounded only here, at the moment it is shown. */}
                  <span className={isLargest ? "font-semibold" : undefined}>
                    {formatScore(roundToOneDecimal(disagreement))}
                  </span>
                  {/* Marked in words, not just in bold or a colour (NFR14). */}
                  {isLargest ? (
                    <span className="ml-2 inline-block rounded-md border border-edge px-1.5 text-xs font-medium">
                      {words.largest}
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
