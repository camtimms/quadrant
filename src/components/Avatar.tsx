"use client";

// "use client" because it has to notice, in the browser, when a picture
// fails to load.

import { useEffect, useRef, useState } from "react";
import { initialOf, isGooglePicture } from "@/lib/picture";

type Props = {
  /** The member's display name: where the fallback letter comes from. */
  name: string;
  /** The stored address of their Google picture, or null if none. */
  url: string | null;
  /** "sm" beside a line of text, "md" on a card. */
  size?: "sm" | "md";
};

const SIZES = {
  sm: "h-6 w-6 text-xs",
  md: "h-10 w-10 text-base",
} as const;

/**
 * A member's picture in a circle, or the first letter of their name in a
 * circle when there is no picture or it will not load (R61, E27).
 *
 * It is decoration: the member's name is always written beside it, so it is
 * hidden from screen readers, which would otherwise say the name twice.
 *
 * The picture is fetched by the viewer's browser straight from Google
 * (design 16.3). Two precautions:
 *  - only an address on Google's picture servers is ever loaded, checked
 *    here as well as in the database;
 *  - referrerPolicy="no-referrer" stops the browser telling Google which
 *    page the picture was on.
 */
export function Avatar({ name, url, size = "sm" }: Props) {
  // Remembered as WHICH address failed, not just "it failed". If the member
  // later gets a different address, that one is given its own chance.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const image = useRef<HTMLImageElement>(null);

  // A picture can fail before React has attached the onError handler below
  // (the page's HTML arrives first, and the browser starts loading images
  // at once). So, once on arrival, ask the image itself: "complete" with no
  // width means it already tried and failed.
  useEffect(() => {
    const element = image.current;
    if (element?.complete && element.naturalWidth === 0) {
      setFailedUrl(element.src);
    }
  }, [url]);

  const showPicture = isGooglePicture(url) && failedUrl !== url;

  return (
    <span
      data-testid="avatar"
      aria-hidden="true"
      // shrink-0 and a fixed size: the circle takes the same space with a
      // picture, a letter, or while loading, so the text beside it never
      // jumps. overflow-hidden clips the square picture to the circle.
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-well text-ink ring-1 ring-edge leading-none font-semibold select-none ${SIZES[size]}`}
    >
      {showPicture ? (
        // A plain <img>, not Next.js's <Image>: Google already serves a
        // small square, so there is nothing for the optimiser to do.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={image}
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          // Not fetched until it is about to scroll into view.
          loading="lazy"
          onError={() => setFailedUrl(url)}
          className="h-full w-full object-cover"
        />
      ) : (
        initialOf(name)
      )}
    </span>
  );
}
