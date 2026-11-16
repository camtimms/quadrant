// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Nav } from "@/components/Nav";
import { pillCurrent } from "@/components/ui/styles";

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

  // aria-current tells a screen reader "you are here"; the filled pill
  // shows it, with bold text and (in light mode) a dark outline so it does
  // not rely on colour alone (NFR14, NFR24).
  it("marks the page the member is on", () => {
    location.pathname = "/friends";
    render(<Nav />);

    expect(link("Friends' films").getAttribute("aria-current")).toBe("page");
    expect(link("Friends' films").className).toContain(pillCurrent);
    expect(link("My films").className).not.toContain(pillCurrent);
    expect(link("My films").getAttribute("aria-current")).toBeNull();
    expect(link("Search").getAttribute("aria-current")).toBeNull();
  });

  it("marks nothing on a film's page", () => {
    location.pathname = "/film/10999";
    render(<Nav />);

    expect(document.querySelector("[aria-current]")).toBeNull();
  });
});
