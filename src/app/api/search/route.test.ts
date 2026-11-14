import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentMember } from "@/lib/auth/member";
import searchCommando from "@/lib/tmdb/fixtures/search-commando.json";
import { GET } from "./route";

// Two things are replaced with stand-ins here:
//   - "who is signed in?", so no database is needed;
//   - `fetch`, so no real request reaches TMDB.
// Everything in between (the route, the TMDB client, the parser) is the real
// code, so these tests cover the whole path a search takes on the server.

const getCurrentMember = vi.hoisted(() =>
  vi.fn<() => Promise<CurrentMember | null>>(),
);
vi.mock("@/lib/auth/member", () => ({ getCurrentMember }));

const fetchMock = vi.fn<typeof fetch>();

const MEMBER: CurrentMember = {
  userId: "00000000-0000-4000-8000-000000000001",
  isMember: true,
  displayName: "Cam",
  suggestedName: "Cam",
};

// Shaped like the real token but made up.
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJleGFtcGxlIjp0cnVlfQ.c2lnbmF0dXJl";

function search(query?: string) {
  const url = new URL("http://localhost:3000/api/search");
  if (query !== undefined) url.searchParams.set("q", query);
  return GET(new NextRequest(url));
}

function tmdbAnswers(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

beforeEach(() => {
  vi.stubEnv("TMDB_API_READ_ACCESS_TOKEN", TOKEN);
  vi.stubGlobal("fetch", fetchMock);
  // The route logs the cause of a failure for the server logs. Silence it so
  // the expected failures below do not clutter the test output.
  vi.spyOn(console, "error").mockImplementation(() => {});
  getCurrentMember.mockResolvedValue(MEMBER);
});

afterEach(() => {
  fetchMock.mockReset();
  getCurrentMember.mockReset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GET /api/search", () => {
  describe("who may search", () => {
    it("refuses a signed-out request, without calling TMDB", async () => {
      getCurrentMember.mockResolvedValue(null);

      const response = await search("commando");

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "signed-out" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    // Signed in with Google, but not (or no longer) on the invite list.
    it("refuses a signed-in non-member, without calling TMDB", async () => {
      getCurrentMember.mockResolvedValue({ ...MEMBER, isMember: false });

      const response = await search("commando");

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "not-a-member" });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("the query", () => {
    it.each([[undefined], [""], ["a"], ["  a  "]])(
      "refuses %j as too short, without calling TMDB (R9, NFR10)",
      async (query) => {
        const response = await search(query);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "query-too-short" });
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it("sends the trimmed query to TMDB", async () => {
      tmdbAnswers(searchCommando);
      await search("  commando  ");
      const asked = new URL(String(fetchMock.mock.calls[0][0]));
      expect(asked.searchParams.get("query")).toBe("commando");
    });
  });

  describe("results", () => {
    it("returns films as { tmdbId, title, year, posterPath }", async () => {
      tmdbAnswers(searchCommando);

      const response = await search("commando");
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.results).toHaveLength(20);
      expect(body.results[0]).toEqual({
        tmdbId: 10999,
        title: "Commando",
        year: 1985,
        posterPath: "/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg",
      });
    });

    it("returns an empty list when nothing matches (R11)", async () => {
      tmdbAnswers({ page: 1, results: [], total_pages: 1, total_results: 0 });
      const response = await search("zzzzqqqq");
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ results: [] });
    });

    it("asks TMDB to leave adult titles out, and drops any it sends anyway", async () => {
      // The real page, with the first film re-marked as adult.
      const [first, ...rest] = searchCommando.results;
      tmdbAnswers({
        ...searchCommando,
        results: [{ ...first, adult: true }, ...rest],
      });

      const body = await (await search("commando")).json();

      const asked = new URL(String(fetchMock.mock.calls[0][0]));
      expect(asked.searchParams.get("include_adult")).toBe("false");
      expect(body.results).toHaveLength(19);
      expect(
        body.results.map((film: { tmdbId: number }) => film.tmdbId),
      ).not.toContain(first.id);
    });

    it("is never stored by a browser or a cache in between", async () => {
      tmdbAnswers(searchCommando);
      const response = await search("commando");
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    });
  });

  describe("when TMDB lets us down (R12)", () => {
    async function expectUnavailable() {
      const response = await search("commando");
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "unavailable" });
    }

    it("a TMDB error returns { error: 'unavailable' }", async () => {
      tmdbAnswers({ success: false }, 500);
      await expectUnavailable();
    });

    it("being rate limited (429) returns { error: 'unavailable' }", async () => {
      tmdbAnswers({ success: false, status_code: 25 }, 429);
      await expectUnavailable();
    });

    it("a timeout returns { error: 'unavailable' }", async () => {
      // This is what fetch does when AbortSignal.timeout() fires.
      fetchMock.mockRejectedValue(
        new DOMException("The operation timed out.", "TimeoutError"),
      );
      await expectUnavailable();
    });

    it("a response in an unexpected shape returns { error: 'unavailable' }", async () => {
      tmdbAnswers({ nothing: "useful" });
      await expectUnavailable();
    });

    it("says nothing about the cause, and never includes the token", async () => {
      tmdbAnswers({ status_message: "Invalid API key" }, 401);
      const text = await (await search("commando")).text();
      expect(text).toBe('{"error":"unavailable"}');
      expect(text).not.toContain(TOKEN);
    });
  });
});
