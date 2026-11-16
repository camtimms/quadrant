/**
 * The arithmetic behind fitting a photo into the circle (R80, design 23.3).
 *
 * The cropper shows the photo inside a square "view" (the circle is drawn
 * over it). At zoom 1 the photo is scaled so its SHORTER side just fills
 * the view: the circle is never left with gaps. The member then slides it
 * (an offset, in on-screen pixels, of the photo's centre from the view's
 * centre) and zooms it up to MAX_ZOOM.
 *
 * Kept free of the browser so every rule can be tested: the component only
 * reads the pointer and the slider and draws what these functions say.
 */

/** The saved picture is always this many pixels square. */
export const OUTPUT_SIZE = 256;

/** The most a photo can be enlarged, relative to just filling the circle. */
export const MAX_ZOOM = 4;

type Size = { width: number; height: number };
type Offset = { x: number; y: number };

/** Zoom kept between 1 (just fills the circle) and MAX_ZOOM. */
export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(1, zoom));
}

/** On-screen pixels per photo pixel, for this view size and zoom. */
function scaleOf(photo: Size, view: number, zoom: number): number {
  return (view / Math.min(photo.width, photo.height)) * clampZoom(zoom);
}

/** Keeps a value within -limit..limit; "+ 0" turns a -0 into 0. */
const within = (value: number, limit: number) =>
  Math.min(limit, Math.max(-limit, value)) + 0;

/**
 * The offset kept within reach: the photo may slide only as far as it
 * still covers the whole view, so the circle never shows a gap.
 */
export function clampOffset(
  offset: Offset,
  photo: Size,
  view: number,
  zoom: number,
): Offset {
  const scale = scaleOf(photo, view, zoom);
  return {
    x: within(offset.x, (photo.width * scale - view) / 2),
    y: within(offset.y, (photo.height * scale - view) / 2),
  };
}

/**
 * The square of the PHOTO (in its own pixels) that the view shows: what is
 * drawn onto the 256 x 256 picture when the member saves. Moving the photo
 * right on screen brings more of its left side into view, hence the minus.
 * The offset is clamped first, so the square never reaches outside it.
 */
export function sourceSquare(
  photo: Size,
  view: number,
  zoom: number,
  offset: Offset,
): { x: number; y: number; size: number } {
  const scale = scaleOf(photo, view, zoom);
  const { x, y } = clampOffset(offset, photo, view, zoom);
  const size = view / scale;
  return {
    x: photo.width / 2 - x / scale - size / 2,
    y: photo.height / 2 - y / scale - size / 2,
    size,
  };
}
