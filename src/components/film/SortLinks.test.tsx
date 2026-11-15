// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SortLinks } from "@/components/film/SortLinks";

afterEach(cleanup);

const link = (name: RegExp) => screen.getByRole("link", { name });

describe("SortLinks (R44)", () => {
  it("offers both orders", () => {
    render(<SortLinks active="recent" filter={null} />);

    expect(link(/Most recent/).getAttribute("href")).toBe("/friends");
    expect(link(/Biggest disagreement/).getAttribute("href")).toBe(
      "/friends?sort=disagreement",
    );
  });

  // Marked for screen readers too, not by its filled-in look alone (NFR14).
  it("marks the order in use", () => {
    render(<SortLinks active="disagreement" filter={null} />);

    expect(link(/Biggest disagreement/).getAttribute("aria-current")).toBe(
      "true",
    );
    expect(link(/Most recent/).getAttribute("aria-current")).toBeNull();
  });

  it("keeps the chosen filter when the order changes", () => {
    render(<SortLinks active="recent" filter="masterpieces" />);

    expect(link(/Most recent/).getAttribute("href")).toBe(
      "/friends?filter=masterpieces",
    );
    expect(link(/Biggest disagreement/).getAttribute("href")).toBe(
      "/friends?sort=disagreement&filter=masterpieces",
    );
  });

  it("is a named group of links", () => {
    render(<SortLinks active="recent" filter={null} />);

    expect(screen.getByRole("navigation", { name: "Order" })).toBeTruthy();
  });
});
