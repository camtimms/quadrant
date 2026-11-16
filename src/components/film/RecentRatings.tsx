import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { LikeButton } from "@/components/film/LikeButton";
import { MemberName } from "@/components/film/MemberName";
import { PosterImage } from "@/components/film/PosterImage";
import type { Liker } from "@/components/film/RatingCards";
import { buttonSecondary, focusRing } from "@/components/ui/styles";
import type { FeedEntry } from "@/lib/data/groupFilms";
import { classify, formatScore, PLACEMENT_LABELS } from "@/lib/quadrant";
import { timesWatchedLabel } from "@/lib/rewatch";

type Props = {
  /** From recentFeed: newest first, reviews already cut short. */
  entries: readonly FeedEntry[];
  /** Whether "Show 50 more" is needed (E61). */
  more: boolean;
  /** Where "Show 50 more" goes: this page asking for 50 more. */
  moreHref: string;
  /** Whoever is looking, for "(you)" and the like buttons. */
  viewer: Liker;
};

/**
 * The feed under Friends' films in most-recent order (R77, R78, design 22):
 * one entry per rating, saying who rated which film, their scores and
 * placement, the start of their review, and the film page's own like
 * button for it: the same likes, the same rating row.
 *
 * Server-drawn, apart from the picture and the like button inside it.
 */
export function RecentRatings({ entries, more, moreHref, viewer }: Props) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-muted">No ratings to show here.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-well rounded-2xl bg-card">
        {entries.map((entry) => {
          const isViewer = entry.userId === viewer.userId;
          return (
            <li key={entry.ratingId} className="flex gap-3 p-3">
              <Link
                href={`/film/${entry.tmdbId}`}
                // The poster is the film link's large target; the title
                // below is a second, readable way to the same page.
                tabIndex={-1}
                aria-hidden="true"
                className={`shrink-0 rounded-lg ${focusRing}`}
              >
                <PosterImage
                  posterPath={entry.posterPath}
                  title={entry.title}
                  size="list"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex min-w-0 items-center gap-2 text-sm">
                  <Avatar name={entry.displayName} url={entry.avatarUrl} />
                  <span className="min-w-0 break-words">
                    <MemberName
                      rating={{
                        userId: entry.userId,
                        displayName: entry.displayName,
                        isViewer,
                      }}
                    />{" "}
                    <span className="text-ink-muted">rated</span>
                  </span>
                </p>
                <Link
                  href={`/film/${entry.tmdbId}`}
                  className={`self-start rounded font-medium break-words underline-offset-4 hover:underline ${focusRing}`}
                >
                  {entry.title}
                </Link>
                {entry.year !== null ? (
                  <span className="text-sm text-ink-muted">{entry.year}</span>
                ) : null}
                <p className="text-sm">
                  Quality {formatScore(entry.point.quality)} · Enjoyment{" "}
                  {formatScore(entry.point.enjoyment)} ·{" "}
                  {PLACEMENT_LABELS[classify(entry.point)]}
                  {/* R84: a rewatch says so; a first watch says nothing. */}
                  {timesWatchedLabel(entry.timesWatched)
                    ? ` · ${timesWatchedLabel(entry.timesWatched)}`
                    : null}
                </p>
                {entry.reviewStart ? (
                  <>
                    {/* At most three lines; the whole review is on the
                        film page. */}
                    <p className="line-clamp-3 text-sm break-words">
                      {entry.reviewStart}
                    </p>
                    <LikeButton
                      ratingId={entry.ratingId}
                      reviewerName={entry.displayName}
                      isOwnReview={isViewer}
                      viewer={viewer}
                      likes={entry.likes}
                    />
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {more ? (
        <Link
          href={moreHref}
          className={`${buttonSecondary} self-start text-sm`}
        >
          Show 50 more
        </Link>
      ) : null}
    </div>
  );
}
