// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLACEMENT_LABELS, SCALE_END_LABELS } from "@/lib/quadrant";
import type {
  DeleteRatingState,
  RatingFormState,
  RatingInput,
} from "@/lib/validation/rating";
import { DeleteRatingButton } from "./DeleteRatingButton";
import { PlacementPreview } from "./PlacementPreview";
import { RatingForm } from "./RatingForm";

// The two server actions are replaced with stand-ins that record what the
// form sent and answer however each test wants. What the real actions do
// with it is tested in src/app/(app)/actions/rating.test.ts.
const actions = vi.hoisted(() => ({
  saveRating:
    vi.fn<(previous: unknown, data: FormData) => Promise<RatingFormState>>(),
  deleteRating:
    vi.fn<(previous: unknown, data: FormData) => Promise<DeleteRatingState>>(),
}));
vi.mock("@/app/(app)/actions/rating", () => actions);

const quality = () =>
  screen.getByRole("slider", { name: /quality/i }) as HTMLInputElement;
const enjoyment = () =>
  screen.getByRole("slider", { name: /enjoyment/i }) as HTMLInputElement;
const review = () =>
  screen.getByRole("textbox", { name: /review/i }) as HTMLTextAreaElement;

/** Move a slider, the way dragging or an arrow key ends up doing. */
function setSlider(slider: HTMLInputElement, value: number) {
  fireEvent.change(slider, { target: { value: String(value) } });
}

/** Press the save button and wait for the action's answer to be shown. */
async function save() {
  await act(async () => {
    fireEvent.submit(
      screen.getByRole("button", { name: /save|update/i }).closest("form")!,
    );
  });
}

/** What the form sent to the save action, as a plain object. */
function sent(): Record<string, FormDataEntryValue> {
  expect(actions.saveRating).toHaveBeenCalledTimes(1);
  return Object.fromEntries(actions.saveRating.mock.calls[0][1].entries());
}

