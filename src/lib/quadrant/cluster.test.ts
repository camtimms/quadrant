import { describe, expect, it } from "vitest";
import { clusterPoints } from "@/lib/quadrant/cluster";
import type { Point } from "@/lib/quadrant/types";

/** A film on a chart: something with a position plus whatever else it carries. */
type Film = { title: string; point: Point };

const film = (title: string, quality: number, enjoyment: number): Film => ({
  title,
  point: { quality, enjoyment },
});

const titles = (items: Film[]) => items.map((item) => item.title);

describe("clusterPoints", () => {
  it("returns no clusters for no items", () => {
    expect(clusterPoints([], 0)).toEqual([]);
  });

  it("gives a lone point a cluster of its own, at its own position", () => {
    const clusters = clusterPoints([film("Alien", 9, 8)], 0);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].point).toEqual({ quality: 9, enjoyment: 8 });
    expect(titles(clusters[0].items)).toEqual(["Alien"]);
  });

  // R31: films with the same scores must become ONE marker carrying all of
  // them, never dots hidden behind each other.
  it("puts films with identical scores in one cluster", () => {
    const clusters = clusterPoints(
      [film("A", 7, 7), film("B", 7, 7), film("C", 7, 7)],
      0,
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].point).toEqual({ quality: 7, enjoyment: 7 });
    expect(titles(clusters[0].items)).toEqual(["A", "B", "C"]);
  });

  // On a member's own chart (merging only identical scores) neighbouring
  // whole numbers are far enough apart to draw separately.
  it("keeps neighbouring whole-number scores apart when only identical ones merge", () => {
    const clusters = clusterPoints(
      [film("A", 7, 7), film("B", 8, 7), film("C", 7, 8)],
      0,
    );
    expect(clusters).toHaveLength(3);
  });

  it("never loses or duplicates an item", () => {
    const items: Film[] = [];
    for (let quality = 0; quality <= 10; quality++) {
      for (let enjoyment = 0; enjoyment <= 10; enjoyment++) {
        items.push(film(`${quality}/${enjoyment}`, quality, enjoyment));
        items.push(film(`${quality}/${enjoyment} again`, quality, enjoyment));
      }
    }
    const clusters = clusterPoints(items, 0);
    expect(clusters).toHaveLength(121);
    expect(clusters.every((cluster) => cluster.items.length === 2)).toBe(true);

    const seen = clusters.flatMap((cluster) => titles(cluster.items)).sort();
    expect(seen).toEqual(titles(items).sort());
  });

  // On the group-average chart positions have one decimal, so dots can sit
  // almost on top of each other. Merging within 0.5 joins those.
  it("merges averages that are nearly on top of each other within 0.5", () => {
    const clusters = clusterPoints(
      [film("A", 6.1, 7.0), film("B", 6.2, 7.1)],
      0.5,
    );
    expect(clusters).toHaveLength(1);
    expect(titles(clusters[0].items)).toEqual(["A", "B"]);
  });

  // T29f: the owner's case. The old grid had a cell edge at 0.75, so these
  // two, 0.1 apart, were drawn as two dots on top of each other.
  it("merges two averages 0.1 apart wherever they are on the chart", () => {
    for (const [a, b] of [
      [0.7, 0.8],
      [0.2, 0.3],
      [4.7, 4.8],
      [9.9, 10],
    ]) {
      const clusters = clusterPoints(
        [film("The Room", b, 5.3), film("Sharknado", a, 5.3)],
        0.5,
      );
      expect(clusters).toHaveLength(1);
    }
  });

  // A dot is about 0.55 of a point wide on a phone: 0.5 apart they touch.
  it("merges averages exactly 0.5 apart, and keeps 0.6 apart separate", () => {
    expect(
      clusterPoints([film("A", 6.0, 7.0), film("B", 6.5, 7.0)], 0.5),
    ).toHaveLength(1);
    expect(
      clusterPoints([film("A", 6.0, 7.0), film("B", 6.3, 7.4)], 0.5),
    ).toHaveLength(1);
    expect(
      clusterPoints([film("A", 6.0, 7.0), film("B", 6.6, 7.0)], 0.5),
    ).toHaveLength(2);
    // Straight-line distance: 0.4 across and 0.4 up is about 0.57.
    expect(
      clusterPoints([film("A", 6.0, 7.0), film("B", 6.4, 7.4)], 0.5),
    ).toHaveLength(2);
  });

  // A row of films each 0.4 from the next must not chain into one marker
  // spreading over the chart: a film joins a group only when it is close to
  // every film already in it.
  it("does not chain a row of nearby averages into one wide marker", () => {
    const row = [0, 0.4, 0.8, 1.2, 1.6, 2.0].map((quality, index) =>
      film(`F${index}`, quality, 5),
    );
    const clusters = clusterPoints(row, 0.5);
    expect(clusters.map((cluster) => titles(cluster.items))).toEqual([
      ["F0", "F1"],
      ["F2", "F3"],
      ["F4", "F5"],
    ]);
  });

  // A merged marker is drawn at the middle of the films it stands for.
  it("places a cluster at the mean position of its items", () => {
    const clusters = clusterPoints(
      [film("A", 6.1, 7.0), film("B", 6.2, 7.1)],
      0.5,
    );
    expect(clusters[0].point.quality).toBeCloseTo(6.15, 10);
    expect(clusters[0].point.enjoyment).toBeCloseTo(7.05, 10);
  });

  // Predictable order makes the chart stable between page loads: clusters in
  // the order their first film appears, films in the order they were given.
  it("keeps clusters and their items in input order", () => {
    const clusters = clusterPoints(
      [film("A", 2, 2), film("B", 9, 9), film("C", 2, 2), film("D", 9, 9)],
      0,
    );
    expect(clusters.map((cluster) => titles(cluster.items))).toEqual([
      ["A", "C"],
      ["B", "D"],
    ]);
  });

  it("keeps the extra data each item carries", () => {
    const original = { ...film("Heat", 8, 9), year: 1995 };
    const clusters = clusterPoints([original], 0);
    expect(clusters[0].items[0]).toBe(original);
  });

  it("does not change the list it is given", () => {
    const items = [film("A", 1, 2), film("B", 1, 2)];
    const copy = structuredClone(items);
    clusterPoints(items, 0);
    expect(items).toEqual(copy);
  });

  it("rejects a negative or missing distance", () => {
    expect(() => clusterPoints([film("A", 1, 1)], -0.1)).toThrow();
    expect(() => clusterPoints([film("A", 1, 1)], Number.NaN)).toThrow();
  });
});
