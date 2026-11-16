// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DeleteRatingState,
  RatingFormState,
} from "@/lib/validation/rating";
import { DeleteRatingButton } from "./DeleteRatingButton";
import { RewatchSwitch } from "./RewatchSwitch";

// Stand-ins for the server actions: these tests are about what the form
// shows and sends. The action's own rewatch path is tested in
// src/app/(app)/actions/rating.test.ts.
const actions = vi.hoisted(() => ({
  saveRating:
    vi.fn<(previous: unknown, data: FormData) => Promise<RatingFormState>>(),
  deleteRating:
    vi.fn<(previous: unknown, data: FormData) => Promise<DeleteRatingState>>(),
}));
vi.mock("@/app/(app)/actions/rating", () => actions);

const CURRENT = {
  quality: 7,
  enjoyment: 4,
  review: "Slow but clever.",
} as const;

function renderSwitch() {
  return render(
    <RewatchSwitch tmdbId={10999} initialRating={CURRENT}>
      <p>delete button here</p>
    </RewatchSwitch>,
  );
}

const startRewatch = () =>
  fireEvent.click(screen.getByRole("button", { name: /log a rewatch/i }));
const slider = (name: RegExp) =>
  screen.getByRole("slider", { name }) as HTMLInputElement;
const review = () =>
  screen.getByRole("textbox", { name: /review/i }) as HTMLTextAreaElement;

beforeEach(() => {
  actions.saveRating.mockReset();
  actions.saveRating.mockResolvedValue({ status: "idle" });
});
afterEach(cleanup);

describe("RewatchSwitch (R83)", () => {
  it("shows the edit form first, with the way to log a rewatch", () => {
    renderSwitch();
    expect(screen.getByRole("button", { name: "Update rating" })).toBeTruthy();
    expect(screen.getByText("delete button here")).toBeTruthy();
    expect(screen.getByRole("button", { name: /log a rewatch/i })).toBeTruthy();
  });

  it("swaps in the rewatch form, starting from the current scores and an empty review", () => {
    renderSwitch();
    startRewatch();
    expect(screen.getByRole("button", { name: "Log rewatch" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Update rating" })).toBeNull();
    expect(screen.queryByText("delete button here")).toBeNull();
    expect(slider(/quality/i).value).toBe("7");
    expect(slider(/enjoyment/i).value).toBe("4");
    expect(review().value).toBe("");
    // Says what will happen to the current rating.
    expect(screen.getByText(/kept as an earlier viewing/i)).toBeTruthy();
  });

  it("sends the rewatch flag with the new scores", async () => {
    renderSwitch();
    startRewatch();
    fireEvent.change(slider(/quality/i), { target: { value: "9" } });
    fireEvent.change(review(), { target: { value: "Better this time." } });
    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: "Log rewatch" }).closest("form")!,
      );
    });
    const sent = Object.fromEntries(
      actions.saveRating.mock.calls[0][1].entries(),
    );
    expect(sent).toMatchObject({
      tmdb_id: "10999",
      rewatch: "1",
      quality: "9",
      enjoyment: "4",
      review: "Better this time.",
      return_to: "/film/10999",
    });
  });

  it("sends no rewatch flag from the edit form", async () => {
    renderSwitch();
    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: "Update rating" }).closest("form")!,
      );
    });
    const sent = Object.fromEntries(
      actions.saveRating.mock.calls[0][1].entries(),
    );
    expect(sent.rewatch).toBeUndefined();
  });

  it("goes back to the edit form on Cancel", () => {
    renderSwitch();
    startRewatch();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Update rating" })).toBeTruthy();
  });
});

describe("DeleteRatingButton with earlier viewings (R87)", () => {
  it("says the earlier viewings go too", () => {
    render(
      <DeleteRatingButton titleId={42} filmTitle="Heat" earlierViewings={2} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete rating" }));
    expect(screen.getByText(/and your 2 earlier viewings/)).toBeTruthy();
  });

  it("says 'viewing' for one", () => {
    render(
      <DeleteRatingButton titleId={42} filmTitle="Heat" earlierViewings={1} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete rating" }));
    expect(screen.getByText(/and your earlier viewing\b/)).toBeTruthy();
  });

  it("says nothing about viewings when there are none", () => {
    render(<DeleteRatingButton titleId={42} filmTitle="Heat" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete rating" }));
    expect(screen.queryByText(/earlier viewing/)).toBeNull();
  });
});
