// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PosterImage } from "@/components/film/PosterImage";

afterEach(cleanup);

describe("PosterImage", () => {
  it("draws the poster from TMDB with the title as alt text (NFR15)", () => {
    render(<PosterImage posterPath="/abc.jpg" title="Heat" size="list" />);

    const img = screen.getByRole("img", { name: "Heat" });
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toBe(
      "https://image.tmdb.org/t/p/w185/abc.jpg",
    );
  });

  it("uses the larger size on the film page", () => {
    render(<PosterImage posterPath="/abc.jpg" title="Heat" size="page" />);
    expect(screen.getByRole("img").getAttribute("src")).toContain("/w342/");
  });

  it("shows a labelled placeholder when there is no poster (R10)", () => {
    render(<PosterImage posterPath={null} title="Heat" size="list" />);

    // Still announced as an image named after the film, and it says in
    // visible words why there is no picture.
    const placeholder = screen.getByRole("img", { name: "Heat" });
    expect(placeholder.tagName).not.toBe("IMG");
    expect(placeholder.textContent).toContain("No poster");
  });

  it("falls back to the placeholder if the image fails to load", () => {
    render(<PosterImage posterPath="/gone.jpg" title="Heat" size="list" />);

    fireEvent.error(screen.getByRole("img"));

    const placeholder = screen.getByRole("img", { name: "Heat" });
    expect(placeholder.tagName).not.toBe("IMG");
  });
});
