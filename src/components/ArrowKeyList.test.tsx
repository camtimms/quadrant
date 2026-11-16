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
