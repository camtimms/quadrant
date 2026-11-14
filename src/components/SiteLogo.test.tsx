// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { SiteLogo } from "@/components/SiteLogo";
import { SITE_ICON_PATH } from "@/lib/site";

afterEach(cleanup);

describe("SiteLogo (NFR25)", () => {
  it("points at an icon file that really exists", () => {
    // Files in public/ are served from the site's root.
    expect(existsSync(`public${SITE_ICON_PATH}`)).toBe(true);
  });

  it("is drawn square, at the size asked for", () => {
    const { container } = render(<SiteLogo size={24} />);
    const image = container.querySelector("img")!;
    expect(image.getAttribute("src")).toBe(SITE_ICON_PATH);
    expect(image.getAttribute("width")).toBe("24");
    expect(image.getAttribute("height")).toBe("24");
  });

  // The site's name is written beside it; announcing both would repeat it.
  it("is skipped by screen readers", () => {
    const { container } = render(<SiteLogo size={24} />);
    expect(container.querySelector("img")!.getAttribute("alt")).toBe("");
    expect(screen.queryByRole("img")).toBeNull();
  });
});
