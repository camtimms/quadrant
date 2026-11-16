// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EarlierViewings } from "./EarlierViewings";

afterEach(cleanup);

const VIEWINGS = [
  {
    watchedAt: "2026-05-02T10:00:00+00:00",
    point: { quality: 8, enjoyment: 6 },
    review: "Better than I remembered.",
  },
  {
    watchedAt: "2025-12-24T10:00:00+00:00",
    point: { quality: 9, enjoyment: 2 },
    review: null,
  },
];

describe("EarlierViewings (R85)", () => {
  it("lists each earlier viewing in the order given", () => {
    render(<EarlierViewings viewings={VIEWINGS} />);
    expect(
      screen.getByRole("heading", { name: "Earlier viewings" }),
    ).toBeTruthy();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("2 May 2026");
    expect(items[1].textContent).toContain("24 Dec 2025");
  });

  it("shows the date, both scores labelled, the placement and the review", () => {
    render(<EarlierViewings viewings={VIEWINGS} />);
    const first = within(screen.getAllByRole("listitem")[0]);
    expect(first.getByText(/Quality 8 · Enjoyment 6/)).toBeTruthy();
    expect(first.getByText("Better than I remembered.")).toBeTruthy();
    // 9 / 2: a well-made film that was no fun.
    const second = screen.getAllByRole("listitem")[1];
    expect(second.textContent).toMatch(/Quality 9 · Enjoyment 2/);
  });

  it("shows nothing at all when there are none", () => {
    const { container } = render(<EarlierViewings viewings={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
