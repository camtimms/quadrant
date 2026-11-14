import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMovie,
  searchMovies,
  TmdbUnavailableError,
} from "@/lib/tmdb/client";
import movieNormal from "./fixtures/movie-normal.json";
import movieNotFound from "./fixtures/movie-not-found.json";
import searchCommando from "./fixtures/search-commando.json";

// No real network here: `fetch` is replaced with a stand-in that answers with
// the captured responses. That lets us test the awkward cases (rate limit,
// outage) that we cannot make the real TMDB produce on demand.

// Shaped like the real token but made up.
const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJleGFtcGxlIjp0cnVlfQ.c2lnbmF0dXJl";

const fetchMock = vi.fn<typeof fetch>();

/** A stand-in HTTP response carrying JSON. */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.stubEnv("TMDB_API_READ_ACCESS_TOKEN", TOKEN);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("searchMovies", () => {
  it("asks TMDB's film search, without adult titles, with the bearer token", async () => {
    fetchMock.mockResolvedValue(json(searchCommando));

    const films = await searchMovies("fast & furious");

    expect(films).toHaveLength(20);
    expect(films[0]).toMatchObject({ tmdbId: 10999, title: "Commando" });

    const [url, init] = fetchMock.mock.calls[0];
    const asked = new URL(String(url));
    expect(asked.origin + asked.pathname).toBe(
      "https://api.themoviedb.org/3/search/movie",
    );
    // The "&" in the query arrives intact as part of the value.
    expect(asked.searchParams.get("query")).toBe("fast & furious");
    expect(asked.searchParams.get("include_adult")).toBe("false");
    expect(asked.searchParams.get("page")).toBe("1");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      `Bearer ${TOKEN}`,
    );
    // The token goes in a header, never in the address, where it would end
    // up in logs.
    expect(String(url)).not.toContain(TOKEN);
  });

  it.each([429, 500, 503, 401])(
    "reports HTTP %i as unavailable (R12)",
    async (status) => {
      fetchMock.mockResolvedValue(json({ success: false }, status));
      await expect(searchMovies("commando")).rejects.toBeInstanceOf(
        TmdbUnavailableError,
      );
    },
  );

  it("reports a network failure or timeout as unavailable", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(searchMovies("commando")).rejects.toBeInstanceOf(
      TmdbUnavailableError,
    );
  });

  it("reports a body that is not JSON as unavailable", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad gateway</html>"));
    await expect(searchMovies("commando")).rejects.toBeInstanceOf(
      TmdbUnavailableError,
    );
  });

  it("reports an unexpected shape as unavailable", async () => {
    fetchMock.mockResolvedValue(json({ something: "else" }));
    await expect(searchMovies("commando")).rejects.toBeInstanceOf(
      TmdbUnavailableError,
    );
  });

  it("never puts the token in an error message", async () => {
    fetchMock.mockResolvedValue(json({ success: false }, 401));
    const error = await searchMovies("commando").catch((e: unknown) => e);
    expect(String(error)).not.toContain(TOKEN);
  });

  it("sets a time limit on the request", async () => {
    fetchMock.mockResolvedValue(json(searchCommando));
    await searchMovies("commando");
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("getMovie", () => {
  it("fetches one film by id", async () => {
    fetchMock.mockResolvedValue(json(movieNormal));

    expect(await getMovie(10999)).toEqual({
      tmdbId: 10999,
      title: "Commando",
      year: 1985,
      posterPath: "/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg",
      overview: movieNormal.overview,
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://api.themoviedb.org/3/movie/10999",
    );
  });

  it("returns null when TMDB has no film with that id", async () => {
    fetchMock.mockResolvedValue(json(movieNotFound, 404));
    expect(await getMovie(999999999)).toBeNull();
  });

  it("reports any other failure as unavailable (E9)", async () => {
    fetchMock.mockResolvedValue(json({ success: false }, 503));
    await expect(getMovie(10999)).rejects.toBeInstanceOf(TmdbUnavailableError);
  });
});
