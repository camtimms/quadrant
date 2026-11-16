// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CommonFilms } from "@/components/film/CommonFilms";
import type { ListFilm } from "@/components/film/FilmList";
import { filmsInCommon } from "@/lib/quadrant";

// R76, E57 (design 21.2): the films both members have rated.

afterEach(cleanup);

const film = (
  tmdbId: number,
  title: string,
  quality: number,
  enjoyment: number,
): ListFilm => ({
  tmdbId,
  title,
  year: 1995,
  posterPath: null,
  point: { quality, enjoyment },
  ratedAt: "2026-11-16T00:00:00Z",
});

const pairs = filmsInCommon(
  [film(949, "Heat", 8, 9), film(348, "Alien", 5, 5)],
  [film(949, "Heat", 2, 3), film(348, "Alien", 5, 5)],
);

describe("CommonFilms", () => {
  it("lists each shared film with both ratings and how far apart they are", () => {
    render(<CommonFilms pairs={pairs} theirName="Sam" />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);

    const heat = within(rows[0]);
    expect(heat.getByText("Heat")).toBeTruthy();
    expect(heat.getByText("You: Quality 8 · Enjoyment 9")).toBeTruthy();
    expect(heat.getByText("Sam: Quality 2 · Enjoyment 3")).toBeTruthy();
    expect(heat.getByText("8.5 apart")).toBeTruthy();
  });

  it("keeps the biggest disagreement first", () => {
    render(<CommonFilms pairs={pairs} theirName="Sam" />);
    const titles = screen
      .getAllByRole("listitem")
      .map((row) => within(row).getByRole("link").textContent);
    expect(titles[0]).toContain("Heat");
    expect(titles[1]).toContain("Alien");
  });

  it("says so, in words, when they agree exactly", () => {
    render(<CommonFilms pairs={pairs} theirName="Sam" />);
    expect(screen.getByText("Same scores")).toBeTruthy();
  });

  it("links each film to its page", () => {
    render(<CommonFilms pairs={pairs} theirName="Sam" />);
    const links = screen.getAllByRole("link");
    expect(links[0].getAttribute("href")).toBe("/film/949");
  });

  // E57
  it("says when there is nothing in common", () => {
    render(<CommonFilms pairs={[]} theirName="Sam" />);
    expect(screen.getByText("No films rated by both of you yet.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
