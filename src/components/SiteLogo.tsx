import { SITE_ICON_PATH } from "@/lib/site";

type Props = {
  /** Width and height in pixels; the icon is square. */
  size: number;
};

/**
 * The site's icon, for sitting beside the site's name (NFR25).
 *
 * The alt text is deliberately empty. The name is always written next to
 * the icon, so a screen reader that also announced "Quadrant logo" would
 * just say the name twice; empty alt text tells it to skip the picture.
 */
export function SiteLogo({ size }: Props) {
  return (
    // A plain <img>: a small fixed file of our own, so there is nothing for
    // Next.js's image optimiser to do. The file is 192 pixels square, which
    // stays sharp at these sizes even on a high-density phone screen.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SITE_ICON_PATH}
      alt=""
      // Giving both numbers lets the browser reserve the space before the
      // file loads, so the name beside it does not jump sideways.
      width={size}
      height={size}
      // shrink-0 stops a crowded row squeezing the icon out of square.
      className="shrink-0 rounded"
    />
  );
}
