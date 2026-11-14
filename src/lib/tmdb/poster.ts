/**
 * Building poster image addresses (design section 4.2).
 *
 * We store only TMDB's poster path ("/abc.jpg"). The browser loads the image
 * straight from TMDB's image server at
 *   https://image.tmdb.org/t/p/<size><poster_path>
 *
 * No secret is involved, so this file is safe to use in browser code.
 */

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";

/**
 * The two sizes we use. The names are TMDB's and mean "this many pixels
 * wide"; TMDB only serves the sizes its /configuration endpoint lists
 * (w92, w154, w185, w342, w500, w780, original — checked 2026-11-14, and the
 * test compares against a saved copy of that response).
 *
 * Each is roughly twice the width it is drawn at, so posters stay sharp on
 * high-density phone screens without downloading the full-size original.
 */
export const POSTER_SIZES = {
  /** Search results and film lists. */
  list: "w185",
  /** The film page. */
  page: "w342",
} as const;

export type PosterSize = keyof typeof POSTER_SIZES;

/**
 * The full image address for a poster, or null when the film has none, in
 * which case the caller shows a placeholder instead (R10).
 */
export function posterUrl(
  posterPath: string | null,
  size: PosterSize,
): string | null {
  if (!posterPath) return null;
  return `${IMAGE_BASE_URL}${POSTER_SIZES[size]}${posterPath}`;
}
