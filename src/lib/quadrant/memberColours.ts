import { FRIEND_COUNT } from "@/lib/theme";

/**
 * A colour for each friend on a film's spoke map (R67, design 17.7).
 *
 * Colours are numbered 1 to 7, matching the theme's `friend-1` … `friend-7`
 * (src/lib/theme.ts, where each is measured for contrast). The viewer is
 * never given one: they are always the theme's yellow.
 *
 * Two wishes pull against each other: the same person should be the same
 * colour on every film, and no two people on one map should share a
 * colour. So each member has a PREFERRED colour, worked out from their id
 * alone, and keeps it unless someone else on this map already has it.
 */

export const FRIEND_COLOUR_COUNT = FRIEND_COUNT;

/**
 * A member's preferred colour: the sum of the character codes of their id,
 * counted round the seven colours. Nothing clever is needed; it only has
 * to be the same every time for the same id, and spread different ids
 * across all seven.
 */
export function preferredColour(memberId: string): number {
  let sum = 0;
  for (const character of memberId) sum += character.codePointAt(0)!;
  return (sum % FRIEND_COLOUR_COUNT) + 1;
}

/**
 * Each friend's colour on one map, as a Map from member id to 1–7.
 *
 * Friends are handed colours in order of id, never in the order given,
 * because the database can return ratings in any order and the colours
 * must not change between two loads of the same page. A friend whose
 * preferred colour is taken gets the next free one (7 goes round to 1).
 * Once all seven are taken, colours repeat (E38): each friend then simply
 * gets their preferred one, and their written name tells them apart.
 */
export function memberColours(
  viewerId: string,
  friendIds: readonly string[],
): Map<string, number> {
  const friends = [...new Set(friendIds)]
    .filter((id) => id !== viewerId)
    .sort();

  const colours = new Map<string, number>();
  const taken = new Set<number>();

  for (const id of friends) {
    const preferred = preferredColour(id);
    let colour = preferred;
    if (taken.size < FRIEND_COLOUR_COUNT) {
      // Step round from the preferred colour to the first free one.
      while (taken.has(colour)) colour = (colour % FRIEND_COLOUR_COUNT) + 1;
    }
    colours.set(id, colour);
    taken.add(colour);
  }

  return colours;
}
