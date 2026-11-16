"use client";

// "use client" because it reacts to key presses and focus in the browser.
// The films inside it are still drawn on the server; this adds behaviour.

import {
  useEffect,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import {
  ABOVE_FIRST,
  ARROW_ITEM_SELECTOR,
  nextArrowIndex,
  takesArrowKeys,
} from "@/lib/arrowKeys";

type Props = {
  children: ReactNode;
  className?: string;
  /**
   * "primary": the page's main film list. Down pressed anywhere on the
   *   page (outside text boxes and lists) enters it. One per page.
   * "panel": the list in an open chart panel; while it is open, Down
   *   enters it instead of the primary list.
   * Left out: a list that only reacts once focus is inside it.
   */
  kind?: "primary" | "panel";
  /** Called when Up is pressed on the first film (the search box uses it
   *  to take focus back). Without it, the first film just keeps focus. */
  onUpFromFirst?: () => void;
  /** The <ul> itself, for a parent that needs to reach its films. */
  ref?: Ref<HTMLUListElement>;
};

/** Anything in a row that Tab could stop on. */
const FOCUSABLE =
  "a[href], button, input, select, textarea, summary, [tabindex]";

/**
 * A list of films that acts as one selectable area (R64).
 *
 * - **Up and Down** move between the films. One listener on the whole
 *   list: a key pressed on a film "bubbles up" here. Only a film's own
 *   link counts; on a slider or a row's button the key is left alone.
 * - **One Tab stop** ("roving tabindex"). The list remembers a current
 *   film. Only that film and the controls in its own row can be reached
 *   with Tab; everything in the other rows gets tabIndex -1, which keeps it
 *   clickable and reachable by the arrows but takes it out of the Tab
 *   order. So Tab passes a list of 200 films in a step or two.
 * - **Down from anywhere** (kind "primary"): see the effect below.
 *
 * The rows are drawn on the server and do not know which is current, so
 * this sets the tabIndex attributes on the page itself after each render
 * and whenever focus moves.
 */
export function ArrowKeyList({
  children,
  className,
  kind,
  onUpFromFirst,
  ref,
}: Props) {
  const listRef = useRef<HTMLUListElement | null>(null);
  // The current film, remembered by its address: positions shift when a
  // filter changes the list, an address does not.
  const currentHref = useRef<string | null>(null);

  // After every render: the films may have changed (a filter, a search).
  useEffect(() => applyTabStops(listRef.current, currentHref.current));

  // Down pressed anywhere on the page enters the film list (R64, v9). Only
  // the primary list listens, so a page without one keeps its ordinary
  // scrolling (E34).
  useEffect(() => {
    if (kind !== "primary") return;
    function handlePageKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "ArrowDown" || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      const focused = document.activeElement;
      if (focused && focused !== document.body && takesArrowKeys(focused)) {
        return;
      }
      // An open chart panel's list wins over the page's list.
      const target =
        document.querySelector<HTMLElement>('[data-arrow-list="panel"]') ??
        listRef.current;
      if (!target) return;
      const links = filmLinks(target);
      const film = links.find((link) => link.tabIndex === 0) ?? links[0];
      if (!film) return;
      event.preventDefault();
      film.focus();
    }
    document.addEventListener("keydown", handlePageKeyDown);
    // Removed again when the list leaves the page.
    return () => document.removeEventListener("keydown", handlePageKeyDown);
  }, [kind]);

  /** Focus arriving anywhere in a row (arrow, click, Tab) makes it current. */
  function handleFocus(event: FocusEvent<HTMLUListElement>) {
    const row = (event.target as HTMLElement).closest("li");
    const link = row?.querySelector<HTMLElement>(ARROW_ITEM_SELECTOR);
    if (!link || !event.currentTarget.contains(link)) return;
    currentHref.current = link.getAttribute("href");
    applyTabStops(event.currentTarget, currentHref.current);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const target = event.target as HTMLElement;
    if (!target.matches(ARROW_ITEM_SELECTOR)) return;

    const links = filmLinks(event.currentTarget);
    const next = nextArrowIndex(links.indexOf(target), links.length, event.key);
    if (next === null) return;

    // The key was ours: stop the browser also scrolling the page with it.
    event.preventDefault();
    if (next === ABOVE_FIRST) onUpFromFirst?.();
    else links[next].focus();
  }

  return (
    <ul
      ref={(element) => {
        listRef.current = element;
        // Pass the element on to a parent's ref as well, whichever kind
        // of ref it gave.
        if (typeof ref === "function") ref(element);
        else if (ref) ref.current = element;
      }}
      data-arrow-list={kind ?? ""}
      className={className}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
    >
      {children}
    </ul>
  );
}

/** The film links in a list, in order. */
function filmLinks(list: HTMLElement): HTMLElement[] {
  return Array.from(list.querySelectorAll<HTMLElement>(ARROW_ITEM_SELECTOR));
}

/**
 * Put the current film's row in the Tab order and every other row out of
 * it. A current film that has left the list hands over to the first (E35).
 */
function applyTabStops(list: HTMLElement | null, currentHref: string | null) {
  if (!list) return;
  const links = filmLinks(list);
  let current = links.findIndex(
    (link) => link.getAttribute("href") === currentHref,
  );
  if (current === -1) current = 0;
  links.forEach((link, index) => {
    const row = link.closest("li") ?? link;
    const tabIndex = index === current ? 0 : -1;
    for (const element of row.querySelectorAll<HTMLElement>(FOCUSABLE)) {
      element.tabIndex = tabIndex;
    }
  });
}
