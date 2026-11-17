"use client";

// "use client" because the sliders, the live placement preview and the
// character count all react to the member's input in the browser. The saving
// itself is a Server Action and still happens on the server.

import { useActionState, useRef, useState, type FormEvent } from "react";
import { saveRating } from "@/app/(app)/actions/rating";
import { PlacementPreview } from "@/components/rating/PlacementPreview";
import { ScoreSlider } from "@/components/rating/ScoreSlider";
import { buttonMain, errorText, textField } from "@/components/ui/styles";
import { SCALE_END_LABELS } from "@/lib/quadrant";
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
  /**
   * Log a rewatch instead of editing (R83): the sliders start from the
   * current scores, the review starts empty (it is a new viewing), and the
   * action is told to keep the current rating as an earlier viewing.
   */
  rewatch?: boolean;
};

/**
 * The rating form: two sliders, an optional review, and a Save button.
 *
 * Every input is "controlled": its current value lives in React state
 * (useState) and the input simply displays it. That is what lets the
 * placement preview follow the sliders, and it has a second benefit: a
 * failed save cannot lose what was typed, because the values are held here
 * and not only in the form that was submitted (E19).
 *
 * A successful save does not come back as an answer here: the action sends
 * the member back to this film's page, which draws itself afresh with the
 * new rating folded away and "Saved" beside it (R23).
 *
 * Nothing is saved until Save is pressed. A slider is easy to brush by
 * accident on a phone, so moving one never saves by itself.
 */
export function RatingForm({ tmdbId, initialRating, rewatch = false }: Props) {
  // R92: a new rating starts with nothing chosen (null). An edit or a
  // rewatch starts from the member's current scores.
  const [quality, setQualityValue] = useState<number | null>(
    initialRating?.quality ?? null,
  );
  const [enjoyment, setEnjoymentValue] = useState<number | null>(
    initialRating?.enjoyment ?? null,
  );
  // R93: which scores the member tried to save without choosing, and the
  // message saying so. Cleared as soon as a score is chosen.
  const [missing, setMissing] = useState<{
    quality: boolean;
    enjoyment: boolean;
  } | null>(null);
  const qualityInput = useRef<HTMLInputElement>(null);
  const enjoymentInput = useRef<HTMLInputElement>(null);
  const setQuality = (value: number) => {
    setQualityValue(value);
    setMissing(null);
  };
  const setEnjoyment = (value: number) => {
    setEnjoymentValue(value);
    setMissing(null);
  };

  /**
   * Stop a save with a score not chosen (R93). Calling preventDefault()
   * keeps the form from being sent at all; the server would refuse it
   * anyway (the score is missing), but this way the member is told at once,
   * and which one, without a round trip.
   */
  const checkScores = (event: FormEvent<HTMLFormElement>) => {
    if (quality !== null && enjoyment !== null) return;
    event.preventDefault();
    setMissing({ quality: quality === null, enjoyment: enjoyment === null });
    (quality === null ? qualityInput : enjoymentInput).current?.focus();
  };
  const missingMessage = missing
    ? missing.quality && missing.enjoyment
      ? "Choose both scores."
      : missing.quality
        ? "Choose a Quality score."
        : "Choose an Enjoyment score."
    : null;
  const [review, setReview] = useState(
    rewatch ? "" : (initialRating?.review ?? ""),
  );
  // The review box's id, unique per mode, so its label always points at
  // the right box.
  const reviewId = rewatch ? "rewatch_review" : "review";

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
    <form
      action={formAction}
      onSubmit={checkScores}
      className="flex flex-col gap-5"
    >
      {/* Which film this is. Hidden because the member does not type it,
          but the server still treats it as untrusted, like everything else. */}
      <input type="hidden" name="tmdb_id" value={tmdbId} />
      {/* Where to land after saving: this same film's page (R23, v7). The
          action adds "?rated=" to it, which is how the page knows to say
          "Saved". The server only accepts a path on this site. */}
      <input type="hidden" name="return_to" value={`/film/${tmdbId}`} />
      {rewatch ? <input type="hidden" name="rewatch" value="1" /> : null}

      <ScoreSlider
        name="quality"
        label="Quality"
        hint="How good is it as a film?"
        value={quality}
        onChange={setQuality}
        lowLabel={SCALE_END_LABELS.quality.low}
        highLabel={SCALE_END_LABELS.quality.high}
        invalid={errorField === "quality" || Boolean(missing?.quality)}
        inputRef={qualityInput}
      />
      <ScoreSlider
        name="enjoyment"
        label="Enjoyment"
        hint="How much did you enjoy watching it?"
        value={enjoyment}
        onChange={setEnjoyment}
        lowLabel={SCALE_END_LABELS.enjoyment.low}
        highLabel={SCALE_END_LABELS.enjoyment.high}
        invalid={errorField === "enjoyment" || Boolean(missing?.enjoyment)}
        inputRef={enjoymentInput}
      />

      <PlacementPreview quality={quality} enjoyment={enjoyment} />

      <div className="flex flex-col gap-1">
        <label htmlFor={reviewId} className="font-medium">
          Review <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <textarea
          id={reviewId}
          name="review"
          rows={4}
          value={review}
          onChange={(event) => setReview(event.target.value)}
          // The browser stops typing at the limit; the server checks again.
          maxLength={REVIEW_MAX_LENGTH}
          aria-describedby={`${reviewId}_count`}
          aria-invalid={errorField === "review" ? true : undefined}
          className={textField}
        />
        <p
          id={`${reviewId}_count`}
          className="text-sm tabular-nums text-ink-muted"
        >
          {reviewLength} / {REVIEW_MAX_LENGTH}
        </p>
      </div>

      {missingMessage ? (
        // role="alert" makes screen readers announce the problem (NFR15).
        <p role="alert" className={errorText}>
          {missingMessage}
        </p>
      ) : state.status === "error" ? (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className={`${buttonMain} self-start`}
      >
        {isPending
          ? "Saving…"
          : rewatch
            ? "Log rewatch"
            : initialRating
              ? "Update rating"
              : "Save rating"}
      </button>
    </form>
  );
}
