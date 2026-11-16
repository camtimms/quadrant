import { describe, expect, it } from "vitest";
import {
  FRIEND_COLOUR_COUNT,
  memberColours,
  preferredColour,
} from "@/lib/quadrant/memberColours";

// R67 (design 17.7): each friend on a spoke map gets a colour of their own,
// usually the same one from film to film; the viewer gets none (they are
// always the theme's yellow).

const VIEWER = "viewer-id";

/** Ids whose preferred colours are known, worked out by preferredColour. */
function idsPreferring(colour: number, howMany: number): string[] {
  const found: string[] = [];
  for (let i = 0; found.length < howMany; i++) {
    const id = `member-${i}`;
    if (preferredColour(id) === colour) found.push(id);
  }
  return found;
}

describe("preferredColour", () => {
  it("is a colour number from 1 to 7", () => {
    expect(FRIEND_COLOUR_COUNT).toBe(7);
    for (let i = 0; i < 200; i++) {
      const colour = preferredColour(`id-${i}`);
      expect(colour).toBeGreaterThanOrEqual(1);
      expect(colour).toBeLessThanOrEqual(7);
      expect(Number.isInteger(colour)).toBe(true);
    }
  });

  it("is the same every time for the same member", () => {
    const id = "6a1f0c2e-9b7d-4e3a-8f21-0d5c4b3a2e1f";
    expect(preferredColour(id)).toBe(preferredColour(id));
  });

  it("spreads members across all seven colours", () => {
    const seen = new Set(
      Array.from({ length: 100 }, (_, i) => preferredColour(`member-${i}`)),
    );
    expect(seen.size).toBe(7);
  });
});

describe("memberColours", () => {
  it("gives each friend their preferred colour when it is free", () => {
    const [a] = idsPreferring(2, 1);
    const [b] = idsPreferring(5, 1);
    const colours = memberColours(VIEWER, [a, b]);
    expect(colours.get(a)).toBe(2);
    expect(colours.get(b)).toBe(5);
  });

  // So a member is usually the same colour on every film.
  it("gives a member the same colour on different films", () => {
    const [a] = idsPreferring(3, 1);
    const others = idsPreferring(6, 2);
    expect(memberColours(VIEWER, [a]).get(a)).toBe(3);
    expect(memberColours(VIEWER, [a, ...others]).get(a)).toBe(3);
  });

  it("moves a friend whose colour is taken to the next free one", () => {
    const [first, second] = idsPreferring(4, 2).sort();
    const colours = memberColours(VIEWER, [first, second]);
    // In id order, the first keeps 4; the second moves on to 5.
    expect(colours.get(first)).toBe(4);
    expect(colours.get(second)).toBe(5);
  });

  it("goes round from 7 back to 1 when looking for a free colour", () => {
    const [first, second] = idsPreferring(7, 2).sort();
    const colours = memberColours(VIEWER, [first, second]);
    expect(colours.get(second)).toBe(1);
  });

  it("never gives two friends one colour while colours are left", () => {
    const friends = idsPreferring(1, 7);
    const colours = memberColours(VIEWER, friends);
    expect(new Set(colours.values()).size).toBe(7);
  });

  // The database may return ratings in any order.
  it("does not depend on the order the friends come in", () => {
    const friends = [...idsPreferring(2, 3), ...idsPreferring(6, 2)];
    const forwards = memberColours(VIEWER, friends);
    const backwards = memberColours(VIEWER, [...friends].reverse());
    for (const id of friends) {
      expect(backwards.get(id)).toBe(forwards.get(id));
    }
  });

  // E38: an eighth friend shares a colour; names still tell them apart.
  it("repeats colours after seven, from the friend's preferred one", () => {
    const friends = idsPreferring(3, 8);
    const colours = memberColours(VIEWER, friends);
    expect(colours.size).toBe(8);
    const last = [...friends].sort()[7];
    expect(colours.get(last)).toBe(3);
  });

  it("never gives the viewer a friend colour", () => {
    const [friend] = idsPreferring(1, 1);
    const colours = memberColours(VIEWER, [friend, VIEWER]);
    expect(colours.has(VIEWER)).toBe(false);
    expect(colours.get(friend)).toBe(1);
  });

  it("gives nothing when there are no friends", () => {
    expect(memberColours(VIEWER, []).size).toBe(0);
  });

  it("counts a friend listed twice once", () => {
    const [friend] = idsPreferring(2, 1);
    const colours = memberColours(VIEWER, [friend, friend]);
    expect([...colours.entries()]).toEqual([[friend, 2]]);
  });
});
