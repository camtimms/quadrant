import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findTitle, saveTitle } from "@/lib/titles/store";
import { admin, removeAllTestData, TEST_TMDB_ID_START } from "./helpers";

/**
 * The app's own titles store, run for real against the dev database.
 *
 * ensureTitle.test.ts checks the decisions (when to fetch, when to refresh)
 * with the database replaced by stand-ins. This file checks the other half:
 * that the two real queries in src/lib/titles/store.ts do what those
 * stand-ins pretend they do. TMDB is not involved; the film is made up.
 */

// Well inside the range reserved for throwaway films, clear of the ids that
// createTestTitle hands out from the bottom of it.
const TMDB_ID = TEST_TMDB_ID_START + 500_000;

const FILM = {
  tmdbId: TMDB_ID,
  title: "Store Test",
  year: 1999,
  posterPath: "/store-test.jpg",
};

beforeAll(removeAllTestData);
afterAll(removeAllTestData);

describe("the titles store", () => {
  it("finds nothing for a film we have never stored", async () => {
    expect(await findTitle(TMDB_ID)).toBeNull();
  });

  it("stores a film and finds it again by its TMDB id", async () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z");

    const saved = await saveTitle(FILM, fetchedAt);

    expect(saved).toMatchObject({
      media_type: "movie",
      tmdb_id: TMDB_ID,
      title: "Store Test",
      release_year: 1999,
      poster_path: "/store-test.jpg",
    });
    expect(Date.parse(saved.fetched_at)).toBe(fetchedAt.getTime());
    expect(await findTitle(TMDB_ID)).toEqual(saved);
  });

  // The refresh of a stale copy, and two members rating the same new film at
  // once, both come down to this: saving again must not make a second row or
  // change the id that ratings point at.
  it("saving the same film again updates the row instead of adding one", async () => {
    const before = await findTitle(TMDB_ID);
    const later = new Date("2026-11-14T00:00:00Z");

    const saved = await saveTitle(
      { ...FILM, title: "Store Test (renamed)", year: null, posterPath: null },
      later,
    );

    expect(saved.id).toBe(before?.id);
    expect(saved).toMatchObject({
      title: "Store Test (renamed)",
      release_year: null,
      poster_path: null,
    });
    expect(Date.parse(saved.fetched_at)).toBe(later.getTime());

    const rows = await admin.from("titles").select("id").eq("tmdb_id", TMDB_ID);
    expect(rows.data).toHaveLength(1);
  });

  it("two saves at the same instant leave one row", async () => {
    const id = TMDB_ID + 1;
    const film = { ...FILM, tmdbId: id };

    const [a, b] = await Promise.all([
      saveTitle(film, new Date()),
      saveTitle(film, new Date()),
    ]);

    expect(a.id).toBe(b.id);
    const rows = await admin.from("titles").select("id").eq("tmdb_id", id);
    expect(rows.data).toHaveLength(1);
  });
});
