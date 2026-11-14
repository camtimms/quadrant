// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GroupAverage } from "@/components/film/GroupAverage";
import { PLACEMENT_LABELS } from "@/lib/quadrant";

afterEach(cleanup);

/** The value shown beside a label such as "Quality". */
function valueOf(label: string): string | null {
  // In a <dl>, each <dt> (the label) is followed by its <dd> (the value).
  return screen.getByText(label).nextElementSibling?.textContent ?? null;
}

describe("GroupAverage (R42)", () => {
  it("states both averages, the number of members and the placement", () => {
    render(
      <GroupAverage
        points={[
          { quality: 9, enjoyment: 8 },
          { quality: 8, enjoyment: 10 },
          { quality: 10, enjoyment: 9 },
        ]}
      />,
    );

    expect(valueOf("Quality")).toBe("9");
    expect(valueOf("Enjoyment")).toBe("9");
    expect(valueOf("Rated by")).toBe("3 members");
    expect(valueOf("Placement")).toBe(PLACEMENT_LABELS.masterpieces);
  });

  it("shows an average to one decimal place", () => {
    render(
      <GroupAverage
        points={[
          { quality: 7, enjoyment: 2 },
          { quality: 8, enjoyment: 2 },
          { quality: 8, enjoyment: 3 },
        ]}
      />,
    );

    // 23 / 3 = 7.666..., 7 / 3 = 2.333...
    expect(valueOf("Quality")).toBe("7.7");
    expect(valueOf("Enjoyment")).toBe("2.3");
  });

  // R27: the label goes with the number on screen. A true mean of 7.47
  // shows as 7.5, and 7.5 is a corner score.
  it("places the film by the rounded average, not the exact one", () => {
    const points = [
      ...Array.from({ length: 8 }, () => ({ quality: 7, enjoyment: 7 })),
      ...Array.from({ length: 7 }, () => ({ quality: 8, enjoyment: 8 })),
    ];
    render(<GroupAverage points={points} />);

    expect(valueOf("Quality")).toBe("7.5");
    expect(valueOf("Placement")).toBe(PLACEMENT_LABELS.masterpieces);
  });

  it("states the largest disagreement between any two members", () => {
    render(
      <GroupAverage
        points={[
          { quality: 0, enjoyment: 0 },
          { quality: 3, enjoyment: 4 },
          { quality: 1, enjoyment: 1 },
        ]}
      />,
    );

    // 0/0 to 3/4 is a 3-4-5 triangle.
    expect(valueOf("Biggest disagreement")).toBe("5");
  });

  it("shows a disagreement of 0 when everyone gave the same scores", () => {
    render(
      <GroupAverage
        points={[
          { quality: 6, enjoyment: 6 },
          { quality: 6, enjoyment: 6 },
        ]}
      />,
    );

    expect(valueOf("Biggest disagreement")).toBe("0");
  });

  describe("a film only one member has rated (R45, E11)", () => {
    it("shows that rating as the average", () => {
      render(<GroupAverage points={[{ quality: 0, enjoyment: 10 }]} />);

      expect(valueOf("Quality")).toBe("0");
      expect(valueOf("Enjoyment")).toBe("10");
      expect(valueOf("Rated by")).toBe("1 member");
      expect(valueOf("Placement")).toBe(PLACEMENT_LABELS["guilty-pleasures"]);
    });

    it("shows a dash for disagreement, never 0", () => {
      render(<GroupAverage points={[{ quality: 0, enjoyment: 10 }]} />);

      const value = valueOf("Biggest disagreement");
      expect(value).toContain("—");
      expect(value).not.toContain("0");
    });
  });

  it("shows nothing at all for a film nobody has rated", () => {
    const { container } = render(<GroupAverage points={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
