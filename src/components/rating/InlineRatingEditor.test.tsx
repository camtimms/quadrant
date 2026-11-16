// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuadrantChart } from "@/components/chart/QuadrantChart";
import { FilmList, type ListFilm } from "@/components/film/FilmList";
import { PLACEMENT_LABELS } from "@/lib/quadrant";
import type { RatingFormState } from "@/lib/validation/rating";
import { InlineRatingEditor } from "./InlineRatingEditor";

// The save action is replaced with a stand-in that records what was sent.
const actions = vi.hoisted(() => ({
  saveRating:
    vi.fn<(previous: unknown, data: FormData) => Promise<RatingFormState>>(),
  deleteRating: vi.fn(),
}));
vi.mock("@/app/(app)/actions/rating", () => actions);

const FILM: ListFilm = {
  tmdbId: 10999,
  title: "Commando",
  year: 1985,
  posterPath: null,
  point: { quality: 5, enjoyment: 5 },
  ratedAt: "2026-11-01T10:00:00Z",
  changedAt: "2026-11-01T10:00:00Z",
};

const open = () =>
  fireEvent.click(screen.getByRole("button", { name: /update scores/i }));
const quality = () =>
  screen.getByRole("slider", { name: /quality/i }) as HTMLInputElement;
const enjoyment = () =>
  screen.getByRole("slider", { name: /enjoyment/i }) as HTMLInputElement;
const setSlider = (slider: HTMLInputElement, value: number) =>
  fireEvent.change(slider, { target: { value: String(value) } });

async function pressSave() {
  await act(async () => {
    fireEvent.submit(
      screen.getByRole("button", { name: "Save" }).closest("form")!,
    );
  });
}

function sent(): Record<string, FormDataEntryValue> {
  expect(actions.saveRating).toHaveBeenCalledTimes(1);
  return Object.fromEntries(actions.saveRating.mock.calls[0][1].entries());
}

