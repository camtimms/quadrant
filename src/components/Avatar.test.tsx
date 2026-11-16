// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Avatar } from "@/components/Avatar";

afterEach(cleanup);

const GOOGLE = "https://lh3.googleusercontent.com/a/abc123=s96-c";

const avatar = () => screen.getByTestId("avatar");
const image = () => avatar().querySelector("img");

describe("Avatar (R61)", () => {
  it("shows the member's picture", () => {
    render(<Avatar name="Cam" url={GOOGLE} />);

    expect(image()?.getAttribute("src")).toBe(GOOGLE);
    expect(avatar().textContent).toBe("");
  });

  // E27
  it("shows the first letter of the name when there is no picture", () => {
    render(<Avatar name="cam" url={null} />);

    expect(image()).toBeNull();
    expect(avatar().textContent).toBe("C");
  });

  // E27, E30: an address that has stopped working.
  it("falls back to the letter when the picture fails to load", () => {
    render(<Avatar name="Cam" url={GOOGLE} />);

    fireEvent.error(image()!);

    expect(image()).toBeNull();
    expect(avatar().textContent).toBe("C");
  });

  it("tries again when it is given a different picture", () => {
    const { rerender } = render(<Avatar name="Cam" url={GOOGLE} />);
    fireEvent.error(image()!);

    const newer = "https://lh3.googleusercontent.com/a/newer=s96-c";
    rerender(<Avatar name="Cam" url={newer} />);

    expect(image()?.getAttribute("src")).toBe(newer);
  });

  // The database only stores Google addresses. This is the same rule again
  // at the last moment, so nothing else can ever be fetched by a friend's
  // browser even if some other code passes the wrong thing in.
  it("never loads an address that is not on Google's picture servers", () => {
    render(<Avatar name="Cam" url="https://evil.example/pixel.png" />);

    expect(image()).toBeNull();
    expect(avatar().textContent).toBe("C");
  });

  it("does not tell Google which page asked for the picture", () => {
    render(<Avatar name="Cam" url={GOOGLE} />);

    expect(image()?.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  // The name is always written beside the picture, so a screen reader
  // should not announce the picture (or the letter) as well.
  it("is hidden from screen readers", () => {
    render(<Avatar name="Cam" url={GOOGLE} />);

    expect(avatar().getAttribute("aria-hidden")).toBe("true");
    expect(image()?.getAttribute("alt")).toBe("");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("is a circle of a fixed size, so the text beside it never jumps", () => {
    render(<Avatar name="Cam" url={null} />);

    expect(avatar().className).toContain("rounded-full");
    expect(avatar().className).toContain("shrink-0");
  });
});

// R79 (design 23.2): an uploaded picture, served from our own route.
describe("Avatar with an uploaded picture", () => {
  it("shows a picture from our own picture route", () => {
    const address = "/api/avatar/6a1f0c2e-9b7d-4e3a-8f21-0d5c4b3a2e1f?v=3";
    const { container } = render(<Avatar name="Cam" url={address} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(address);
  });
});
