import { describe, expect, it } from "vitest";
import {
  DEMO_FILMS,
  DEMO_LIKES,
  DEMO_MEMBERS,
  DEMO_RATINGS,
  demoEmail,
  isDemoEmail,
} from "./data";

// The demo data goes straight into the database with the secret key, which
// skips the app's own checks. So these tests hold it to the same rules the
// database and the form would (R16, R17, R19, R69), and to what the demo
// is for: something to see on every page.

const slugs = new Set(DEMO_MEMBERS.map((member) => member.slug));
const ratingOf = (member: string, film: string) =>
  DEMO_RATINGS.find(
    (rating) => rating.member === member && rating.film === film,
  );

describe("demo members", () => {
  it("are six, with unique names that fit a display name", () => {
    expect(DEMO_MEMBERS).toHaveLength(6);
    expect(new Set(DEMO_MEMBERS.map((member) => member.name)).size).toBe(6);
    for (const { name } of DEMO_MEMBERS) {
      expect(name.trim().length).toBeGreaterThan(0);
      expect(name.length).toBeLessThanOrEqual(40);
    }
  });

  it("all have addresses removal will find, and nothing else does", () => {
    for (const { slug } of DEMO_MEMBERS) {
      expect(isDemoEmail(demoEmail(slug))).toBe(true);
    }
    for (const real of [
      "cam@gmail.com",
      "demo-priya@gmail.com",
      "priya@quadrant.invalid",
      "demo-priya@quadrant.invalid.com",
      undefined,
    ]) {
      expect(isDemoEmail(real)).toBe(false);
    }
  });
});

describe("demo ratings", () => {
  const viewings = DEMO_RATINGS.flatMap((rating) => [
    rating,
    ...(rating.earlier ?? []),
  ]);

  it("use whole scores from 0 to 10 and reviews of at most 500 characters", () => {
    for (const viewing of viewings) {
      for (const score of [viewing.quality, viewing.enjoyment]) {
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      }
      expect([...(viewing.review ?? "")].length).toBeLessThanOrEqual(500);
    }
  });

  it("belong to demo members and known films", () => {
    for (const rating of DEMO_RATINGS) {
      expect(slugs.has(rating.member)).toBe(true);
      expect(DEMO_FILMS[rating.film]).toBeDefined();
    }
  });

  // R19: one current rating per member per film.
  it("give each member at most one current rating per film", () => {
    const keys = DEMO_RATINGS.map(
      (rating) => `${rating.member}/${rating.film}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("date earlier viewings before the current one, oldest first", () => {
    for (const rating of DEMO_RATINGS) {
      const days = [...(rating.earlier ?? []), rating].map((v) => v.daysAgo);
      for (let i = 1; i < days.length; i++) {
        expect(days[i]).toBeLessThan(days[i - 1]);
      }
    }
  });

  it("rate every listed film, some by one member and some by five or more", () => {
    const raters = new Map<string, number>();
    for (const rating of DEMO_RATINGS) {
      raters.set(rating.film, (raters.get(rating.film) ?? 0) + 1);
    }
    expect([...raters.keys()].sort()).toEqual(Object.keys(DEMO_FILMS).sort());
    // Unique films, overlaps, and enough for spread curves (R73).
    expect([...raters.values()].some((count) => count === 1)).toBe(true);
    expect(
      [...raters.values()].filter((count) => count >= 5).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("include rewatches, one of them a third watch", () => {
    const rewatches = DEMO_RATINGS.filter((rating) => rating.earlier?.length);
    expect(rewatches.length).toBeGreaterThanOrEqual(3);
    expect(rewatches.some((rating) => rating.earlier!.length >= 2)).toBe(true);
  });
});

describe("demo likes", () => {
  // R69: only a written review can be liked; one like per member.
  it("are on demo reviews that exist, each given once", () => {
    const seen = new Set<string>();
    for (const [liker, author, film] of DEMO_LIKES) {
      expect(slugs.has(liker)).toBe(true);
      expect(ratingOf(author, film)?.review).toBeTruthy();
      const key = `${liker}/${author}/${film}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
