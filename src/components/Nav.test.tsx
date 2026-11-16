// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Nav } from "@/components/Nav";

// Which page the browser is on, as Next.js's hook would report it.
const location = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => location.pathname,
}));

afterEach(() => {
  cleanup();
  location.pathname = "/";
});

const link = (name: string) => screen.getByRole("link", { name });

describe("Nav (T31, R48)", () => {
  it("is a labelled navigation landmark with the three main pages", () => {
    render(<Nav />);

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toBeTruthy();
    expect(link("My films").getAttribute("href")).toBe("/");
    expect(link("Friends' films").getAttribute("href")).toBe("/friends");
    expect(link("Search").getAttribute("href")).toBe("/search");
  });

  // aria-current tells a screen reader "you are here"; the bold underline
  // shows it without relying on colour (NFR14).
  it("marks the page the member is on", () => {
    location.pathname = "/friends";
    render(<Nav />);

    expect(link("Friends' films").getAttribute("aria-current")).toBe("page");
    expect(link("Friends' films").className).toContain("underline");
    expect(link("My films").getAttribute("aria-current")).toBeNull();
    expect(link("Search").getAttribute("aria-current")).toBeNull();
  });

  it("marks nothing on a film's page", () => {
    location.pathname = "/film/10999";
    render(<Nav />);

    expect(document.querySelector("[aria-current]")).toBeNull();
  });
});
