/**
 * Members' pictures: which addresses may be shown, and what to show when
 * there is no picture (R61; design section 16).
 *
 * Pure functions, no React and no database, tested in picture.test.ts.
 */

/**
 * Real addresses are about 100 characters; anything far beyond that is not
 * one. The database applies the same limit.
 */
const MAX_PICTURE_ADDRESS_LENGTH = 500;

/**
 * Is this the address of a picture on Google's own picture servers?
 *
 * This is the app's copy of a rule the DATABASE enforces
 * (private.is_google_picture, migration 5), and the two must agree; both are
 * tested with the same cases. The database's copy is the one that cannot be
 * bypassed. This one exists so that the component drawing a picture can
 * refuse, at the last moment, to make a friend's browser fetch anything
 * else, whatever some other code handed it.
 *
 * The pattern, piece by piece:
 *   ^https:\/\/                 starts with https (never plain http)
 *   lh[0-9]                     lh3, lh4, ... Google's picture servers
 *   \.googleusercontent\.com    that exact name
 *   \/                          then a slash, so the name must END there:
 *                               "googleusercontent.com.evil.example" fails
 *
 * Takes `unknown` because the value can come from sign-in details, which
 * arrive from outside the app.
 */
export function isGooglePicture(address: unknown): address is string {
  return (
    typeof address === "string" &&
    address.length <= MAX_PICTURE_ADDRESS_LENGTH &&
    /^https:\/\/lh[0-9]\.googleusercontent\.com\//.test(address)
  );
}

/**
 * The member's own Google picture, from the details Google passed along at
 * sign-in, or null if there is none.
 *
 * Used only to show a member their OWN picture on /welcome, before they
 * decide whether friends should see it. What friends see always comes from
 * the database, never from here.
 *
 * The field is "avatar_url" (checked with a real sign-in, design 16.8).
 */
export function googlePictureFrom(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null) return null;
  const address = (metadata as Record<string, unknown>).avatar_url;
  return isGooglePicture(address) ? address : null;
}

/**
 * The letter shown in a circle in place of a picture: the first character
 * of the name, as a capital. "?" if there is no name to take it from.
 *
 * `[...name]` splits the text into whole characters. `name[0]` would not:
 * an emoji is stored as two halves, and the first half alone is a broken
 * box.
 */
export function initialOf(name: string): string {
  const [first] = [...name.trim()];
  return first ? first.toLocaleUpperCase() : "?";
}
