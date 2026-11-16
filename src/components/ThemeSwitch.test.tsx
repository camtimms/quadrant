// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { THEME_STORAGE_KEY } from "@/lib/themeChoice";

// R68 (design 18): the header's light/dark switch.

/** Pretend the device is set to dark (true) or light (false). */
function deviceIsDark(dark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" ? dark : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const html = () => document.documentElement;
const button = () => screen.getByRole("button");

beforeEach(() => {
  html().removeAttribute("data-theme");
  localStorage.clear();
  deviceIsDark(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ThemeSwitch (R68)", () => {
  // E46: nothing chosen, so the device decides, and the button offers the
  // other mode.
  it("offers dark mode on a device set to light", () => {
    render(<ThemeSwitch />);
    expect(button().getAttribute("aria-label")).toBe("Switch to dark mode");
  });

  it("offers light mode on a device set to dark", () => {
    deviceIsDark(true);
    render(<ThemeSwitch />);
    expect(button().getAttribute("aria-label")).toBe("Switch to light mode");
  });

  it("follows a choice made earlier on this device", () => {
    deviceIsDark(true);
    html().setAttribute("data-theme", "light");
    render(<ThemeSwitch />);
    expect(button().getAttribute("aria-label")).toBe("Switch to dark mode");
  });

  it("switches the page at once and remembers the choice", async () => {
    render(<ThemeSwitch />);

    await act(async () => fireEvent.click(button()));
    expect(html().getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(button().getAttribute("aria-label")).toBe("Switch to light mode");

    await act(async () => fireEvent.click(button()));
    expect(html().getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(button().getAttribute("aria-label")).toBe("Switch to dark mode");
  });

  // On a device set to dark, the first press must go to LIGHT, not
  // "dark" (which would change nothing on screen).
  it("switches away from the mode that is showing", async () => {
    deviceIsDark(true);
    render(<ThemeSwitch />);
    await act(async () => fireEvent.click(button()));
    expect(html().getAttribute("data-theme")).toBe("light");
  });

  // E44: some private modes refuse storage; the open page still switches.
  it("still switches when the browser refuses to save", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    render(<ThemeSwitch />);
    await act(async () => fireEvent.click(button()));
    expect(html().getAttribute("data-theme")).toBe("dark");
  });

  // The icons are decoration; the label says what the button does. Which
  // one shows is decided by CSS, so it is right before any script runs.
  it("draws a moon for light mode and a sun for dark, both decorative", () => {
    const { container } = render(<ThemeSwitch />);
    const moon = container.querySelector("[data-icon='moon']")!;
    const sun = container.querySelector("[data-icon='sun']")!;
    expect(moon.getAttribute("aria-hidden")).toBe("true");
    expect(sun.getAttribute("aria-hidden")).toBe("true");
    expect(moon.getAttribute("class")).toContain("dark:hidden");
    expect(sun.getAttribute("class")).toContain("hidden");
    expect(sun.getAttribute("class")).toContain("dark:block");
  });

  it("is a real button with a focus ring", () => {
    render(<ThemeSwitch />);
    expect(button().getAttribute("type")).toBe("button");
    expect(button().className).toContain("focus-visible:outline-focus");
  });
});
