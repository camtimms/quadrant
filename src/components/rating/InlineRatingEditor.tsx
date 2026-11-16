"use client";

// "use client" because it opens and closes, and its sliders react to input.

import { useActionState, useState } from "react";
import { saveRating } from "@/app/(app)/actions/rating";
import { Spinner } from "@/components/Spinner";
import { PlacementPreview } from "@/components/rating/PlacementPreview";
import { ScoreSlider } from "@/components/rating/ScoreSlider";
import {
  buttonMain,
  buttonSecondary,
  errorText,
  pillSmall,
} from "@/components/ui/styles";
import type { Point } from "@/lib/quadrant";
import { SCALE_END_LABELS } from "@/lib/quadrant";
import type { RatingFormState } from "@/lib/validation/rating";

type Props = {
  /** The film, and the member's current scores for it. */
  film: { tmdbId: number; title: string; point: Point };
  /**
   * The page to come back to after saving, e.g. "/?filter=on-the-fence".
   * Keeping the filter lets a member work down a filtered list, fixing one
   * film after another.
   */
  returnTo: string;
};

/**
 * Change a film's two scores without leaving the page (R51): open, drag,
 * save. Used under each film in the member's own list and in the chart's
 * point panel.
 *
 * It is the quick route for one job: correcting scores. It has no review
 * box, and it does not SEND a review either, which is how the server knows
 * to leave the existing review alone. To change the review, the member
 * opens the film's page.
 *
 * Nothing is saved until Save is pressed. Cancelling simply closes it; the
 * abandoned slider positions lived only inside the open editor, so opening
 * it again starts from the stored scores.
 */
export function InlineRatingEditor({ film, returnTo }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        // Several of these sit in one list. The visible text is short; the
        // label a screen reader hears says which film it is for.
        aria-label={`Update scores for ${film.title}`}
        className={pillSmall}
      >
        Update scores
      </button>
    );
  }

  return (
    <OpenEditor
      film={film}
      returnTo={returnTo}
      onCancel={() => setIsOpen(false)}
    />
  );
}

/**
 * The open state, as its own component so that its slider positions are
 * created when it opens and thrown away when it closes. That is all "cancel
 * restores the old values" takes.
 */
function OpenEditor({
  film,
  returnTo,
  onCancel,
}: Props & { onCancel: () => void }) {
  const [quality, setQuality] = useState(film.point.quality);
  const [enjoyment, setEnjoyment] = useState(film.point.enjoyment);
  const [state, formAction, isPending] = useActionState<
    RatingFormState,
    FormData
  >(saveRating, { status: "idle" });

  return (
    <form
      action={formAction}
      aria-label={`Update scores for ${film.title}`}
      // A mark the row's layout looks for, to give the open editor the
      // full width under the film (see rowLayout.ts, R65).
      data-editor-open=""
      // An inset panel in the page colour, so the open editor stands apart
      // from the white (or dark grey) list card around it.
      className="flex w-full flex-col gap-4 rounded-xl bg-page p-3"
    >
      <input type="hidden" name="tmdb_id" value={film.tmdbId} />
      <input type="hidden" name="return_to" value={returnTo} />
      {/* Deliberately no "review" field: see the note above. */}

      <ScoreSlider
        name="quality"
        label="Quality"
        hint="How good is it as a film?"
        value={quality}
        onChange={setQuality}
        lowLabel={SCALE_END_LABELS.quality.low}
        highLabel={SCALE_END_LABELS.quality.high}
        invalid={state.status === "error" && state.field === "quality"}
      />
      <ScoreSlider
        name="enjoyment"
        label="Enjoyment"
        hint="How much did you enjoy watching it?"
        value={enjoyment}
        onChange={setEnjoyment}
        lowLabel={SCALE_END_LABELS.enjoyment.low}
        highLabel={SCALE_END_LABELS.enjoyment.high}
        invalid={state.status === "error" && state.field === "enjoyment"}
      />

      <PlacementPreview quality={quality} enjoyment={enjoyment} />

      {state.status === "error" ? (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className={`${buttonMain} text-sm`}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className={`${buttonSecondary} text-sm`}
        >
          Cancel
        </button>
        {isPending ? <Spinner /> : null}
      </div>
    </form>
  );
}
