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
    expect(clusterPoints([], 1)).toEqual([]);
  });

  it("gives a lone point a cluster of its own, at its own position", () => {
    const clusters = clusterPoints([film("Alien", 9, 8)], 1);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].point).toEqual({ quality: 9, enjoyment: 8 });
    expect(titles(clusters[0].items)).toEqual(["Alien"]);
  });

  // R31: films with the same scores must become ONE marker carrying all of
  // them, never dots hidden behind each other.
  it("puts films with identical scores in one cluster", () => {
    const clusters = clusterPoints(
      [film("A", 7, 7), film("B", 7, 7), film("C", 7, 7)],
      1,
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].point).toEqual({ quality: 7, enjoyment: 7 });
    expect(titles(clusters[0].items)).toEqual(["A", "B", "C"]);
  });

  // On a member's own chart (cell size 1) neighbouring whole numbers are far
  // enough apart to draw separately.
  it("keeps neighbouring whole-number scores apart at cell size 1", () => {
    const clusters = clusterPoints(
      [film("A", 7, 7), film("B", 8, 7), film("C", 7, 8)],
      1,
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
    const clusters = clusterPoints(items, 1);
    expect(clusters).toHaveLength(121);
    expect(clusters.every((cluster) => cluster.items.length === 2)).toBe(true);

    const seen = clusters.flatMap((cluster) => titles(cluster.items)).sort();
    expect(seen).toEqual(titles(items).sort());
  });

  // On the group-average chart positions have one decimal, so dots can sit
  // almost on top of each other. A cell size of 0.5 merges those.
  it("merges averages that are nearly on top of each other at cell size 0.5", () => {
    const clusters = clusterPoints(
      [film("A", 6.1, 7.0), film("B", 6.2, 7.1)],
      0.5,
    );
    expect(clusters).toHaveLength(1);
    expect(titles(clusters[0].items)).toEqual(["A", "B"]);
  });

  it("keeps averages half a point apart separate at cell size 0.5", () => {
    const clusters = clusterPoints(
      [film("A", 6.0, 7.0), film("B", 6.5, 7.0), film("C", 6.0, 7.5)],
      0.5,
    );
    expect(clusters).toHaveLength(3);
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
      1,
    );
    expect(clusters.map((cluster) => titles(cluster.items))).toEqual([
      ["A", "C"],
      ["B", "D"],
    ]);
  });

  it("keeps the extra data each item carries", () => {
    const original = { ...film("Heat", 8, 9), year: 1995 };
    const clusters = clusterPoints([original], 1);
    expect(clusters[0].items[0]).toBe(original);
  });

  it("does not change the list it is given", () => {
    const items = [film("A", 1, 2), film("B", 1, 2)];
    const copy = structuredClone(items);
    clusterPoints(items, 1);
    expect(items).toEqual(copy);
  });

  it("rejects a cell size that is not positive", () => {
    expect(() => clusterPoints([film("A", 1, 1)], 0)).toThrow();
    expect(() => clusterPoints([film("A", 1, 1)], -1)).toThrow();
  });
});
