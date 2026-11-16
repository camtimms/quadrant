"use client";

// "use client" because this component reacts to typing and fetches results
// in the browser. It never talks to TMDB itself: it asks our own
// /api/search, which holds the secret token on the server.

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowKeyList } from "@/components/ArrowKeyList";
import { FilmCard } from "@/components/film/FilmCard";
import {
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_QUERY_MIN_LENGTH,
  parseSearchQuery,
  type SearchResponse,
} from "@/lib/search";
import { ARROW_ITEM_SELECTOR } from "@/lib/arrowKeys";
import type { TmdbFilm } from "@/lib/tmdb/schema";

/**
 * How long typing must pause before a search is sent (design section 4.4).
 * Waiting like this is called "debouncing": typing "commando" sends one
 * request, not eight (NFR10).
 */
export const SEARCH_DEBOUNCE_MS = 300;

/** Everything the area under the search box can be showing. */
type SearchState =
  | { status: "idle" } // nothing searched yet
  | { status: "loading" }
  | { status: "results"; query: string; films: TmdbFilm[] }
  | { status: "unavailable" } // R12
  | { status: "signed-out" }; // the session ended while the page was open

type Props = {
  /** A query from the page address (/search?q=heat), searched on arrival. */
  initialQuery?: string;
};

export function SearchBox({ initialQuery = "" }: Props) {
  const [text, setText] = useState(initialQuery);
  const [state, setState] = useState<SearchState>(
    // Opening /search?q=heat starts searching at once (see the effect
    // below), so start in "loading" rather than flashing an empty page.
    parseSearchQuery(initialQuery) ? { status: "loading" } : { status: "idle" },
  );

  // Refs hold values that must survive between renders but are not shown on
  // screen, so changing them does not redraw anything.
  // The box and the results list, so Up and Down can move between them
  // (R64).
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);

  /** Down in the box goes to the first result, when there is one. */
  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowDown") return;
    const first =
      resultsRef.current?.querySelector<HTMLElement>(ARROW_ITEM_SELECTOR);
    if (!first) return; // E33: no results, so Down does nothing special.
    event.preventDefault();
    first.focus();
  }

  const pauseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Lets us cancel a request that is still in flight when a newer one starts.
  const inFlight = useRef<AbortController>(undefined);

  /** Ask /api/search and return what should be shown, or null if cancelled. */
  async function fetchResults(query: string): Promise<SearchState | null> {
    // Cancel the previous request. Without this, a slow answer to an old
    // query could arrive late and replace the results of a newer one.
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    try {
      const response = await fetch(
        // URLSearchParams escapes the query, so "fast & furious" is safe.
        `/api/search?${new URLSearchParams({ q: query })}`,
        { signal: controller.signal },
      );
      const body = (await response.json()) as SearchResponse;
      if (controller.signal.aborted) return null;

      if ("results" in body) {
        return { status: "results", query, films: body.results };
      }
      if (body.error === "signed-out" || body.error === "not-a-member") {
        return { status: "signed-out" };
      }
      return { status: "unavailable" };
    } catch {
      // A cancelled request also lands here; that is not a failure.
      if (controller.signal.aborted) return null;
      return { status: "unavailable" };
    }
  }

  async function search(query: string) {
    setState({ status: "loading" });
    // Put the query in the address bar without reloading the page, so that
    // opening a film and pressing Back returns to these results.
    window.history.replaceState(
      null,
      "",
      `/search?${new URLSearchParams({ q: query })}`,
    );
    const next = await fetchResults(query);
    if (next) setState(next);
  }

  function stopEverything() {
    clearTimeout(pauseTimer.current);
    inFlight.current?.abort();
  }

  function handleChange(value: string) {
    setText(value);
    stopEverything();

    const query = parseSearchQuery(value);
    if (!query) {
      // Too short to search (R9): clear the old results rather than leave
      // them under a box that no longer matches them.
      setState({ status: "idle" });
      return;
    }
    // Start the pause again on every keystroke. Only the last one survives
    // long enough to fire.
    pauseTimer.current = setTimeout(
      () => void search(query),
      SEARCH_DEBOUNCE_MS,
    );
  }

  function handleSubmit(event: FormEvent) {
    // Stop the browser's own form submission, which would reload the page.
    event.preventDefault();
    stopEverything();
    const query = parseSearchQuery(text);
    // Pressing Enter means "now": no pause.
    if (query) void search(query);
  }

  // Runs once when the component first appears: search for the query that
  // came in the address, and tidy up when the component goes away.
  useEffect(() => {
    const query = parseSearchQuery(initialQuery);
    if (query) {
      void fetchResults(query).then((next) => {
        if (next) setState(next);
      });
    }
    return stopEverything;
    // Deliberately only on first appearance: later changes to the query come
    // from typing, which handleChange deals with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* role="search" marks this as the page's search area, which screen
          reader users can jump straight to. */}
      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex flex-col gap-2"
      >
        <label htmlFor="film_search" className="font-medium">
          Search films
        </label>
        <div className="flex gap-2">
          <input
            id="film_search"
            ref={inputRef}
            onKeyDown={handleInputKeyDown}
            // type="search" gives phones a "search" key and a clear button.
            type="search"
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            autoComplete="off"
            aria-describedby="film_search_help"
            className="min-w-0 flex-1 rounded border border-foreground/50 bg-transparent px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2"
          />
          <button
            type="submit"
            className="rounded bg-foreground px-4 py-2 font-medium text-background hover:opacity-90 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Search
          </button>
        </div>
        <p id="film_search_help" className="text-sm opacity-70">
          Type at least {SEARCH_QUERY_MIN_LENGTH} characters of a film title.
        </p>
      </form>

      {/* role="status": a screen reader reads out changes here ("Searching…",
          "20 films found") without the member having to go looking. The
          element is always present so the change itself is what's announced. */}
      <p role="status" className="text-sm opacity-80">
        {statusMessage(state)}
      </p>

      {/* role="alert" is the more urgent version, for problems (NFR15). */}
      {state.status === "unavailable" ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          Search is unavailable right now. Try again in a moment.
        </p>
      ) : null}
      {state.status === "signed-out" ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          You have been signed out.{" "}
          <Link
            href="/login?next=/search"
            className="underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Sign in again
          </Link>{" "}
          to search.
        </p>
      ) : null}

      {state.status === "results" && state.films.length > 0 ? (
        <ArrowKeyList
          ref={resultsRef}
          // Up on the first result goes back to the box (R64).
          onUpFromFirst={() => inputRef.current?.focus()}
          className="flex flex-col gap-1"
        >
          {state.films.map((film) => (
            // key tells React which row is which when the list changes.
            <li key={film.tmdbId}>
              <FilmCard film={film} />
            </li>
          ))}
        </ArrowKeyList>
      ) : null}
    </div>
  );
}

/** The one-line progress message for each state ("" when there is none). */
function statusMessage(state: SearchState): string {
  if (state.status === "loading") return "Searching…";
  if (state.status !== "results") return "";

  const count = state.films.length;
  if (count === 0) {
    // R11: say so, and suggest the likeliest fix.
    return `No films found for “${state.query}”. Check the spelling, or try fewer words.`;
  }
  return count === 1 ? "1 film found." : `${count} films found.`;
}