beforeEach(() => {
  // The real action redirects back to the film's page after a successful
  // save and so never answers. Answering "idle" is the nearest a stand-in can get.
  actions.saveRating.mockResolvedValue({ status: "idle" });
  actions.deleteRating.mockResolvedValue({ status: "deleted" });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("RatingForm", () => {
  describe("for a film the member has not rated (R49, R92)", () => {
    // R92: nothing is chosen for them.
    it("starts both sliders unset", () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      expect(screen.getByTestId("quality-value").textContent).toBe("–");
      expect(screen.getByTestId("enjoyment-value").textContent).toBe("–");
      expect(quality().getAttribute("aria-valuetext")).toBe("Not set");
      // No name: an unset score is not sent at all (design 26).
      expect(quality().getAttribute("name")).toBeNull();
      expect(review().value).toBe("");
    });

    it("sets a slider when it is moved", () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      setSlider(quality(), 8);
      expect(screen.getByTestId("quality-value").textContent).toBe("8");
      expect(quality().getAttribute("name")).toBe("quality");
      expect(quality().getAttribute("aria-valuetext")).toBe("8 out of 10");
    });

    // E78: a tap on the middle changes nothing, so no change event fires.
    it("sets a slider to 5 when its middle is tapped", () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      fireEvent.click(quality());
      expect(screen.getByTestId("quality-value").textContent).toBe("5");
    });

    it("says where the film lands only once both are chosen", () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      const preview = () => screen.getByTestId("placement-preview");
      expect(preview().textContent).toMatch(/Choose both scores/);
      setSlider(quality(), 9);
      expect(preview().textContent).toMatch(/Choose both scores/);
      setSlider(enjoyment(), 9);
      expect(preview().textContent).toContain(PLACEMENT_LABELS.masterpieces);
    });

    it("runs each slider from 0 to 10 in whole steps", () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      for (const slider of [quality(), enjoyment()]) {
        expect(slider.type).toBe("range");
        expect(slider.min).toBe("0");
        expect(slider.max).toBe("10");
        expect(slider.step).toBe("1");
      }
    });

    it("shows each slider's current number", () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      setSlider(quality(), 8);
      setSlider(enjoyment(), 0);
      expect(screen.getByTestId("quality-value").textContent).toBe("8");
      // E14: a 0 is shown as 0, not as blank.
      expect(screen.getByTestId("enjoyment-value").textContent).toBe("0");
    });

    // NFR22: the words come from the one label table, so a rename there
    // reaches the sliders without touching this component.
    it("labels the slider ends from labels.ts", () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      for (const word of [
        SCALE_END_LABELS.quality.low,
        SCALE_END_LABELS.quality.high,
        SCALE_END_LABELS.enjoyment.low,
        SCALE_END_LABELS.enjoyment.high,
      ]) {
        expect(screen.getAllByText(word).length).toBeGreaterThan(0);
      }
    });

    // E22 (v19), R93: nothing is saved until both scores are chosen.
    it("does not send with both sliders unset, and asks for both", async () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      fireEvent.change(review(), { target: { value: "Loved it." } });
      await save();
      expect(actions.saveRating).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toBe("Choose both scores.");
      expect(quality().getAttribute("aria-invalid")).toBe("true");
      // Focus goes to the first one to choose.
      expect(document.activeElement).toBe(quality());
      // E19: what was typed is kept.
      expect(review().value).toBe("Loved it.");
    });

    it("names the one score still to choose", async () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      setSlider(quality(), 3);
      await save();
      expect(actions.saveRating).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toBe(
        "Choose an Enjoyment score.",
      );
      expect(document.activeElement).toBe(enjoyment());
    });

    it("sends once both are chosen, a deliberate 5 included", async () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      fireEvent.click(quality());
      setSlider(enjoyment(), 9);
      await save();
      expect(sent()).toEqual({
        tmdb_id: "10999",
        quality: "5",
        enjoyment: "9",
        review: "",
        return_to: "/film/10999",
      });
    });

    // R23 (v7): after saving, the member comes back to this film's page.
    it("asks to come back to this film's page after saving", async () => {
      render(<RatingForm tmdbId={603} initialRating={null} />);
      setSlider(quality(), 6);
      setSlider(enjoyment(), 6);
      await save();
      expect(sent().return_to).toBe("/film/603");
    });
  });

  describe("the sliders (NFR12)", () => {
    // A native range input is used precisely so the browser supplies the
    // keyboard behaviour. jsdom does not act out key presses on a slider,
    // so these tests check what makes that behaviour possible: it is a real,
    // focusable range input, and it accepts every value the keys can reach.
    it("is a native range input that can take keyboard focus", () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      quality().focus();
      expect(document.activeElement).toBe(quality());
      expect(quality().tagName).toBe("INPUT");
      expect(quality().disabled).toBe(false);
    });

    it("can reach 0 and 10, and sends them", async () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      setSlider(quality(), 0);
      setSlider(enjoyment(), 10);
      expect(quality().value).toBe("0");
      expect(enjoyment().value).toBe("10");

      await save();
      expect(sent()).toMatchObject({ quality: "0", enjoyment: "10" });
    });

    it("says its value in words for screen readers", () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      setSlider(quality(), 7);
      expect(quality().getAttribute("aria-valuetext")).toBe("7 out of 10");
    });
  });

  describe("the placement preview", () => {
    it("follows the sliders before anything is saved", () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      const preview = () => screen.getByTestId("placement-preview").textContent;

      // A tap on the middle chooses 5 (E78).
      fireEvent.click(quality());
      fireEvent.click(enjoyment());
      expect(preview()).toContain(PLACEMENT_LABELS["on-the-fence"]); // 5/5

      setSlider(quality(), 8); // 8/5: one score on the line
      expect(preview()).toContain(PLACEMENT_LABELS.good);

      setSlider(enjoyment(), 9); // 8/9: both extreme
      expect(preview()).toContain(PLACEMENT_LABELS.masterpieces);

      setSlider(quality(), 6); // 6/9: not a corner
      expect(preview()).toContain(PLACEMENT_LABELS["worth-watching"]);

      expect(actions.saveRating).not.toHaveBeenCalled();
    });
  });

  describe("for a film the member has already rated (R19)", () => {
    const existing: RatingInput = {
      quality: 2,
      enjoyment: 9,
      review: "So bad it's good.",
    };

    it("pre-fills the sliders and the review", () => {
      render(<RatingForm tmdbId={10999} initialRating={existing} />);
      expect(quality().value).toBe("2");
      expect(enjoyment().value).toBe("9");
      expect(review().value).toBe("So bad it's good.");
      expect(screen.getByTestId("placement-preview").textContent).toContain(
        PLACEMENT_LABELS["guilty-pleasures"],
      );
    });

    it("calls the button 'Update rating' instead of 'Save rating'", () => {
      render(<RatingForm tmdbId={10999} initialRating={existing} />);
      expect(
        screen.getByRole("button", { name: "Update rating" }),
      ).toBeTruthy();
    });

    it("sends the edited values", async () => {
      render(<RatingForm tmdbId={10999} initialRating={existing} />);
      setSlider(quality(), 4);
      fireEvent.change(review(), { target: { value: "On reflection, no." } });

      await save();

      expect(sent()).toEqual({
        tmdb_id: "10999",
        quality: "4",
        enjoyment: "9",
        review: "On reflection, no.",
        return_to: "/film/10999",
      });
    });
  });

  describe("the review box (R17)", () => {
    it("counts characters towards the 500 limit", () => {
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      fireEvent.change(review(), { target: { value: "Great fun." } });
      expect(screen.getByText("10 / 500")).toBeTruthy();
      expect(review().maxLength).toBe(500);
    });
  });

  describe("when a save fails", () => {
    // E19: whatever went wrong, the typing is still there.
    it("shows an error and keeps the typed review and scores", async () => {
      actions.saveRating.mockResolvedValue({
        status: "error",
        message: "Your session expired. Sign in again to save.",
        values: { quality: "8", enjoyment: "3", review: "A long review." },
      });
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      setSlider(quality(), 8);
      setSlider(enjoyment(), 3);
      fireEvent.change(review(), { target: { value: "A long review." } });

      await save();

      expect(screen.getByRole("alert").textContent).toContain(
        "Your session expired",
      );
      expect(review().value).toBe("A long review.");
      expect(quality().value).toBe("8");
      expect(enjoyment().value).toBe("3");
    });

    // NFR15: the field at fault is marked for screen readers.
    it("marks the field the error is about", async () => {
      actions.saveRating.mockResolvedValue({
        status: "error",
        field: "review",
        message: "Reviews can be up to 500 characters. Yours is 501.",
        values: { quality: "5", enjoyment: "5", review: "x" },
      });
      render(<RatingForm tmdbId={10999} initialRating={null} />);
      // A tap on the middle chooses 5 (E78).
      fireEvent.click(quality());
      fireEvent.click(enjoyment());

      await save();

      expect(review().getAttribute("aria-invalid")).toBe("true");
      expect(quality().getAttribute("aria-invalid")).not.toBe("true");
    });
  });
});

