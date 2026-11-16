// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The like button talks to the server; here only its presence matters.
vi.mock("@/app/(app)/actions/like", () => ({ setReviewLike: vi.fn() }));

import { RecentRatings } from "@/components/film/RecentRatings";
import type { FeedEntry } from "@/lib/data/groupFilms";

// R77, R78, E61, E63 (design 22): the recent-ratings feed.

afterEach(cleanup);

const VIEWER = { userId: "me", displayName: "Cam" };

function entry(overrides: Partial<FeedEntry> = {}): FeedEntry {
  return {
    tmdbId: 949,
    title: "Heat",
    year: 1995,
    posterPath: null,
    point: { quality: 8, enjoyment: 9 },
    ratedAt: "2026-11-16T10:00:00Z",
    userId: "sam",
    displayName: "Sam",
    avatarUrl: null,
    reviewStart: "Pacino and De Niro.",
    ratingId: 41,
    likes: [],
    ...overrides,
  };
}

const show = (entries: FeedEntry[], more = false) =>
  render(
    <RecentRatings
      entries={entries}
      more={more}
      moreHref="/friends?shown=100"
      viewer={VIEWER}
    />,
  );

describe("RecentRatings", () => {
  it("shows who rated which film, their scores and placement", () => {
    show([entry()]);
    const item = within(screen.getByRole("listitem"));
    expect(item.getByRole("link", { name: "Sam" })).toBeTruthy();
    expect(item.getByRole("link", { name: /Heat/ }).getAttribute("href")).toBe(
      "/film/949",
    );
    expect(item.getByText("1995")).toBeTruthy();
    expect(
      item.getByText("Quality 8 · Enjoyment 9 · Masterpieces"),
    ).toBeTruthy();
  });

  it("shows the start of the review, with the film page's like button", () => {
    show([entry({ likes: [{ userId: "zoe", displayName: "Zoe" }] })]);
    expect(screen.getByText("Pacino and De Niro.")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Like Sam's review" }),
    ).toBeTruthy();
    expect(screen.getByText("Liked by Zoe")).toBeTruthy();
  });

  it("shows no like button for a rating without a review", () => {
    show([entry({ reviewStart: null })]);
    expect(screen.queryByRole("button")).toBeNull();
  });

  // E63: the viewer's own ratings are in the feed, marked as theirs.
  it("marks the viewer's own rating and lets them like their review", () => {
    show([entry({ userId: "me", displayName: "Cam" })]);
    expect(screen.getByText("(you)", { exact: false })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Like your review" }),
    ).toBeTruthy();
  });

  it("keeps the order it is given", () => {
    show([
      entry({ ratingId: 2, title: "Alien", tmdbId: 348 }),
      entry({ ratingId: 1 }),
    ]);
    const films = screen
      .getAllByRole("listitem")
      .map(
        (item) =>
          within(item).getByRole("link", { name: /Alien|Heat/ }).textContent,
      );
    expect(films[0]).toContain("Alien");
    expect(films[1]).toContain("Heat");
  });

  // E61
  it("offers the next fifty only when there are more", () => {
    show([entry()], true);
    expect(
      screen.getByRole("link", { name: "Show 50 more" }).getAttribute("href"),
    ).toBe("/friends?shown=100");
    cleanup();
    show([entry()], false);
    expect(screen.queryByRole("link", { name: "Show 50 more" })).toBeNull();
  });

  it("says so when there is nothing to show", () => {
    show([]);
    expect(screen.getByText("No ratings to show here.")).toBeTruthy();
  });
});
