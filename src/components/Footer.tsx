import Link from "next/link";
import { focusRing, mutedText } from "@/components/ui/styles";

/**
 * The strip at the bottom of every page, signed in or not.
 *
 * Its job is the link to /about, where the credit TMDB's terms require is
 * shown (NFR18). It lives in the root layout so that no page can be added
 * without it.
 */
export function Footer() {
  return (
    <footer className="px-4 py-4 text-center text-sm">
      <Link
        href="/about"
        className={`rounded underline-offset-4 hover:underline ${mutedText} ${focusRing}`}
      >
        About · film data from TMDB
      </Link>
    </footer>
  );
}
