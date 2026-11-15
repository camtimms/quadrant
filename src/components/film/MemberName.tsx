import Link from "next/link";

type Props = {
  /** Only these three facts about a rating are needed to name its member. */
  rating: { userId: string; displayName: string; isViewer: boolean };
};

/**
 * A member's name. A friend's name is a link to their films (R46). The
 * viewer's own name is plain text marked "(you)": their films are a tap
 * away in the header already, and a link among links to other people would
 * suggest it goes somewhere different.
 *
 * In a file of its own because the rating cards and the disagreement table
 * both name members, and must do it the same way.
 */
export function MemberName({ rating }: Props) {
  if (rating.isViewer) {
    return (
      <>
        {rating.displayName}
        <span className="font-normal opacity-70"> (you)</span>
      </>
    );
  }
  return (
    <Link
      href={`/members/${rating.userId}`}
      className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60"
    >
      {rating.displayName}
    </Link>
  );
}
