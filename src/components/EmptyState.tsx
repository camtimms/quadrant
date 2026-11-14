import Link from "next/link";
import { SCALE_END_LABELS } from "@/lib/quadrant";

/**
 * What a member sees on "My films" before they have rated anything (R35):
 * what the two scores mean, and where to go to start.
 *
 * An empty chart with no explanation would look broken. This is also the
 * first thing a newly invited friend reads, so it explains the idea of the
 * app in a few lines.
 */
export function EmptyState() {
  return (
    <div className="flex flex-col gap-4 rounded border border-foreground/20 p-5">
      <h2 className="text-lg font-semibold">
        You haven&apos;t rated any films yet
      </h2>
      <p>Every film here gets two scores from 0 to 10, not one:</p>
      {/* A description list: each term (<dt>) with its meaning (<dd>). */}
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="font-medium">Quality</dt>
          <dd className="text-sm opacity-80">
            How good is it as a film? From {SCALE_END_LABELS.quality.low} to{" "}
            {SCALE_END_LABELS.quality.high}.
          </dd>
        </div>
        <div>
          <dt className="font-medium">Enjoyment</dt>
          <dd className="text-sm opacity-80">
            How much did you enjoy watching it? From{" "}
            {SCALE_END_LABELS.enjoyment.low} to{" "}
            {SCALE_END_LABELS.enjoyment.high}.
          </dd>
        </div>
      </dl>
      <p className="text-sm opacity-80">
        The two often disagree, and that is the point. Your films are then laid
        out on a chart by both scores.
      </p>
      <Link
        href="/search"
        className="self-start rounded bg-foreground px-4 py-2 font-medium text-background hover:opacity-90 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Find a film to rate
      </Link>
    </div>
  );
}
