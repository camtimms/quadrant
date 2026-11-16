/**
 * Which film Up or Down moves to in a list (R64).
 *
 * A pure function, separate from the component that moves the focus, so
 * the rule can be tested without a browser.
 */

/**
 * Spread onto the one link in each row that should take part:
 * `<Link {...ARROW_ITEM}>`. A data- attribute is just a marker the list can
 * look for; it changes nothing else about the link.
 *
 * It lives here, not in ArrowKeyList.tsx, because the film lists are drawn
 * on the server: a server component can render a client component, but it
 * cannot read plain values exported from a "use client" file.
 */
export const ARROW_ITEM = {
  "data-arrow-item": "",
  // Tells screen readers that these keys do something here (R64).
  "aria-keyshortcuts": "ArrowUp ArrowDown",
} as const;
export const ARROW_ITEM_SELECTOR = "[data-arrow-item]";

/** Marks a film list, and which kind it is (see ArrowKeyList). */
export const ARROW_LIST_SELECTOR = "[data-arrow-list]";

/** Returned for Up on the first film: "above the list", which the search
 *  box uses to take the focus back. */
export const ABOVE_FIRST = -1;

/**
 * @param current the position of the focused film, or -1 if focus is not
 *                on one of them
 * @param count   how many films the list has
 * @param key     the key pressed, as KeyboardEvent.key names it
 * @returns the position to move to, ABOVE_FIRST, or null for "not ours:
 *          let the key do what it normally does"
 *
 * There is no wrap-around from the last film to the first: reaching an end
 * and staying there tells a keyboard user where they are.
 */
export function nextArrowIndex(
  current: number,
  count: number,
  key: string,
): number | null {
  if (count === 0 || current < 0 || current >= count) return null;
  if (key === "ArrowDown") return Math.min(current + 1, count - 1);
  if (key === "ArrowUp") return current === 0 ? ABOVE_FIRST : current - 1;
  return null;
}

/**
 * Does the arrow key already have a job where focus is (R64, v9)? If so,
 * the page-wide "Down enters the film list" must leave it alone.
 *
 * True in a text box, a slider, a select or editable text, where the
 * arrows move the cursor or the value, and anywhere inside a film list,
 * which handles the arrows itself. False on links, buttons, checkboxes and
 * the page itself.
 */
export function takesArrowKeys(element: Element): boolean {
  if (element.closest(ARROW_LIST_SELECTOR)) return true;
  if (element.closest('[contenteditable=""], [contenteditable="true"]')) {
    return true;
  }
  const tag = element.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  // Checkboxes, radio buttons and push buttons are pressed, not steered.
  const type = (element.getAttribute("type") ?? "text").toLowerCase();
  return !["checkbox", "radio", "button", "submit", "reset"].includes(type);
}
