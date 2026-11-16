import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { formatScore } from "@/components/chart/scale";
import { MemberName } from "@/components/film/MemberName";
import { roundToOneDecimal, type Point } from "@/lib/quadrant";

/**
 * One member's rating of a film, cut down to what the Friends' films panel
 * shows (R57, R59). Built by groupFilms.
 */
export type FilmRater = {
  userId: string;
  displayName: string;
  /** The address of their Google picture, or null (R61). */
  avatarUrl: string | null;
  /** That member's own two scores, not the group's average. */
  point: Point;
  /**
   * The first part of their review, already cut short on the server, or
   * null when they wrote none. The whole review is on the film's page.
   */
  reviewStart: string | null;
};

/**
 * "Rated by 3 members · Biggest disagreement 7": the one line a group list
 * and the panel both show for a film (R44, R57). A <span>, so it can sit
 * inside a link.
 *
 * "!= null" is false for both null and undefined, so a film with one rating
 * shows no disagreement at all, while a real 0 ("they agree exactly") is
 * shown (R45).
 */
export function GroupLine({
  ratedBy,
  disagreement,
}: {
  ratedBy: number;
  disagreement?: number | null;
}) {
  return (
    <span data-testid="group-line" className="text-sm text-ink-muted">
      Rated by {ratedBy === 1 ? "1 member" : `${ratedBy} members`}
      {disagreement != null
        ? ` · Biggest disagreement ${formatScore(roundToOneDecimal(disagreement))}`
        : null}
    </span>
  );
}

type Props = {
  /** The raters to show, most recently rated first. */
  raters: readonly FilmRater[];
  /** How many members rated the film altogether. */
  ratedBy: number;
  /** The film, for the link to where every rating is shown. */
  tmdbId: number;
  title: string;
};

/**
 * Who rated a film, inside the Friends' films panel (R57–R59): one line per
 * member with their picture, name and two scores, and under it the start of
 * their review. Deliberately plain, with no table and no rules between the
 * lines: the panel is a glance, and the film's page has the full cards.
 */
export function RaterLines({ raters, ratedBy, tmdbId, title }: Props) {
  if (raters.length === 0) return null;

  // The panel shows at most three raters. Any others are counted, not
  // listed (R58, E29).
  const more = ratedBy - raters.length;

  return (
    <div className="flex flex-col gap-2 px-1">
      <ul aria-label={`Who rated ${title}`} className="flex flex-col gap-2">
        {raters.map((rater) => (
          <li
            key={rater.userId}
            data-testid="rater-line"
            className="flex flex-col gap-1 text-sm"
          >
            {/* flex-wrap: on a narrow phone a long name keeps the first
                line and the scores drop to the next. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Avatar name={rater.displayName} url={rater.avatarUrl} />
              <span className="min-w-0 font-medium break-words">
                {/* Everyone is a link here, the viewer included: their own
                    link simply leads to My films. */}
                <MemberName rating={{ ...rater, isViewer: false }} />
              </span>
              <span data-testid="rater-scores" className="text-ink-muted">
                Quality {formatScore(rater.point.quality)} · Enjoyment{" "}
                {formatScore(rater.point.enjoyment)}
              </span>
            </div>
            {rater.reviewStart ? (
              // "line-clamp-3" shows at most three lines and ends the third
              // with "…" (E31). The text itself was already cut to 200
              // characters before it left the server. Plain text, as
              // everywhere a member's words are shown.
              <p
                data-testid="review-start"
                className="line-clamp-3 break-words"
              >
                {rater.reviewStart}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {more > 0 ? (
        <Link
          href={`/film/${tmdbId}`}
          data-testid="more-raters"
          className="self-start text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60"
        >
          and {more} more on the film&apos;s page
        </Link>
      ) : null}
    </div>
  );
}
