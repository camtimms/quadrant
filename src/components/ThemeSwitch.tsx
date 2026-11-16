"use client";

// "use client" because it reads and changes the page in the browser: which
// mode is showing, and the member's saved choice.

import { useSyncExternalStore } from "react";
import { focusRing } from "@/components/ui/styles";
import {
  nextTheme,
  parseSavedTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from "@/lib/themeChoice";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The mode showing now: the member's choice on <html>, or the device's. */
function currentMode(): ThemeMode {
  return resolveTheme(
    parseSavedTheme(document.documentElement.getAttribute("data-theme")),
    window.matchMedia(DARK_QUERY).matches,
  );
}

/**
 * Tell React when the mode may have changed: the attribute on <html>
 * changed (this button, or the same app in another part of the page), or
 * the device switched between light and dark.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const device = window.matchMedia(DARK_QUERY);
  device.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    device.removeEventListener("change", onChange);
  };
}

/**
 * The light/dark switch at the top right of the signed-in header (R68,
 * design 18).
 *
 * It keeps no state of its own. The mode is read from the page each time
 * (useSyncExternalStore is React's way to follow something outside React),
 * so the button can never disagree with what is on screen. On the server
 * the mode is unknown, so the label is general until the page is live; the
 * icon is chosen by CSS and is right from the first frame.
 */
export function ThemeSwitch() {
  const mode = useSyncExternalStore<ThemeMode | null>(
    subscribe,
    currentMode,
    () => null,
  );

  const label =
    mode === null
      ? "Switch between light and dark mode"
      : mode === "light"
        ? "Switch to dark mode"
        : "Switch to light mode";

  function toggle() {
    const next = nextTheme(currentMode());
    // Changing the attribute repaints the page in the new colours at once
    // (globals.css) and tells this button, through the observer above.
    document.documentElement.setAttribute("data-theme", next);
    try {
      // Remembered on this device for every page (Q20).
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage refused (some private modes, E44): the open page has still
      // switched; the next page follows the device again.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      // 36 px round: a comfortable thumb target beside "Sign out".
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-well text-ink hover:brightness-95 active:brightness-90 dark:hover:brightness-125 dark:active:brightness-150 ${focusRing}`}
    >
      {/* A moon in light mode (press for dark), a sun in dark mode. */}
      <svg
        data-icon="moon"
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 dark:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg
        data-icon="sun"
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="hidden h-5 w-5 dark:block"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