describe("PlacementPreview", () => {
  afterEach(cleanup);

  it.each([
    [5, 5, "on-the-fence"],
    [8, 5, "good"],
    [5, 2, "not-enjoyable"],
    [9, 9, "masterpieces"],
    [6, 9, "worth-watching"],
    [0, 0, "dumpster-fires"],
  ] as const)("%i/%i reads as %s", (q, e, placement) => {
    render(<PlacementPreview quality={q} enjoyment={e} />);
    expect(screen.getByTestId("placement-preview").textContent).toContain(
      PLACEMENT_LABELS[placement],
    );
  });
});

describe("DeleteRatingButton (R21)", () => {
  const deleteButton = () =>
    screen.getByRole("button", { name: "Delete rating" });

  it("asks for confirmation before deleting anything", () => {
    render(<DeleteRatingButton titleId={42} filmTitle="Commando" />);

    fireEvent.click(deleteButton());

    expect(actions.deleteRating).not.toHaveBeenCalled();
    expect(screen.getByText(/delete your rating of Commando\?/i)).toBeTruthy();
  });

  it("does nothing when the member cancels", () => {
    render(<DeleteRatingButton titleId={42} filmTitle="Commando" />);
    fireEvent.click(deleteButton());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(actions.deleteRating).not.toHaveBeenCalled();
    // Back to the single button.
    expect(deleteButton()).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("deletes once confirmed, sending our id for the film", async () => {
    render(<DeleteRatingButton titleId={42} filmTitle="Commando" />);
    fireEvent.click(deleteButton());

    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: "Yes, delete" }).closest("form")!,
      );
    });

    expect(actions.deleteRating).toHaveBeenCalledTimes(1);
    expect(
      Object.fromEntries(actions.deleteRating.mock.calls[0][1].entries()),
    ).toEqual({ title_id: "42" });
  });

  it("shows the reason if the delete fails", async () => {
    actions.deleteRating.mockResolvedValue({
      status: "error",
      message: "That couldn't be deleted. Please try again.",
    });
    render(<DeleteRatingButton titleId={42} filmTitle="Commando" />);
    fireEvent.click(deleteButton());

    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: "Yes, delete" }).closest("form")!,
      );
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "couldn't be deleted",
    );
  });
});
