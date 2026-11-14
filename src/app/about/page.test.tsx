// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { Footer } from "@/components/Footer";
import { isPublicPath } from "@/lib/auth/paths";
import { SITE_NAME } from "@/lib/site";
import AboutPage from "./page";

afterEach(cleanup);

// These guard a legal requirement rather than a feature: TMDB's terms ask for
// their logo and an exact notice (NFR18). The point is that neither can be
// deleted or reworded by accident without a test failing.
describe("About page", () => {
  it("shows TMDB's required notice, word for word", () => {
    render(<AboutPage />);
    expect(
      screen.getByText(
        "This product uses the TMDB API but is not endorsed or certified by TMDB.",
      ),
    ).toBeTruthy();
  });

  it("shows the TMDB logo, from a file that really exists", () => {
    render(<AboutPage />);
    const logo = screen.getByRole("img", { name: "TMDB logo" });
    expect(logo.getAttribute("src")).toBe("/tmdb-logo.svg");

    // Files in public/ are served from the site root.
    expect(existsSync("public/tmdb-logo.svg")).toBe(true);
    const svg = readFileSync("public/tmdb-logo.svg", "utf8");
    expect(svg.startsWith("<svg")).toBe(true);
    // A logo is a picture. It must never carry code.
    expect(svg).not.toMatch(/<script|javascript:|\son\w+=/i);
  });

  it("makes our own name the main heading, above the logo", () => {
    render(<AboutPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      SITE_NAME,
    );
  });

  it("links to TMDB", () => {
    render(<AboutPage />);
    const link = screen.getByRole("link", { name: /The Movie Database/ });
    expect(link.getAttribute("href")).toBe("https://www.themoviedb.org/");
  });

  it("can be read without signing in", () => {
    expect(isPublicPath("/about")).toBe(true);
  });
});

describe("Footer", () => {
  it("links to the about page and names TMDB", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /TMDB/ });
    expect(link.getAttribute("href")).toBe("/about");
  });
});
