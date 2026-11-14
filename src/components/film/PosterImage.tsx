"use client";

// "use client" because it remembers whether the image failed to load, which
// needs React state. It can still be used inside server-rendered pages.

import { useState } from "react";
import { posterUrl, type PosterSize } from "@/lib/tmdb/poster";

type Props = {
  /** TMDB's poster path ("/abc.jpg"), or null when the film has none. */
  posterPath: string | null;
  /** The film title: used as the image's alt text (NFR15). */
  title: string;
  size: PosterSize;
};

// How wide each size is drawn. Posters are 2:3 (width:height), so the
// "aspect-[2/3]" class below gives the height.
const WIDTH_CLASS: Record<PosterSize, string> = {
  list: "w-20",
  page: "w-44",
};

/**
 * A film poster, or a labelled grey box when there isn't one (R10).
 *
 * The box and the picture are the same size, so a list of films lines up
 * whether or not every film has a poster, and nothing jumps as images load.
 */
export function PosterImage({ posterPath, title, size }: Props) {
  // A path can exist and still fail (TMDB removed the image, or the network
  // dropped). Without this the browser would show its "broken image" icon.
  const [failed, setFailed] = useState(false);

  const url = posterUrl(posterPath, size);
  const shape = `${WIDTH_CLASS[size]} aspect-[2/3] shrink-0 rounded`;

  if (!url || failed) {
    return (
      <div
        // role="img" + aria-label: a screen reader announces this exactly as
        // it would a real poster, by the film's title.
        role="img"
        aria-label={title}
        className={`${shape} flex items-center justify-center border border-foreground/20 bg-foreground/10 p-1 text-center text-xs opacity-80`}
      >
        No poster
      </div>
    );
  }

  return (
    // A plain <img>, not Next.js's <Image>: TMDB already serves resized
    // images, and Vercel's free plan only includes 5,000 image optimisations
    // a month (design section 4.2).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={title}
      // Posters further down the page are only fetched as they scroll near.
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${shape} bg-foreground/10 object-cover`}
    />
  );
}
