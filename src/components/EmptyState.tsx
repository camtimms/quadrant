import Link from "next/link";
import { buttonMain, card, mutedText } from "@/components/ui/styles";
import { SCALE_END_LABELS } from "@/lib/quadrant";

/**
 * What a member sees on "My films" before they have rated anything (R35),
 * and on "Friends' films" before anybody has:
 * what the two scores mean, and where to go to start.
 *
 * An empty chart with no explanation would look broken. This is also the
 * first thing a newly invited friend reads, so it explains the idea of the
 * app in a few lines.
 */
export function EmptyState({
  heading = "You haven't rated any films yet",
}: {
  /** Friends' films says "nobody" where My films says "you". */
  heading?: string;
}) {
  return (
    <div className={`${card} flex flex-col gap-4`}>
      <h2 className="text-lg font-semibold">{heading}</h2>
      <p>Every film here gets two scores from 0 to 10, not one:</p>
      {/* A description list: each term (<dt>) with its meaning (<dd>). */}
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="font-medium">Quality</dt>
          <dd className={`text-sm ${mutedText}`}>
            How good is it as a film? From {SCALE_END_LABELS.quality.low} to{" "}
            {SCALE_END_LABELS.quality.high}.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Enjoyment</dt>
          <dd className={`text-sm ${mutedText}`}>
            How much did you enjoy watching it? From{" "}
            {SCALE_END_LABELS.enjoyment.low} to{" "}
            {SCALE_END_LABELS.enjoyment.high}.
          </dd>
        </div>
      </dl>
      <p className={`text-sm ${mutedText}`}>
        The two often disagree, and that is the point. Films are then laid out
        on a chart by both scores.
      </p>
      <Link href="/search" className={`${buttonMain} self-start`}>
        Find a film to rate
      </Link>
    </div>
  );
}
