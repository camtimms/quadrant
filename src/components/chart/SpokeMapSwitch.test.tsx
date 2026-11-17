// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { chartX, chartY } from "@/components/chart/scale";
import { SpokeMapSwitch } from "@/components/chart/SpokeMapSwitch";
import type { MemberRating } from "@/components/film/RatingCards";

afterEach(cleanup);

function rating(
  displayName: string,
  quality: number,
  enjoyment: number,
  isViewer = false,
): MemberRating {
  return {
    userId: `id-${displayName}`,
    displayName,
    avatarUrl: null,
    point: { quality, enjoyment },
    review: null,
    isViewer,
  };
}

// Cam 5/5, Bob 1/9, Zoe 9/7: the average is 5/7.
const RATED = [
  rating("Cam", 5, 5, true),
  rating("Bob", 1, 9),
  rating("Zoe", 9, 7),
];
const button = (name: string) => screen.getByRole("button", { name });
const firstSpokeStart = () => {
  const line = document.querySelector("[data-spoke]")!;
  return [Number(line.getAttribute("x1")), Number(line.getAttribute("y1"))];
};

describe("SpokeMapSwitch (R97)", () => {
  it("starts on the group average", () => {
    render(<SpokeMapSwitch ratings={RATED} />);
    expect(button("From the average").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(button("From me").getAttribute("aria-pressed")).toBe("false");
    expect(firstSpokeStart()).toEqual([chartX(5), chartY(7)]);
  });

  it("redraws the spokes from the viewer when 'From me' is pressed", () => {
    render(<SpokeMapSwitch ratings={RATED} />);
    fireEvent.click(button("From me"));
    expect(button("From me").getAttribute("aria-pressed")).toBe("true");
    expect(firstSpokeStart()).toEqual([chartX(5), chartY(5)]);

    fireEvent.click(button("From the average"));
    expect(firstSpokeStart()).toEqual([chartX(5), chartY(7)]);
  });

  it("offers no switch before the viewer has rated", () => {
    render(
      <SpokeMapSwitch ratings={[rating("Bob", 1, 9), rating("Zoe", 9, 7)]} />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelectorAll("[data-spoke]")).toHaveLength(2);
  });

  it("offers no switch when only the viewer has rated", () => {
    render(<SpokeMapSwitch ratings={[rating("Cam", 5, 5, true)]} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

// R99, R100: the table follows the switch, and the group's numbers sit
// between the map and the table.
describe("SpokeMapSwitch: the table and the numbers (R99, R100)", () => {
  it("shows what it is given between the map and the table", () => {
    render(<SpokeMapSwitch ratings={RATED} between={<p>group numbers</p>} />);
    const text = document.body.textContent!;
    const map = text.indexOf("Each line runs");
    const numbers = text.indexOf("group numbers");
    const table = text.indexOf("How far each member");
    expect(map).toBeGreaterThan(-1);
    expect(numbers).toBeGreaterThan(map);
    expect(table).toBeGreaterThan(numbers);
  });

  it("switches the table with the map", () => {
    render(<SpokeMapSwitch ratings={RATED} />);
    expect(
      screen.getByRole("table", { name: /from the group average/ }),
    ).toBeTruthy();
    fireEvent.click(button("From me"));
    expect(
      screen.getByRole("table", { name: /How far each friend is from you/ }),
    ).toBeTruthy();
  });
});
