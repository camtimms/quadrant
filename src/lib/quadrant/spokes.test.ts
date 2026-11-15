import { describe, expect, it } from "vitest";
import { spokesFrom } from "@/lib/quadrant/spokes";

/** A friend's rating: a name and a point. */
function friend(name: string, quality: number, enjoyment: number) {
  return { name, point: { quality, enjoyment } };
}

const HUB = { quality: 5, enjoyment: 5 };

describe("spokesFrom (R39, R41)", () => {
  it("gives one spoke per friend, in the order given", () => {
    const spokes = spokesFrom(HUB, [
      friend("Zoe", 9, 9),
      friend("Al", 1, 1),
      friend("Bob", 5, 6),
    ]);

    expect(spokes.map((spoke) => spoke.item.name)).toEqual([
      "Zoe",
      "Al",
      "Bob",
    ]);
  });

  it("measures each spoke as the straight-line distance from the hub", () => {
    const spokes = spokesFrom(HUB, [
      friend("Bob", 2, 9), // 3 across, 4 up: a 3-4-5 triangle
      friend("Zoe", 6, 5),
    ]);

    expect(spokes[0].disagreement).toBe(5);
    expect(spokes[1].disagreement).toBe(1);
  });

  it("marks the friend furthest from the hub as the largest", () => {
    const spokes = spokesFrom(HUB, [
      friend("Bob", 2, 9),
      friend("Zoe", 6, 5),
      friend("Al", 5, 7),
    ]);

    expect(spokes.map((spoke) => spoke.isLargest)).toEqual([
      true,
      false,
      false,
    ]);
  });

  // Two friends equally far away are both the biggest disagreement: picking
  // one of them would be arbitrary.
  it("marks every friend tied for furthest", () => {
    const spokes = spokesFrom(HUB, [
      friend("Bob", 2, 9),
      friend("Zoe", 8, 1), // the mirror image: also 5 away
      friend("Al", 5, 6),
    ]);

    expect(spokes.map((spoke) => spoke.isLargest)).toEqual([true, true, false]);
  });

  it("marks an only friend as the largest when they differ at all", () => {
    expect(spokesFrom(HUB, [friend("Bob", 5, 6)])[0].isLargest).toBe(true);
  });

  // E13: a spoke of length 0. Agreeing exactly is not a disagreement, so
  // nobody is singled out for it.
  it("gives 0 for an identical rating and does not mark it", () => {
    const spokes = spokesFrom(HUB, [friend("Bob", 5, 5), friend("Zoe", 5, 5)]);

    expect(spokes.map((spoke) => spoke.disagreement)).toEqual([0, 0]);
    expect(spokes.map((spoke) => spoke.isLargest)).toEqual([false, false]);
  });

  it("gives no spokes when there are no friends", () => {
    expect(spokesFrom(HUB, [])).toEqual([]);
  });

  it("hands each item back untouched", () => {
    const bob = friend("Bob", 2, 9);
    expect(spokesFrom(HUB, [bob])[0].item).toBe(bob);
  });
});
