import Link from "next/link";

/**
 * The strip at the bottom of every page, signed in or not.
 *
 * Its job is the link to /about, where the credit TMDB's terms require is
 * shown (NFR18). It lives in the root layout so that no page can be added
 * without it.
 */
export function Footer() {
  return (
    <footer className="border-t border-foreground/15 px-4 py-3 text-center text-sm">
      <Link
        href="/about"
        className="underline-offset-4 opacity-80 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        About · film data from TMDB
      </Link>
    </footer>
  );
}
