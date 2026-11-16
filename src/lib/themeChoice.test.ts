import { describe, expect, it } from "vitest";
import {
  nextTheme,
  parseSavedTheme,
  resolveTheme,
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
} from "@/lib/themeChoice";

// R68 (design 18): a member's light/dark choice, remembered on the device.

describe("parseSavedTheme", () => {
  it("accepts only the two choices the switch makes", () => {
    expect(parseSavedTheme("light")).toBe("light");
    expect(parseSavedTheme("dark")).toBe("dark");
  });

  // Anything else (nothing saved, an old value, something typed into the
  // browser's storage) counts as "never chosen".
  it.each([null, "", "Dark", "system", "<script>"])(
    "treats %j as no choice",
    (value) => {
      expect(parseSavedTheme(value)).toBeNull();
    },
  );
});

describe("resolveTheme", () => {
  // E46: until the switch is pressed, the device's own setting decides.
  it("follows the device when nothing is chosen", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it("follows the member's choice over the device", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("nextTheme", () => {
  it("flips between the two modes (Q19: two states)", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });
});

/**
 * Run the head script against a pretend page: an <html> element and a
 * storage that holds `saved` (or throws, as some private modes do).
 */
function runScript(saved: string | null | Error) {
  const attributes: Record<string, string> = {};
  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attributes[name] = value;
      },
    },
  };
  const localStorage = {
    getItem: (key: string) => {
      if (saved instanceof Error) throw saved;
      return key === THEME_STORAGE_KEY ? saved : null;
    },
  };
  new Function("document", "localStorage", THEME_SCRIPT)(
    document,
    localStorage,
  );
  return attributes["data-theme"];
}

// E42: the script runs before the page is painted, so a chosen mode shows
// from the first frame.
describe("THEME_SCRIPT", () => {
  it("applies a saved choice to the page", () => {
    expect(runScript("dark")).toBe("dark");
    expect(runScript("light")).toBe("light");
  });

  it("leaves the page to follow the device when nothing is saved", () => {
    expect(runScript(null)).toBeUndefined();
  });

  it("ignores anything but the two choices", () => {
    expect(runScript('"><img src=x>')).toBeUndefined();
  });

  // E44: a browser that refuses storage must not break the page.
  it("does nothing, without failing, when storage is refused", () => {
    expect(() => runScript(new Error("SecurityError"))).not.toThrow();
    expect(runScript(new Error("SecurityError"))).toBeUndefined();
  });

  it("is short, fixed text with nothing from a member in it", () => {
    expect(THEME_SCRIPT.length).toBeLessThan(300);
    expect(THEME_SCRIPT).not.toMatch(/\$\{/);
  });
});
