/**
 * Which pages may be seen without signing in (R1).
 *
 * This is an allow-list: it names what is public, and everything else is
 * private. That way a page added next month is protected by default, and
 * forgetting to update this file fails safe (a page is wrongly private, which
 * someone notices at once) rather than unsafe (a page is wrongly public,
 * which nobody notices).
 *
 * Remember what this is for: sending signed-out visitors to the sign-in page
 * so they get a sensible experience. It is NOT what protects the data. That
 * is the database's row-level security (design section 3.5).
 */
const PUBLIC_PATHS = [
  "/login", // the sign-in page itself
  "/auth/callback", // where Google sends people back to
  "/auth/not-invited", // signs an uninvited person out again (task T12)
  "/about", // TMDB attribution (task T18)
  "/robots.txt", // must be readable by the crawlers it is addressed to
] as const;

export function isPublicPath(pathname: string): boolean {
  // "/login/" and "/login" are the same page.
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  // Exact match, or something inside that folder ("/about/credits").
  // Checking for the "/" is what stops "/loginx" passing as "/login".
  return PUBLIC_PATHS.some(
    (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`),
  );
}

/**
 * Where to send someone after they sign in.
 *
 * The destination comes from the URL (?next=/film/603), which means anyone
 * can write anything there. Without a check, a link to OUR sign-in page could
 * bounce a member to a look-alike site afterwards (an "open redirect"). So
 * only a plain path within this site is accepted; anything else becomes "/".
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  // Must start with exactly one "/". Browsers read "//evil.example" and
  // "/\evil.example" as another site.
  const startsWithOneSlash =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  return startsWithOneSlash ? next : "/";
}
