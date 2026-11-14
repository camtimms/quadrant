"use client";

// "use client" because the sliders, the live placement preview and the
// character count all react to the member's input in the browser. The saving
// itself is a Server Action and still happens on the server.

import { useActionState, useState } from "react";
import { saveRating } from "@/app/(app)/actions/rating";
import { PlacementPreview } from "@/components/rating/PlacementPreview";
import { ScoreSlider } from "@/components/rating/ScoreSlider";
import { PLACEMENT_LABELS, SCALE_END_LABELS } from "@/lib/quadrant";
import {
  REVIEW_MAX_LENGTH,
  type RatingFormState,
  type RatingInput,
} from "@/lib/validation/rating";
import { characterCount } from "@/lib/validation/text";

type Props = {
  /** TMDB's id for the film being rated. */
  tmdbId: number;
  /** The member's existing rating, or null if they have not rated the film. */
  initialRating: RatingInput | null;
};

/** R49: both sliders start in the middle. A 5 left alone is a real 5. */
const DEFAULT_SCORE = 5;

/**
 * The rating form: two sliders, an optional review, and a Save button.
 *
 * Every input is "controlled": its current value lives in React state
 * (useState) and the input simply displays it. That is what lets the
 * placement preview follow the sliders, and it has a second benefit: a
 * failed save cannot lose what was typed, because the values are held here
 * and not only in the form that was submitted (E19).
 *
 * Nothing is saved until Save is pressed. A slider is easy to brush by
 * accident on a phone, so moving one never saves by itself.
 */
export function RatingForm({ tmdbId, initialRating }: Props) {
  const [quality, setQuality] = useState<number>(
    initialRating?.quality ?? DEFAULT_SCORE,
  );
  const [enjoyment, setEnjoyment] = useState<number>(
    initialRating?.enjoyment ?? DEFAULT_SCORE,
  );
  const [review, setReview] = useState(initialRating?.review ?? "");

  // useActionState connects the form to the server action:
  //   state      what the action returned last time
  //   formAction what to hand to <form action={...}>
  //   isPending  true while the request is in flight
  const [state, formAction, isPending] = useActionState<
    RatingFormState,
    FormData
  >(saveRating, { status: "idle" });

  const errorField = state.status === "error" ? state.field : undefined;
  const reviewLength = characterCount(review);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Which film this is. Hidden because the member does not type it,
          but the server still treats it as untrusted, like everything else. */}
      <input type="hidden" name="tmdb_id" value={tmdbId} />

      <ScoreSlider
        name="quality"
        label="Quality"
        hint="How good is it as a film?"
        value={quality}
        onChange={setQuality}
        lowLabel={SCALE_END_LABELS.quality.low}
        highLabel={SCALE_END_LABELS.quality.high}
        invalid={errorField === "quality"}
      />
      <ScoreSlider
        name="enjoyment"
        label="Enjoyment"
        hint="How much did you enjoy watching it?"
        value={enjoyment}
        onChange={setEnjoyment}
        lowLabel={SCALE_END_LABELS.enjoyment.low}
        highLabel={SCALE_END_LABELS.enjoyment.high}
        invalid={errorField === "enjoyment"}
      />

      <PlacementPreview quality={quality} enjoyment={enjoyment} />

      <div className="flex flex-col gap-1">
        <label htmlFor="review" className="font-medium">
          Review <span className="font-normal opacity-70">(optional)</span>
        </label>
        <textarea
          id="review"
          name="review"
          rows={4}
          value={review}
          onChange={(event) => setReview(event.target.value)}
          // The browser stops typing at the limit; the server checks again.
          maxLength={REVIEW_MAX_LENGTH}
          aria-describedby="review_count"
          aria-invalid={errorField === "review" ? true : undefined}
          className="rounded border border-foreground/30 bg-transparent px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <p id="review_count" className="text-sm tabular-nums opacity-70">
          {reviewLength} / {REVIEW_MAX_LENGTH}
        </p>
      </div>

      {state.status === "error" ? (
        // role="alert" makes screen readers announce the problem (NFR15).
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {state.message}
        </p>
      ) : null}

      {/* role="status" is the calmer cousin of "alert", for good news. The
          element is always present so that its text CHANGING is what gets
          announced. R23: say where the film landed. */}
      <p role="status" className="text-sm">
        {state.status === "saved" && !isPending
          ? `Saved. ${state.rating.quality} / ${state.rating.enjoyment} is ${PLACEMENT_LABELS[state.placement]}.`
          : ""}
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-foreground px-4 py-2 font-medium text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {isPending
          ? "Saving…"
          : initialRating
            ? "Update rating"
            : "Save rating"}
      </button>
    </form>
  );
}
