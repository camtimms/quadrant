"use client";

// "use client" because it reacts to key presses in the browser. The films
// inside it are still drawn on the server; this only adds the listener.

import type { KeyboardEvent, ReactNode, Ref } from "react";
import {
  ABOVE_FIRST,
  ARROW_ITEM_SELECTOR,
  nextArrowIndex,
} from "@/lib/arrowKeys";

type Props = {
  children: ReactNode;
  className?: string;
  /** Called when Up is pressed on the first film (the search box uses it
   *  to take focus back). Without it, the first film just keeps focus. */
  onUpFromFirst?: () => void;
  /** The <ul> itself, for a parent that needs to reach its films. */
  ref?: Ref<HTMLUListElement>;
};

/**
 * A list of films that Up and Down move through, as Tab does (R64).
 *
 * One listener on the whole list, not one per film: a key pressed on any
 * film "bubbles up" to the list, which looks at where it came from. It acts
 * only when that was a film's own link. On a slider or a row's button the
 * key is left alone, so a slider still moves and the page still scrolls
 * (E32).
 */
export function ArrowKeyList({
  children,
  className,
  onUpFromFirst,
  ref,
}: Props) {
  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const target = event.target as HTMLElement;
    if (!target.matches(ARROW_ITEM_SELECTOR)) return;

    const films = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(ARROW_ITEM_SELECTOR),
    );
    const next = nextArrowIndex(films.indexOf(target), films.length, event.key);
    if (next === null) return;

    // The key was ours: stop the browser also scrolling the page with it.
    event.preventDefault();
    if (next === ABOVE_FIRST) onUpFromFirst?.();
    else films[next].focus();
  }

  return (
    <ul ref={ref} className={className} onKeyDown={handleKeyDown}>
      {children}
    </ul>
  );
}