beforeEach(() => {
  actions.saveRating.mockResolvedValue({ status: "idle" });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("InlineRatingEditor (R51)", () => {
  it("starts closed, as one button naming the film", () => {
    render(<InlineRatingEditor film={FILM} returnTo="/" />);

    expect(screen.queryByRole("slider")).toBeNull();
    // Several of these sit in one list, so each says which film it is for.
    expect(
      screen.getByRole("button", { name: "Update scores for Commando" }),
    ).toBeTruthy();
  });

  // Step 1 of "open, drag, save".
  it("opens the sliders, already set to the current scores", () => {
    render(
      <InlineRatingEditor
        film={{ ...FILM, point: { quality: 3, enjoyment: 9 } }}
        returnTo="/"
      />,
    );

    open();

    expect(quality().value).toBe("3");
    expect(enjoyment().value).toBe("9");
    expect(screen.getByTestId("placement-preview").textContent).toContain(
      PLACEMENT_LABELS["cheap-thrills"],
    );
  });

  // E14: a film scored 0 opens at 0, not at the default 5.
  it("opens at 0 for a film scored 0", () => {
    render(
      <InlineRatingEditor
        film={{ ...FILM, point: { quality: 0, enjoyment: 0 } }}
        returnTo="/"
      />,
    );
    open();
    expect(quality().value).toBe("0");
    expect(enjoyment().value).toBe("0");
  });

  // A slider is easy to brush on a phone, so moving one must not save.
  it("saves nothing while the sliders are moved", () => {
    render(<InlineRatingEditor film={FILM} returnTo="/" />);
    open();

    setSlider(quality(), 8);
    setSlider(enjoyment(), 7);

    expect(actions.saveRating).not.toHaveBeenCalled();
    expect(screen.getByTestId("placement-preview").textContent).toContain(
      PLACEMENT_LABELS["worth-watching"],
    );
  });

  // Steps 2 and 3.
  it("sends the new scores when Save is pressed", async () => {
    render(<InlineRatingEditor film={FILM} returnTo="/?filter=on-the-fence" />);
    open();
    setSlider(quality(), 8);
    setSlider(enjoyment(), 7);

    await pressSave();

    expect(sent()).toEqual({
      tmdb_id: "10999",
      quality: "8",
      enjoyment: "7",
      // Where to come back to, so the member's filter is kept.
      return_to: "/?filter=on-the-fence",
    });
  });

  // The editor has no review box. Leaving the field out altogether is how
  // it tells the server "leave the review as it is".
  it("does not send a review at all, so the existing one is kept", async () => {
    render(<InlineRatingEditor film={FILM} returnTo="/" />);
    open();
    await pressSave();
    expect("review" in sent()).toBe(false);
  });

  it("puts the old scores back when cancelled", () => {
    render(<InlineRatingEditor film={FILM} returnTo="/" />);
    open();
    setSlider(quality(), 9);
    setSlider(enjoyment(), 1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(actions.saveRating).not.toHaveBeenCalled();
    expect(screen.queryByRole("slider")).toBeNull();

    // Opening again shows the stored scores, not the abandoned ones.
    open();
    expect(quality().value).toBe("5");
    expect(enjoyment().value).toBe("5");
  });

  it("shows the reason, and keeps the chosen scores, if the save fails", async () => {
    actions.saveRating.mockResolvedValue({
      status: "error",
      message: "Your session expired. Sign in again to save.",
      values: { quality: "8", enjoyment: "7", review: "" },
    });
    render(<InlineRatingEditor film={FILM} returnTo="/" />);
    open();
    setSlider(quality(), 8);
    setSlider(enjoyment(), 7);

    await pressSave();

    expect(screen.getByRole("alert").textContent).toContain(
      "Your session expired",
    );
    expect(quality().value).toBe("8");
    expect(enjoyment().value).toBe("7");
  });

  // Two editors can be open on one page. Each slider's label must point at
  // its own slider, which needs every id on the page to be different.
  it("gives every slider on the page its own id", () => {
    render(
      <>
        <InlineRatingEditor film={FILM} returnTo="/" />
        <InlineRatingEditor
          film={{ ...FILM, tmdbId: 2, title: "Heat" }}
          returnTo="/"
        />
      </>,
    );
    for (const button of screen.getAllByRole("button", {
      name: /update scores/i,
    })) {
      fireEvent.click(button);
    }

    const ids = screen.getAllByRole("slider").map((slider) => slider.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });
});

describe("where the editor appears", () => {
  describe("in the film list", () => {
    it("is offered on each film when the list is the member's own", () => {
      render(<FilmList films={[FILM]} editReturnTo="/" />);
      const row = screen.getByRole("listitem");
      expect(
        within(row).getByRole("button", { name: /update scores/i }),
      ).toBeTruthy();
    });

    // R46: another member's films are read-only.
    it("is absent when viewing another member's films", () => {
      render(<FilmList films={[FILM]} />);
      expect(
        screen.queryByRole("button", { name: /update scores/i }),
      ).toBeNull();
    });

    // The button must not be INSIDE the link to the film's page, or pressing
    // it would also follow the link.
    it("sits beside the link to the film, not inside it", () => {
      render(<FilmList films={[FILM]} editReturnTo="/" />);
      const button = screen.getByRole("button", { name: /update scores/i });
      expect(button.closest("a")).toBeNull();
    });
  });

  describe("in the chart's point panel", () => {
    it("is offered when the chart is the member's own", () => {
      render(
        <QuadrantChart
          films={[FILM]}
          initialSelectedId={10999}
          editReturnTo="/"
        />,
      );
      const panel = screen.getByRole("region", { name: /selected/i });
      fireEvent.click(
        within(panel).getByRole("button", { name: /update scores/i }),
      );
      expect(within(panel).getAllByRole("slider")).toHaveLength(2);
    });

    it("is absent when viewing another member's chart", () => {
      render(<QuadrantChart films={[FILM]} initialSelectedId={10999} />);
      const panel = screen.getByRole("region", { name: /selected/i });
      expect(
        within(panel).queryByRole("button", { name: /update scores/i }),
      ).toBeNull();
    });
  });

  // After a save the page redraws with the film's new "changedAt". That
  // must close the editor, even when the scores came back the same.
  it("closes after a save, when the film comes back changed", () => {
    const { rerender } = render(<FilmList films={[FILM]} editReturnTo="/" />);
    open();
    expect(screen.getAllByRole("slider")).toHaveLength(2);

    rerender(
      <FilmList
        films={[{ ...FILM, changedAt: "2026-11-14T12:00:00Z" }]}
        editReturnTo="/"
      />,
    );

    expect(screen.queryByRole("slider")).toBeNull();
  });
});

// R65: the row lays itself out around this mark, giving the open editor
// the full width under the film.
describe("InlineRatingEditor marks itself open (R65)", () => {
  it("carries the mark only while open", () => {
    render(<InlineRatingEditor film={FILM} returnTo="/" />);
    expect(document.querySelector("[data-editor-open]")).toBeNull();

    open();

    expect(document.querySelector("[data-editor-open]")).not.toBeNull();
  });
});
