/**
 * Facts about the site that more than one file needs.
 * Kept in one place so the name can change without a search-and-replace.
 */
export const SITE_NAME = "Quadrant";

export const SITE_DESCRIPTION =
  "A private film log where every film gets two scores: how good it is, and how much you enjoyed it.";

/**
 * Page-level "do not index" setting, applied to every page by the root layout.
 *
 * robots.txt asks crawlers not to *visit*; this asks them not to *list* a page
 * even if they reach it another way (for example via a link someone shared).
 * We use both because each covers a gap the other leaves.
 */
export const NO_INDEX = { index: false, follow: false } as const;
