import { describe, expect, it } from "vitest";
import {
  chartName,
  labelSize,
  placeLabels,
  REFERENCE_SIZE,
  type LabelRequest,
  type Marker,
  type PlacedLabel,
} from "@/components/chart/labelPlacement";
import { CHART_SIZE, chartX, chartY } from "@/components/chart/scale";

// R66 (design 17.6): every name on the spoke map has a place of its own,
// clear of the other names and of every point. Positions here are pixels on
// the narrowest chart (REFERENCE_SIZE across); see labelPlacement.ts.

const toPx = (units: number) => (units / CHART_SIZE) * REFERENCE_SIZE;
/** A member's point at these scores, as a marker 16 px across. */
const at = (quality: number, enjoyment: number): Marker => ({
  x: toPx(chartX(quality)),
  y: toPx(chartY(enjoyment)),
  radius: 8,
});

/** One label for each point, named "Name1", "Name2" and so on. */
function labelsFor(markers: Marker[], names?: string[]): LabelRequest[] {
  return markers.map((marker, i) => ({
    id: `m${i}`,
    text: names?.[i] ?? `Name${i + 1}`,
    point: marker,
  }));
}

type Box = { left: number; top: number; right: number; bottom: number };
const boxOf = (label: PlacedLabel): Box => ({
  left: label.x,
  top: label.y,
  right: label.x + label.width,
  bottom: label.y + label.height,
});
const overlap = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
/** Does a box touch a round marker? */
function touches(box: Box, marker: Marker): boolean {
  const nearestX = Math.max(box.left, Math.min(marker.x, box.right));
  const nearestY = Math.max(box.top, Math.min(marker.y, box.bottom));
  return Math.hypot(marker.x - nearestX, marker.y - nearestY) < marker.radius;
}

/** Every rule R66 asks for, on one finished map. */
function expectClear(placed: PlacedLabel[], markers: Marker[]) {
  const boxes = placed.map(boxOf);
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    // Inside the chart.
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(REFERENCE_SIZE);
    expect(box.bottom).toBeLessThanOrEqual(REFERENCE_SIZE);
    // Clear of every other label...
    for (let j = i + 1; j < boxes.length; j++) {
      expect(overlap(box, boxes[j]), `${placed[i].id} / ${placed[j].id}`).toBe(
        false,
      );
    }
    // ...and of every point, its own included.
    for (const marker of markers) {
      expect(touches(box, marker), `${placed[i].id} on a point`).toBe(false);
    }
    expect(placed[i].overlaps).toBe(false);
  }
}

/** Distinct whole-number scores, the same every run (a fixed seed). */
function scatter(count: number, seed: number): Marker[] {
  let state = seed;
  const next = () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state;
  };
  const used = new Set<string>();
  const markers: Marker[] = [];
  while (markers.length < count) {
    const q = next() % 11;
    const e = next() % 11;
    if (used.has(`${q},${e}`)) continue;
    used.add(`${q},${e}`);
    markers.push(at(q, e));
  }
  return markers;
}

describe("chartName", () => {
  it("leaves a short name alone", () => {
    expect(chartName("Sam")).toBe("Sam");
  });

  // The table under the chart has the full name.
  it("cuts a long name to 16 characters, ending in an ellipsis", () => {
    const cut = chartName("Bartholomew Fitzwilliam");
    expect(cut).toHaveLength(16);
    expect(cut.endsWith("…")).toBe(true);
    expect(chartName("Exactly16Letters")).toBe("Exactly16Letters");
  });
});

describe("labelSize", () => {
  it("is wider for longer text, and the same height", () => {
    const short = labelSize("Jo");
    const long = labelSize("Jonathan");
    expect(long.width).toBeGreaterThan(short.width);
    expect(long.height).toBe(short.height);
  });

  // Over-estimating is the safe side: a real label narrower than its
  // estimate only leaves a bigger gap.
  it("allows at least 7 px a character at 12 px type", () => {
    expect(labelSize("WWWWWWWWWW").width).toBeGreaterThanOrEqual(70);
  });
});

