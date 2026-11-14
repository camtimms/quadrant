// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Loading from "@/app/(app)/loading";
import FilmLoading from "@/app/(app)/film/[tmdbId]/loading";
import { PendingMark } from "@/components/PendingMark";

// Next.js's hook is replaced with a stand-in the tests can switch between
// "this link is loading" and "it is not".
const linkStatus = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", async (original) => ({
  ...(await original<typeof import("next/link")>()),
  useLinkStatus: () => ({ pending: linkStatus.pending }),
}));

afterEach(() => {
  cleanup();
  linkStatus.pending = false;
});

describe("PendingMark (NFR23)", () => {
  const mark = () => screen.getByTestId("pending-mark");

  it("is invisible while nothing is loading", () => {
    render(<PendingMark />);
    expect(mark().classList.contains("opacity-0")).toBe(true);
    expect(mark().getAttribute("data-pending")).toBe("false");
  });

  it("becomes visible while its link is loading", () => {
    linkStatus.pending = true;
    render(<PendingMark />);
    expect(mark().classList.contains("opacity-100")).toBe(true);
    expect(mark().classList.contains("opacity-0")).toBe(false);
    expect(mark().getAttribute("data-pending")).toBe("true");
  });

  // If the spinner were added and removed, the words beside it would jump
  // sideways on every tap. It is always there; only its opacity changes.
  it("takes up the same space whether loading or not", () => {
    const { container, unmount } = render(<PendingMark />);
    const idle = container.querySelector("[aria-hidden]")!.className;
    unmount();

    linkStatus.pending = true;
    const loading = render(<PendingMark />);
    expect(loading.container.querySelector("[aria-hidden]")!.className).toBe(
      idle,
    );
    expect(idle).toContain("h-4");
    expect(idle).toContain("w-4");
  });

  it("is decoration to a screen reader, and still shows when motion is reduced", () => {
    linkStatus.pending = true;
    const { container } = render(<PendingMark />);
    const spinner = container.querySelector("[aria-hidden='true']")!;
    expect(spinner.classList.contains("animate-spin")).toBe(true);
    // Stops spinning, but is not hidden.
    expect(spinner.classList.contains("motion-reduce:animate-none")).toBe(true);
    expect(spinner.classList.contains("motion-reduce:hidden")).toBe(false);
  });
});

describe("loading placeholders (NFR23)", () => {
  it("the general one says it is loading, in words", () => {
    render(<Loading />);
    expect(screen.getByRole("status").textContent).toMatch(/loading/i);
  });

  it("the film one says it is loading a film, and has a poster-shaped block", () => {
    const { container } = render(<FilmLoading />);
    expect(screen.getByRole("status").textContent).toMatch(/loading film/i);
    // The same width and shape as the real poster (PosterImage, size "page").
    const poster = container.querySelector(".w-44")!;
    expect(poster.className).toContain("aspect-[2/3]");
  });

  it("hides its grey blocks from screen readers", () => {
    const { container } = render(<Loading />);
    expect(
      container.querySelector(".animate-pulse")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });
});
