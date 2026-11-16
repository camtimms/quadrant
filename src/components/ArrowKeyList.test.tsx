// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArrowKeyList } from "@/components/ArrowKeyList";
import { ARROW_ITEM } from "@/lib/arrowKeys";

afterEach(cleanup);

/** A list of three films, each row with a button and a slider beside it. */
function renderList(onUpFromFirst?: () => void) {
  render(
    <ArrowKeyList onUpFromFirst={onUpFromFirst}>
      {["Alien", "Heat", "Ran"].map((title) => (
        <li key={title}>
          <a href={`/film/${title}`} {...ARROW_ITEM}>
            {title}
          </a>
          <button type="button">Update scores for {title}</button>
          <input type="range" aria-label={`Quality of ${title}`} />
        </li>
      ))}
    </ArrowKeyList>,
  );
}

const film = (title: string) => screen.getByRole("link", { name: title });

/** Press a key on an element that has focus. Returns false if the list
 *  stopped the browser's own reaction (such as scrolling the page). */
function press(element: HTMLElement, key: string): boolean {
  element.focus();
  return fireEvent.keyDown(element, { key });
}

describe("ArrowKeyList (R64)", () => {
  it("is a list", () => {
    renderList();
    expect(screen.getByRole("list")).toBeTruthy();
  });

  it("moves focus down and up between films", () => {
    renderList();

    press(film("Alien"), "ArrowDown");
    expect(document.activeElement).toBe(film("Heat"));

    press(film("Heat"), "ArrowDown");
    expect(document.activeElement).toBe(film("Ran"));

    press(film("Ran"), "ArrowUp");
    expect(document.activeElement).toBe(film("Heat"));
  });

  // Moving focus instead of scrolling: the list takes the key.
  it("stops the page scrolling when it moves focus", () => {
    renderList();
    expect(press(film("Alien"), "ArrowDown")).toBe(false);
  });

  it("stays on the last film when Down is pressed there", () => {
    renderList();

    press(film("Ran"), "ArrowDown");

    expect(document.activeElement).toBe(film("Ran"));
  });

  it("stays on the first film when Up is pressed there and nothing is above", () => {
    renderList();

    press(film("Alien"), "ArrowUp");

    expect(document.activeElement).toBe(film("Alien"));
  });

  it("hands Up on the first film to whatever is above the list", () => {
    const onUpFromFirst = vi.fn();
    renderList(onUpFromFirst);

    press(film("Alien"), "ArrowUp");

    expect(onUpFromFirst).toHaveBeenCalledTimes(1);
  });

  // E32: a row's button and a slider keep their own keys.
  it("leaves the keys alone when focus is on a button or a slider", () => {
    renderList();
    const button = screen.getByRole("button", { name: /Alien/ });
    const slider = screen.getByRole("slider", { name: /Alien/ });

    expect(press(button, "ArrowDown")).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(press(slider, "ArrowUp")).toBe(true);
    expect(document.activeElement).toBe(slider);
  });

  it("ignores other keys on a film", () => {
    renderList();

    for (const key of ["ArrowLeft", "ArrowRight", "Tab", "Enter"]) {
      expect(press(film("Heat"), key)).toBe(true);
      expect(document.activeElement).toBe(film("Heat"));
    }
  });
});

