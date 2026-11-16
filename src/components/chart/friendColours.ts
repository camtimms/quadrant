/**
 * The Tailwind classes for each friend colour (R67), by colour number 1–7
 * as memberColours (src/lib/quadrant/memberColours.ts) hands them out.
 *
 * Every class is written out in full on purpose. Tailwind only creates the
 * classes it can find spelled out in the source, so building one as
 * `border-friend-${n}` would silently give no colour at all.
 */
const BORDER = [
  "border-friend-1",
  "border-friend-2",
  "border-friend-3",
  "border-friend-4",
  "border-friend-5",
  "border-friend-6",
  "border-friend-7",
];
const TEXT = [
  "text-friend-1",
  "text-friend-2",
  "text-friend-3",
  "text-friend-4",
  "text-friend-5",
  "text-friend-6",
  "text-friend-7",
];
const BACKGROUND = [
  "bg-friend-1",
  "bg-friend-2",
  "bg-friend-3",
  "bg-friend-4",
  "bg-friend-5",
  "bg-friend-6",
  "bg-friend-7",
];

/** A friend colour's classes: outline, text and fill. */
export function friendColourClasses(colour: number) {
  const index = colour - 1;
  return { border: BORDER[index], text: TEXT[index], bg: BACKGROUND[index] };
}
