// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { chartX, chartY, toPercent } from "@/components/chart/scale";
import { SpokeMap } from "@/components/chart/SpokeMap";
import type { MemberRating } from "@/components/film/RatingCards";

afterEach(cleanup);

function rating(
  displayName: string,
  quality: number,
  enjoyment: number,
  extra: Partial<MemberRating> = {},
): MemberRating {
  return {
    userId: `id-${displayName}`,
    displayName,
    avatarUrl: null,
    point: { quality, enjoyment },
    review: null,
    isViewer: false,
    ...extra,
  };
}

/** The viewer's own rating, at the centre of the chart. */
const me = rating("Cam", 5, 5, { isViewer: true });

// The markers and lines carry data- attributes so the tests can find them
// without depending on how they are styled.
const all = (container: HTMLElement, selector: string) =>
  Array.from(container.querySelectorAll<HTMLElement>(selector));

const spokesIn = (container: HTMLElement) => all(container, "[data-spoke]");
const pointsIn = (container: HTMLElement, kind: string) =>
  all(container, `[data-point="${kind}"]`);

/** Where a marker has been put, as the CSS left and top it was given. */
const positionOf = (element: HTMLElement) => ({
  left: element.style.left,
  top: element.style.top,
});
const at = (quality: number, enjoyment: number) => ({
  left: toPercent(chartX(quality)),
  top: toPercent(chartY(enjoyment)),
});