// R64 (v9): each list is one selectable area.
describe("ArrowKeyList as one selectable area (R64, v9)", () => {
  /** The films that Tab would stop on, by name. */
  const tabStops = () =>
    Array.from(document.querySelectorAll<HTMLElement>("a, button, input"))
      .filter((element) => element.tabIndex >= 0)
      .map(
        (element) => element.textContent || element.getAttribute("aria-label"),
      );

  it("puts only the first film and its own controls in the Tab order", () => {
    renderList();

    expect(tabStops()).toEqual([
      "Alien",
      "Update scores for Alien",
      "Quality of Alien",
    ]);
  });

  it("makes the film moved to the current one", () => {
    renderList();

    press(film("Alien"), "ArrowDown");

    expect(tabStops()).toEqual([
      "Heat",
      "Update scores for Heat",
      "Quality of Heat",
    ]);
  });

  // A click or a Tab arriving on a film makes it current too.
  it("makes a film current when it receives focus any other way", () => {
    renderList();

    fireEvent.focus(film("Ran"));

    expect(tabStops()[0]).toBe("Ran");
  });

  it("keeps every film clickable and focusable", () => {
    renderList();

    for (const title of ["Alien", "Heat", "Ran"]) {
      expect(film(title).getAttribute("href")).toBe(`/film/${title}`);
      film(title).focus();
      expect(document.activeElement).toBe(film(title));
    }
  });

  it("tells screen readers about the arrow keys", () => {
    renderList();
    expect(film("Heat").getAttribute("aria-keyshortcuts")).toBe(
      "ArrowUp ArrowDown",
    );
  });

  // E35
  it("makes the first film current when the current one leaves the list", () => {
    const { rerender } = render(
      <ArrowKeyList>
        {["Alien", "Heat"].map((title) => (
          <li key={title}>
            <a href={`/film/${title}`} {...ARROW_ITEM}>
              {title}
            </a>
          </li>
        ))}
      </ArrowKeyList>,
    );
    fireEvent.focus(film("Heat"));

    rerender(
      <ArrowKeyList>
        {["Alien", "Ran"].map((title) => (
          <li key={title}>
            <a href={`/film/${title}`} {...ARROW_ITEM}>
              {title}
            </a>
          </li>
        ))}
      </ArrowKeyList>,
    );

    expect(film("Alien").tabIndex).toBe(0);
    expect(film("Ran").tabIndex).toBe(-1);
  });
});

describe("Down from anywhere on the page (R64, v9)", () => {
  /** Press Down with focus wherever it is now, as the page sees it. */
  function pressDownOnPage(): boolean {
    const target = (document.activeElement ?? document.body) as HTMLElement;
    return fireEvent.keyDown(target, { key: "ArrowDown" });
  }

  function renderPage({ panel = false } = {}) {
    render(
      <>
        <a href="/friends">Friends&apos; films</a>
        <input type="search" aria-label="Search films" />
        {panel ? (
          <ArrowKeyList kind="panel">
            <li>
              <a href={`/film/${"Panel"}`} {...ARROW_ITEM}>
                Panel film
              </a>
            </li>
          </ArrowKeyList>
        ) : null}
        <ArrowKeyList kind="primary">
          {["Alien", "Heat"].map((title) => (
            <li key={title}>
              <a href={`/film/${title}`} {...ARROW_ITEM}>
                {title}
              </a>
            </li>
          ))}
        </ArrowKeyList>
      </>,
    );
  }

  it("enters the list at its current film from the page itself", () => {
    renderPage();
    (document.activeElement as HTMLElement | null)?.blur();

    expect(pressDownOnPage()).toBe(false);
    expect(document.activeElement).toBe(film("Alien"));
  });

  it("enters the list from a link outside it, such as the navigation", () => {
    renderPage();
    screen.getByRole("link", { name: "Friends' films" }).focus();

    pressDownOnPage();

    expect(document.activeElement).toBe(film("Alien"));
  });

  it("returns to the film the member was last on", () => {
    renderPage();
    fireEvent.focus(film("Heat"));
    screen.getByRole("link", { name: "Friends' films" }).focus();

    pressDownOnPage();

    expect(document.activeElement).toBe(film("Heat"));
  });

  it("enters an open chart panel's list rather than the page's list", () => {
    renderPage({ panel: true });
    (document.activeElement as HTMLElement | null)?.blur();

    pressDownOnPage();

    expect(document.activeElement).toBe(film("Panel film"));
  });

  it("leaves Down alone in a text box", () => {
    renderPage();
    const box = screen.getByRole("searchbox");
    box.focus();

    expect(pressDownOnPage()).toBe(true);
    expect(document.activeElement).toBe(box);
  });

  // E34: a page with no primary list keeps its normal scrolling.
  it("does nothing on a page without a primary list", () => {
    render(
      <ArrowKeyList kind="panel">
        <li>
          <a href={`/film/${"Alien"}`} {...ARROW_ITEM}>
            Alien
          </a>
        </li>
      </ArrowKeyList>,
    );
    (document.activeElement as HTMLElement | null)?.blur();

    expect(pressDownOnPage()).toBe(true);
    expect(document.activeElement).toBe(document.body);
  });
});
