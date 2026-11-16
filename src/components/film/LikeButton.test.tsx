// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setReviewLike = vi.hoisted(() => vi.fn());
vi.mock("@/app/(app)/actions/like", () => ({ setReviewLike }));

import { LikeButton } from "@/components/film/LikeButton";

// R69–R71, E53 (design 20.3): the like button on a review's card.

const ME = { userId: "me", displayName: "Cam" };
const PRIYA = { userId: "p", displayName: "Priya" };
const SAM = { userId: "s", displayName: "Sam" };

function show(props: Partial<React.ComponentProps<typeof LikeButton>> = {}) {
  return render(
    <LikeButton
      ratingId={41}
      reviewerName="Sam"
      isOwnReview={false}
      viewer={ME}
      likes={[PRIYA]}
      {...props}
    />,
  );
}
const button = () => screen.getByRole("button");

beforeEach(() => {
  setReviewLike.mockReset();
  setReviewLike.mockResolvedValue({ status: "ok" });
});
afterEach(cleanup);

describe("LikeButton", () => {
  it("shows how many liked the review", () => {
    show({ likes: [PRIYA, SAM] });
    expect(button().textContent).toContain("2");
  });

  // R70: the names, the viewer first and called "you".
  it("says who liked it, the viewer first as 'you'", () => {
    show({ likes: [PRIYA, ME, SAM] });
    expect(screen.getByText("Liked by you, Priya and Sam")).toBeTruthy();
  });

  it("names a single liker plainly", () => {
    show({ likes: [PRIYA] });
    expect(screen.getByText("Liked by Priya")).toBeTruthy();
  });

  it("shows no names and no count when nobody has liked it", () => {
    show({ likes: [] });
    expect(screen.queryByText(/Liked by/)).toBeNull();
    expect(button().textContent).not.toMatch(/\d/);
  });

  // The pressed state and the label say what a press will do (NFR12).
  it("offers to like a friend's review the viewer has not liked", () => {
    show();
    expect(button().getAttribute("aria-pressed")).toBe("false");
    expect(button().getAttribute("aria-label")).toBe("Like Sam's review");
  });

  it("offers to take back a like the viewer has given", () => {
    show({ likes: [ME] });
    expect(button().getAttribute("aria-pressed")).toBe("true");
    expect(button().getAttribute("aria-label")).toBe("Unlike Sam's review");
  });

  // R71: your own review can be liked too.
  it("words the label for the viewer's own review", () => {
    show({ isOwnReview: true, reviewerName: "Cam", likes: [] });
    expect(button().getAttribute("aria-label")).toBe("Like your review");
  });

  it("likes at once on a press, and asks the server to save it", async () => {
    let finish: (value: unknown) => void = () => {};
    setReviewLike.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    show({ likes: [PRIYA] });

    await act(async () => fireEvent.click(button()));
    // Changed before the server has answered.
    expect(button().getAttribute("aria-pressed")).toBe("true");
    expect(button().textContent).toContain("2");
    expect(screen.getByText("Liked by you and Priya")).toBeTruthy();
    expect(setReviewLike).toHaveBeenCalledWith(41, true);

    await act(async () => finish({ status: "ok" }));
  });

  it("asks to take the like back when pressed again", async () => {
    show({ likes: [ME, PRIYA] });
    await act(async () => fireEvent.click(button()));
    expect(setReviewLike).toHaveBeenCalledWith(41, false);
  });

  // E53: a failed save puts the button back and says so.
  it("goes back and explains when the like could not be saved", async () => {
    setReviewLike.mockResolvedValue({
      status: "error",
      message: "That like couldn't be saved. Please try again.",
    });
    show({ likes: [PRIYA] });

    await act(async () => fireEvent.click(button()));

    expect(button().getAttribute("aria-pressed")).toBe("false");
    expect(button().textContent).toContain("1");
    expect(screen.getByRole("alert").textContent).toBe(
      "That like couldn't be saved. Please try again.",
    );
  });

  it("is a real button with the theme's focus ring", () => {
    show();
    expect(button().getAttribute("type")).toBe("button");
    expect(button().className).toContain("focus-visible:outline-focus");
  });
});
