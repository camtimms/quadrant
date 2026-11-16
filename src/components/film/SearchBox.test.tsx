// @vitest-environment jsdom
// ^ Run this file in a pretend browser (jsdom) so components can be drawn.

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBox } from "@/components/film/SearchBox";
import { SEARCH_DEBOUNCE_MS } from "@/components/film/SearchBox";
import type { SearchResponse } from "@/lib/search";
import searchCommando from "@/lib/tmdb/fixtures/search-commando.json";
import { parseSearchResponse } from "@/lib/tmdb/schema";

// What /api/search would send for the captured TMDB page: the real parser's
// output, so these tests use the same shapes as production.
const COMMANDO: SearchResponse = {
  results: parseSearchResponse(searchCommando),
};

const fetchMock = vi.fn<typeof fetch>();

function apiAnswers(body: SearchResponse, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

/** The query each request to /api/search carried, in order. */
function queriesSent(): (string | null)[] {
  return fetchMock.mock.calls.map(([url]) => {
    const asked = new URL(String(url), "http://localhost");
    expect(asked.pathname).toBe("/api/search");
    return asked.searchParams.get("q");
  });
}

const input = () => screen.getByRole("searchbox", { name: "Search films" });

function type(text: string) {
  fireEvent.change(input(), { target: { value: text } });
}

function submit() {
  fireEvent.submit(input().closest("form")!);
}

/**
 * Move the pretend clock forward, then let React finish any updates that
 * follow (a timer firing, a response arriving). `act` is how a test tells
 * React "process everything now, then I will look at the screen".
 */
async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  // Fake timers let the tests jump 300 ms forward instantly and exactly.
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState(null, "", "/search");
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("SearchBox", () => {
  describe("when it asks the server (NFR10)", () => {
    it("sends nothing while typing, then one request after a 300 ms pause", async () => {
      apiAnswers(COMMANDO);
      render(<SearchBox />);

      type("c");
      await wait(100);
      type("co");
      await wait(100);
      type("com");
      // Just short of the pause since the last keystroke: still nothing.
      await wait(SEARCH_DEBOUNCE_MS - 1);
      expect(fetchMock).not.toHaveBeenCalled();

      await wait(1);
      expect(queriesSent()).toEqual(["com"]);
    });

    it("searches at once on submit, and not a second time when the pause ends", async () => {
      apiAnswers(COMMANDO);
      render(<SearchBox />);

      type("commando");
      submit();
      await wait(0);
      expect(queriesSent()).toEqual(["commando"]);

      await wait(SEARCH_DEBOUNCE_MS * 2);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("sends nothing for fewer than 2 characters, even on submit (R9)", async () => {
      render(<SearchBox />);

      type("c");
      await wait(SEARCH_DEBOUNCE_MS * 2);
      submit();
      await wait(0);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("searches straight away when the page opens with a query in the address", async () => {
      apiAnswers(COMMANDO);
      render(<SearchBox initialQuery="commando" />);

      expect((input() as HTMLInputElement).value).toBe("commando");
      await wait(0);
      expect(queriesSent()).toEqual(["commando"]);
      expect(screen.getAllByRole("listitem")).toHaveLength(20);
    });

    it("keeps the query in the address, so Back returns to the results", async () => {
      apiAnswers(COMMANDO);
      render(<SearchBox />);

      type("fast & furious");
      submit();
      await wait(0);

      expect(window.location.pathname).toBe("/search");
      expect(new URLSearchParams(window.location.search).get("q")).toBe(
        "fast & furious",
      );
    });
  });

  describe("results (R9, R10, R13)", () => {
    beforeEach(async () => {
      apiAnswers(COMMANDO);
      render(<SearchBox />);
      type("commando");
      submit();
      await wait(0);
    });

    it("shows every film with its title and year", () => {
      const items = screen.getAllByRole("listitem");
      expect(items).toHaveLength(20);
      expect(items[0].textContent).toContain("Commando");
      expect(items[0].textContent).toContain("1985");
    });

    it("says how many films were found, for screen readers", () => {
      expect(screen.getByRole("status").textContent).toContain("20 films");
    });

    it("links each film to its page", () => {
      const link = screen.getAllByRole("link")[0];
      expect(link.getAttribute("href")).toBe("/film/10999");
    });

    it("shows the poster with the film title as alt text (NFR15)", () => {
      const poster = screen.getAllByRole("img", { name: "Commando" })[0];
      expect(poster.getAttribute("src")).toBe(
        "https://image.tmdb.org/t/p/w185/ollPAAAgZ7euU8VisfqU3cuXhZ6.jpg",
      );
    });

    it("shows a placeholder when a film has no poster", () => {
      // Film 1420715 has "poster_path": null in the real response.
      const card = screen
        .getAllByRole("link")
        .find((a) => a.getAttribute("href") === "/film/1420715")!;
      expect(card.querySelector("img")).toBeNull();
      expect(card.textContent).toContain("No poster");
    });

    it('says "Year unknown" when a film has no release date', () => {
      // Film 718096 has "release_date": "" in the real response.
      const card = screen
        .getAllByRole("link")
        .find((a) => a.getAttribute("href") === "/film/718096")!;
      expect(card.textContent).toContain("Year unknown");
    });
  });

  describe("messages (R11, R12)", () => {
    it("shows that a search is in progress", async () => {
      // A request that never answers, to hold the "searching" state still.
      fetchMock.mockReturnValue(new Promise(() => {}));
      render(<SearchBox />);

      type("commando");
      submit();
      await wait(0);

      expect(screen.getByRole("status").textContent).toContain("Searching");
    });

    it("says so when nothing matches, and suggests checking the spelling", async () => {
      apiAnswers({ results: [] });
      render(<SearchBox />);

      type("comando");
      submit();
      await wait(0);

      const message = screen.getByRole("status").textContent;
      expect(message).toContain("No films found");
      expect(message).toContain("comando");
      expect(message).toMatch(/spelling/i);
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    });

    it("says search is unavailable when the server reports it", async () => {
      apiAnswers({ error: "unavailable" }, 503);
      render(<SearchBox />);

      type("commando");
      submit();
      await wait(0);

      expect(screen.getByRole("alert").textContent).toMatch(
        /search is unavailable.*try again/i,
      );
    });

    it("says search is unavailable when the request itself fails", async () => {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
      render(<SearchBox />);

      type("commando");
      submit();
      await wait(0);

      expect(screen.getByRole("alert").textContent).toMatch(
        /search is unavailable/i,
      );
    });

    it("offers a sign-in link when the session has ended", async () => {
      apiAnswers({ error: "signed-out" }, 401);
      render(<SearchBox />);

      type("commando");
      submit();
      await wait(0);

      const alert = screen.getByRole("alert");
      expect(alert.textContent).toMatch(/signed out/i);
      expect(alert.querySelector("a")?.getAttribute("href")).toContain(
        "/login",
      );
    });

    it("clears old results when the box is emptied", async () => {
      apiAnswers(COMMANDO);
      render(<SearchBox />);
      type("commando");
      submit();
      await wait(0);
      expect(screen.getAllByRole("listitem")).toHaveLength(20);

      type("");
      await wait(0);

      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    });
  });

  // Typing "com", pausing, then typing "commando" sends two requests. If the
  // first answer arrives LAST it must not replace the newer results.
  it("ignores a slow answer to an older query", async () => {
    let answerFirst!: (response: Response) => void;
    fetchMock
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => (answerFirst = resolve)),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(COMMANDO)));
    render(<SearchBox />);

    type("zz");
    submit();
    await wait(0);
    type("commando");
    submit();
    await wait(0);
    expect(screen.getAllByRole("listitem")).toHaveLength(20);

    answerFirst(new Response(JSON.stringify({ results: [] })));
    await wait(0);

    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    expect(screen.queryByText(/No films found/)).toBeNull();
  });
});

// R64: Up and Down between the search box and its results.
describe("SearchBox with the arrow keys (R64)", () => {
  const results = () =>
    screen
      .getAllByRole("listitem")
      .map((item) => item.querySelector("a") as HTMLElement);

  async function search() {
    apiAnswers(COMMANDO);
    render(<SearchBox />);
    type("commando");
    submit();
    await wait(0);
  }

  it("moves from the search box to the first result with Down", async () => {
    await search();
    input().focus();

    fireEvent.keyDown(input(), { key: "ArrowDown" });

    expect(document.activeElement).toBe(results()[0]);
  });

  it("moves between results with Down and Up", async () => {
    await search();
    results()[0].focus();

    fireEvent.keyDown(results()[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(results()[1]);

    fireEvent.keyDown(results()[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(results()[0]);
  });

  it("goes back to the search box with Up on the first result", async () => {
    await search();
    results()[0].focus();

    fireEvent.keyDown(results()[0], { key: "ArrowUp" });

    expect(document.activeElement).toBe(input());
  });

  // E33
  it("does nothing special with Down when there are no results", async () => {
    apiAnswers({ results: [] });
    render(<SearchBox />);
    type("comando");
    submit();
    await wait(0);
    input().focus();

    expect(fireEvent.keyDown(input(), { key: "ArrowDown" })).toBe(true);
    expect(document.activeElement).toBe(input());
  });
});