describe("SpokeMap", () => {
  describe("points (R38)", () => {
    it("draws one labelled point per member at their scores", () => {
      const { container } = render(
        <SpokeMap ratings={[me, rating("Bob", 2, 9), rating("Zoe", 9, 8)]} />,
      );

      const hub = pointsIn(container, "viewer");
      const friends = pointsIn(container, "friend");
      expect(hub).toHaveLength(1);
      expect(friends).toHaveLength(2);

      expect(positionOf(hub[0])).toEqual(at(5, 5));
      expect(positionOf(friends[0])).toEqual(at(2, 9));
      expect(positionOf(friends[1])).toEqual(at(9, 8));

      // Every point is named on the chart itself.
      const names = all(container, "[data-point-label]").map(
        (label) => label.textContent,
      );
      expect(names).toEqual(["You", "Bob", "Zoe"]);
    });

    it("draws the frame of the quadrant chart underneath", () => {
      const { container } = render(<SpokeMap ratings={[me]} />);

      expect(container.querySelector('[data-divider="quality"]')).toBeTruthy();
      expect(
        container.querySelector('[data-corner="masterpieces"]'),
      ).toBeTruthy();
    });

    it("draws nothing at all for a film nobody has rated", () => {
      const { container } = render(<SpokeMap ratings={[]} />);

      expect(container.textContent).toBe("");
      expect(container.querySelector("svg")).toBeNull();
    });
  });

  describe("group average (R38, NFR14)", () => {
    it("draws the group average at the mean of the ratings", () => {
      const { container } = render(
        <SpokeMap ratings={[me, rating("Bob", 2, 9), rating("Zoe", 9, 8)]} />,
      );

      const average = pointsIn(container, "average");
      expect(average).toHaveLength(1);
      // (5 + 2 + 9) / 3 = 5.33 → 5.3, and (5 + 9 + 8) / 3 = 7.33 → 7.3.
      expect(positionOf(average[0])).toEqual(at(5.3, 7.3));
    });

    // Told apart by shape, not by colour: members are round, the average is
    // a square turned on its corner.
    it("draws the average as a different shape from the members", () => {
      const { container } = render(
        <SpokeMap ratings={[me, rating("Bob", 2, 9)]} />,
      );

      const [average] = pointsIn(container, "average");
      const members = [
        ...pointsIn(container, "viewer"),
        ...pointsIn(container, "friend"),
      ];

      expect(average.dataset.shape).toBe("diamond");
      expect(average.className).toContain("rotate-45");
      expect(average.className).not.toContain("rounded-full");
      for (const member of members) {
        expect(member.dataset.shape).toBe("circle");
        expect(member.className).toContain("rounded-full");
        expect(member.className).not.toContain("rotate-45");
      }
    });

    it("tells the viewer's point from a friend's by more than colour", () => {
      const { container } = render(
        <SpokeMap ratings={[me, rating("Bob", 2, 9)]} />,
      );

      // The hub is solid yellow and ringed; a friend is an outline.
      const [hub] = pointsIn(container, "viewer");
      const [friend] = pointsIn(container, "friend");
      expect(hub.className).toContain("bg-accent");
      expect(hub.className).toContain("ring-2");
      expect(friend.className).toContain("border-2");
      expect(friend.className).toContain("bg-card");
      expect(friend.className).not.toContain("ring-2");
    });

    it("draws only in the theme's colours", () => {
      const { container } = render(
        <SpokeMap ratings={[me, rating("Bob", 2, 9), rating("Cy", 4, 4)]} />,
      );
      expect(container.innerHTML).not.toMatch(/foreground|background/);
    });

    it("explains the shapes in words under the chart", () => {
      render(<SpokeMap ratings={[me, rating("Bob", 2, 9)]} />);

      const key = screen.getByTestId("spoke-map-key").textContent;
      expect(key).toContain("You");
      expect(key).toContain("A friend");
      expect(key).toContain("Group average");
    });

    // E11: one rating is its own average, so a second marker on the same
    // spot would only hide the first.
    it("shows a single rating as one point, with no average marker", () => {
      const { container } = render(
        <SpokeMap ratings={[rating("Bob", 2, 9)]} />,
      );

      expect(pointsIn(container, "friend")).toHaveLength(1);
      expect(pointsIn(container, "average")).toHaveLength(0);
      expect(screen.getByTestId("spoke-map-key").textContent).not.toContain(
        "Group average",
      );
    });
  });

  describe("spokes (R39)", () => {
    it("draws one spoke per friend, from the viewer's point to theirs", () => {
      const { container } = render(
        <SpokeMap ratings={[me, rating("Bob", 2, 9), rating("Zoe", 9, 8)]} />,
      );

      const ends = spokesIn(container).map((line) => ({
        x1: Number(line.getAttribute("x1")),
        y1: Number(line.getAttribute("y1")),
        x2: Number(line.getAttribute("x2")),
        y2: Number(line.getAttribute("y2")),
      }));
      const from = { x1: chartX(5), y1: chartY(5) };
      expect(ends).toEqual([
        { ...from, x2: chartX(2), y2: chartY(9) },
        { ...from, x2: chartX(9), y2: chartY(8) },
      ]);
    });

    it("draws no spoke to the group average", () => {
      const { container } = render(
        <SpokeMap ratings={[me, rating("Bob", 2, 9)]} />,
      );

      expect(spokesIn(container)).toHaveLength(1);
    });

    it("marks the longest spoke", () => {
      const { container } = render(
        <SpokeMap ratings={[me, rating("Bob", 2, 9), rating("Zoe", 6, 5)]} />,
      );

      expect(spokesIn(container).map((line) => line.dataset.spoke)).toEqual([
        "largest",
        "other",
      ]);
    });

    it("draws no spokes when only the viewer has rated the film", () => {
      const { container } = render(<SpokeMap ratings={[me]} />);

      expect(spokesIn(container)).toHaveLength(0);
      expect(pointsIn(container, "viewer")).toHaveLength(1);
    });
  });

  describe("when the viewer has not rated the film (R40, E12)", () => {
    const friendsOnly = [rating("Bob", 2, 9), rating("Zoe", 9, 8)];

    it("shows the points and the average with no spokes and no hub", () => {
      const { container } = render(<SpokeMap ratings={friendsOnly} />);

      expect(pointsIn(container, "friend")).toHaveLength(2);
      expect(pointsIn(container, "average")).toHaveLength(1);
      expect(pointsIn(container, "viewer")).toHaveLength(0);
      expect(spokesIn(container)).toHaveLength(0);
    });

    it("prompts the viewer to rate it", () => {
      render(<SpokeMap ratings={friendsOnly} />);

      expect(screen.getByText(/Rate this film to see/)).toBeTruthy();
      // No hub on the chart, so no hub in the key either.
      expect(screen.getByTestId("spoke-map-key").textContent).not.toContain(
        "You",
      );
    });

    it("does not prompt a viewer who has rated it", () => {
      render(<SpokeMap ratings={[me, ...friendsOnly]} />);

      expect(screen.queryByText(/Rate this film to see/)).toBeNull();
    });
  });

  describe("ratings at the same spot (R31, E13)", () => {
    it("shares one marker with a count and names everyone on it", () => {
      const { container } = render(
        <SpokeMap
          ratings={[
            me,
            rating("Bob", 2, 9),
            rating("Zoe", 2, 9),
            rating("Al", 7, 7),
          ]}
        />,
      );

      const friends = pointsIn(container, "friend");
      expect(friends).toHaveLength(2);
      expect(friends[0].textContent).toBe("2");
      expect(friends[1].textContent).toBe("");

      const names = all(container, "[data-point-label]").map(
        (label) => label.textContent,
      );
      expect(names).toEqual(["You", "Bob, Zoe", "Al"]);

      // One spoke per place, not two lines drawn on top of each other.
      expect(spokesIn(container)).toHaveLength(2);
    });

    // E13: a spoke of length 0. The friend shares the hub.
    it("puts a friend who agrees exactly on the viewer's own point", () => {
      const { container } = render(
        <SpokeMap ratings={[me, rating("Bob", 5, 5), rating("Zoe", 9, 8)]} />,
      );

      const hub = pointsIn(container, "viewer");
      expect(hub).toHaveLength(1);
      expect(hub[0].textContent).toBe("2");
      expect(pointsIn(container, "friend")).toHaveLength(1);
      expect(
        all(container, "[data-point-label]").map((label) => label.textContent),
      ).toEqual(["You, Bob", "Zoe"]);
      // Only Zoe is somewhere else to draw a line to.
      expect(spokesIn(container)).toHaveLength(1);
    });
  });

  describe("for screen readers (NFR13)", () => {
    it("is one image with a description that points to the tables", () => {
      render(<SpokeMap ratings={[me, rating("Bob", 2, 9)]} />);

      const image = screen.getByRole("img");
      expect(image.getAttribute("aria-label")).toMatch(/2 members/);
      expect(image.getAttribute("aria-label")).toMatch(/table/);
    });
  });
});
