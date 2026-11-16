/**
 * The site's main navigation: the three pages a member moves between
 * (T31). Kept as plain data so the header and its tests share one list.
 */
export const NAV_LINKS = [
  { label: "My films", href: "/" },
  { label: "Friends' films", href: "/friends" },
  { label: "Search", href: "/search" },
] as const;

/**
 * Is `pathname` (the address without its "?…" part) the page `href` points
 * to?
 *
 * An exact match, after dropping a trailing slash. Not "starts with":
 * every address starts with "/", so that would mark My films as current
 * on every page, and "/friendship" would count as "/friends".
 */
export function isCurrentPage(pathname: string, href: string): boolean {
  const trimmed =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return trimmed === href;
}
