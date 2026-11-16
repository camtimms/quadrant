// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppError from "@/app/(app)/error";
import AppNotFound from "@/app/(app)/not-found";
import RootError from "@/app/error";
import RootNotFound from "@/app/not-found";

beforeEach(() => {
  // The error pages log what went wrong; keep the test output clean.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** A server error as Next.js hands it to the page in production. */
function serverError(): Error & { digest: string } {
  return Object.assign(new Error('relation "ratings" does not exist'), {
    digest: "1234567890",
  });
}

describe.each([
  ["inside the app", AppError],
  ["on a public page", RootError],
])("the error page %s (design 6)", (_, ErrorPage) => {
  it("says something went wrong, in plain words", () => {
    render(<ErrorPage error={serverError()} retry={() => {}} />);

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeTruthy();
  });

  // Details go to the log, never onto the screen.
  it("does not show the error's own message", () => {
    render(<ErrorPage error={serverError()} retry={() => {}} />);

    expect(document.body.textContent).not.toContain("does not exist");
  });

  it("tries again when 'Try again' is pressed", () => {
    const retry = vi.fn();
    render(<ErrorPage error={serverError()} retry={retry} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("offers a way back to My films", () => {
    render(<ErrorPage error={serverError()} retry={() => {}} />);

    expect(
      screen.getByRole("link", { name: /My films/ }).getAttribute("href"),
    ).toBe("/");
  });

  it("logs the error, so it can be matched to the server's log", () => {
    const error = serverError();
    render(<ErrorPage error={error} retry={() => {}} />);

    expect(console.error).toHaveBeenCalledWith(error);
  });

  // A value thrown in the browser need not be an Error at all.
  it("copes with something thrown that is not an Error", () => {
    render(<ErrorPage error="a plain string" retry={() => {}} />);

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeTruthy();
  });
});

describe.each([
  ["inside the app", AppNotFound],
  ["for an unknown address", RootNotFound],
])("the not-found page %s", (_, NotFoundPage) => {
  it("says the page was not found and links to My films", () => {
    render(<NotFoundPage />);

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /My films/ }).getAttribute("href"),
    ).toBe("/");
  });
});