describe("placeLabels", () => {
  it("puts a lone label to the right of its point", () => {
    const point = at(3, 5);
    const [label] = placeLabels(labelsFor([point]));
    expect(label.x).toBeGreaterThan(point.x + point.radius);
    expect(label.y + label.height / 2).toBeCloseTo(point.y, 0);
    expect(label.leader).toBeNull();
  });

  it("puts a label on the left when there is no room on the right", () => {
    const point = at(10, 5);
    const [label] = placeLabels(labelsFor([point], ["Somebody"]));
    expect(label.x + label.width).toBeLessThan(point.x);
    expectClear([label], [point]);
  });

  it("keeps the order it is given: the first label gets first choice", () => {
    // Two points 10 px apart, one above the other: both would like the
    // place to their right, and those two places overlap. Whichever comes
    // first gets it.
    const a: Marker = { x: 100, y: 100, radius: 8 };
    const b: Marker = { x: 100, y: 110, radius: 8 };
    for (const [firstPoint, secondPoint] of [
      [a, b],
      [b, a],
    ]) {
      const [first, second] = placeLabels(
        labelsFor([firstPoint, secondPoint]),
        [a, b],
      );
      expect(first.x).toBeGreaterThan(firstPoint.x);
      expect(first.y + first.height / 2).toBeCloseTo(firstPoint.y, 0);
      // The second has to settle for its next choice: not the right.
      expect(second.x).toBeLessThan(secondPoint.x);
    }
  });

  it.each([
    ["2 members", scatter(2, 1)],
    ["5 members", scatter(5, 2)],
    ["10 members", scatter(10, 3)],
    ["20 members", scatter(20, 4)],
    [
      "5 members packed together",
      [at(4, 4), at(5, 4), at(4, 5), at(5, 5), at(6, 5)],
    ],
    [
      "10 members along the top edge",
      Array.from({ length: 10 }, (_, q) => at(q, 10)),
    ],
    [
      "10 members down one side",
      Array.from({ length: 10 }, (_, e) => at(0, e)),
    ],
  ])("leaves every name clear on a map of %s", (_, markers) => {
    const placed = placeLabels(labelsFor(markers), markers);
    expect(placed).toHaveLength(markers.length);
    expectClear(placed, markers);
  });

  it("keeps clear of points that have no label of their own", () => {
    const labelled = at(3, 5);
    // The group average's diamond, say, just to the right.
    const unlabelled: Marker = { ...at(4, 5), radius: 10 };
    const placed = placeLabels(labelsFor([labelled]), [labelled, unlabelled]);
    expectClear(placed, [labelled, unlabelled]);
  });

  it("joins a label to its point with a line only when moved further out", () => {
    // Nine neighbours in a 3 x 3 block: not every name fits right beside
    // its point.
    const markers = [4, 5, 6].flatMap((q) => [4, 5, 6].map((e) => at(q, e)));
    const placed = placeLabels(labelsFor(markers), markers);
    expectClear(placed, markers);

    for (const label of placed) {
      const point = markers[Number(label.id.slice(1))];
      // How far the label's nearest edge is from the point's centre.
      const nearestX = Math.max(
        label.x,
        Math.min(point.x, label.x + label.width),
      );
      const nearestY = Math.max(
        label.y,
        Math.min(point.y, label.y + label.height),
      );
      const distance = Math.hypot(point.x - nearestX, point.y - nearestY);
      // The normal place is the marker's radius plus a 4 px gap away.
      const normal = point.radius + 4;
      if (label.leader) {
        expect(distance).toBeGreaterThan(normal + 1);
        expect([label.leader.x1, label.leader.y1]).toEqual([point.x, point.y]);
        expect([label.leader.x2, label.leader.y2]).toEqual([
          nearestX,
          nearestY,
        ]);
      } else {
        expect(distance).toBeLessThanOrEqual(normal + 1);
      }
    }
    expect(placed.some((label) => label.leader !== null)).toBe(true);
  });

  // E39: more names than room. Each still gets the least crowded place,
  // inside the chart, and says it overlaps so the caller knows.
  it("uses the least crowded place when nothing is free", () => {
    const crowd = Array.from({ length: 40 }, (_, i) =>
      at(i % 11, Math.floor(i / 11) + 4),
    );
    const placed = placeLabels(
      labelsFor(
        crowd,
        crowd.map(() => "A long-ish name"),
      ),
      crowd,
    );
    expect(placed).toHaveLength(40);
    expect(placed.some((label) => label.overlaps)).toBe(true);
    for (const label of placed) {
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.y).toBeGreaterThanOrEqual(0);
      expect(label.x + label.width).toBeLessThanOrEqual(REFERENCE_SIZE);
      expect(label.y + label.height).toBeLessThanOrEqual(REFERENCE_SIZE);
    }
  });

  it("gives positions as percentages of the chart for drawing", () => {
    const [label] = placeLabels(labelsFor([at(3, 5)]));
    expect(label.left).toBe(`${(label.x / REFERENCE_SIZE) * 100}%`);
    expect(label.top).toBe(`${(label.y / REFERENCE_SIZE) * 100}%`);
  });
});
