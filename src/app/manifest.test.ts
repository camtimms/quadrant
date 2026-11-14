import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { isPublicPath } from "@/lib/auth/paths";
import { SITE_NAME } from "@/lib/site";

describe("web manifest (NFR25)", () => {
  it("names the site", () => {
    expect(manifest().name).toBe(SITE_NAME);
    expect(manifest().short_name).toBe(SITE_NAME);
  });

  it("lists icons that are real files", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
    for (const icon of icons) {
      // Files in public/ are served from the site's root.
      expect(existsSync(`public${icon.src}`)).toBe(true);
    }
  });

  // Browsers fetch it without cookies; behind sign-in it would never load.
  it("can be fetched without signing in", () => {
    expect(isPublicPath("/manifest.webmanifest")).toBe(true);
  });

  it("has the tab icon and the iPhone icon where Next.js looks for them", () => {
    expect(existsSync("src/app/favicon.ico")).toBe(true);
    expect(existsSync("src/app/apple-icon.png")).toBe(true);
  });
});
