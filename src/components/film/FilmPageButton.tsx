import Link from "next/link";
import { pillSmall } from "@/components/ui/styles";
import { PendingMark } from "@/components/PendingMark";

/**
 * A visible button to a film's page (R55), shown beside "Update scores".
 *
 * Tapping the film's row goes to the same page, so this adds nothing a
 * member could not already do. It is here to make that plain: the two
 * things you can do with a film sit side by side as two buttons, instead of
 * one being a button and the other something you have to guess is tappable.
 *
 * It is a link styled as a button, not a <button>. A link is the right
 * element for "go to another page": it can be opened in a new tab, and
 * screen readers announce it as navigation.
 */
export function FilmPageButton({
  tmdbId,
  title,
}: {
  tmdbId: number;
  title: string;
}) {
  return (
    <Link
      href={`/film/${tmdbId}`}
      // The visible words are short; the spoken label says which film,
      // since a list has one of these per row.
      aria-label={`Film page for ${title}`}
      className={pillSmall}
    >
      Film page
      {/* Spins while the film's page is loading. */}
      <PendingMark />
    </Link>
  );
}
