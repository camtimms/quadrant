/**
 * The member's choice of light or dark mode (R68, design section 18).
 *
 * The choice lives in the browser's localStorage, so it belongs to the
 * device, not the account (Q20), and needs no database. It is shown on the
 * page as `data-theme="light"` or `"dark"` on <html>; globals.css applies
 * the dark colours from that, or, when the attribute is absent, from the
 * device's own setting (E46).
 */

export type ThemeMode = "light" | "dark";

/** The one key the choice is saved under. */
export const THEME_STORAGE_KEY = "quadrant-theme";

/** A saved value, if it is one of the two the switch writes; else null. */
export function parseSavedTheme(value: string | null): ThemeMode | null {
  return value === "light" || value === "dark" ? value : null;
}

/** The mode in force: the member's choice, or else the device's setting. */
export function resolveTheme(
  chosen: ThemeMode | null,
  devicePrefersDark: boolean,
): ThemeMode {
  return chosen ?? (devicePrefersDark ? "dark" : "light");
}

/** What the switch changes to (two states, Q19). */
export function nextTheme(current: ThemeMode): ThemeMode {
  return current === "light" ? "dark" : "light";
}

/**
 * Runs in <head> before the page is painted, so a chosen mode shows from
 * the very first frame (E42). It has to be plain JavaScript written out as
 * text: it runs before React or any of our code has loaded. (This is the
 * approach in Next.js's own guide, "How to prevent flash before
 * hydration".)
 *
 * It only ever writes "light" or "dark", whatever is in storage, and the
 * try/catch covers browsers that refuse storage (E44). With nothing saved
 * it does nothing, and the device's setting applies (E46).
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
