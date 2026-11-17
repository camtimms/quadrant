import { useId, type Ref } from "react";
import { SCORE_MAX, SCORE_MIN } from "@/lib/validation/rating";

type Props = {
  /** The form field name the server action reads: "quality" or "enjoyment". */
  name: "quality" | "enjoyment";
  /** The visible name of the scale, e.g. "Quality". */
  label: string;
  /** One line under the label saying what the scale measures. */
  hint: string;
  /** The chosen score, or null while the member has not chosen one (R92). */
  value: number | null;
  onChange: (value: number) => void;
  /** The words at the two ends, from SCALE_END_LABELS (e.g. Bad, Good). */
  lowLabel: string;
  highLabel: string;
  /** True when this field is the problem (the server's, or the form's). */
  invalid?: boolean;
  /** Lets the form move focus here when this score is missing (R93). */
  inputRef?: Ref<HTMLInputElement>;
};

/** Where an unset slider rests. Hidden, so it is never mistaken for a 5. */
const RESTING = 5;

/** How an unset slider looks: an even line, no handle (design 26). */
const UNSET_LOOK = [
  "appearance-none bg-transparent",
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-edge",
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-edge",
  // The handle keeps a real size, only see-through: with no size, Chrome
  // cannot work out where a tap lands and reads every tap as 0.
  "[&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:opacity-0",
  "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:opacity-0",
].join(" ");

/**
 * One 0–10 score, chosen with a slider (R49).
 *
 * This is the browser's own slider, <input type="range">, not a hand-built
 * one. That is a deliberate choice: the browser already makes it work with
 * the arrow keys, Home and End, a mouse and a finger, and announces it
 * properly to screen readers (NFR12). A custom slider would have to rebuild
 * all of that, and would probably miss something.
 */
export function ScoreSlider({
  name,
  label,
  hint,
  value,
  onChange,
  lowLabel,
  highLabel,
  invalid = false,
  inputRef,
}: Props) {
  const isSet = value !== null;
  // useId() gives an id that is unique on the page. A fixed id such as
  // "score_quality" would be shared by every slider of that kind, and once
  // two rating forms are open at once (the in-place editors on My films), a
  // label would point at the wrong slider.
  const id = `${useId()}_${name}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {/* The number is shown as text because a slider on its own only
            shows roughly where it is. A 0 is shown as 0, never as blank.
            Hidden from screen readers, which get the same number from the
            slider itself (aria-valuetext below). */}
        <span
          aria-hidden="true"
          data-testid={`${name}-value`}
          className={`text-2xl font-semibold tabular-nums ${isSet ? "" : "text-ink-muted"}`}
        >
          {/* "–" while unset (R92). */}
          {isSet ? value : "–"}
        </span>
      </div>
      <p id={`${id}_hint`} className="text-sm text-ink-muted">
        {hint}
        {/* "sr-only" text is invisible on screen but read by screen
            readers. Sighted members see the same words under the slider. */}
        <span className="sr-only">
          {" "}
          {SCORE_MIN} is {lowLabel}, {SCORE_MAX} is {highLabel}.
        </span>
      </p>
      <input
        ref={inputRef}
        id={id}
        // No name while unset: a form sent like that carries no score at
        // all, and the server refuses it as a missing field (design 26).
        name={isSet ? name : undefined}
        type="range"
        min={SCORE_MIN}
        max={SCORE_MAX}
        step={1}
        value={value ?? RESTING}
        // A slider's value arrives as text ("7"); the rest of the form
        // works in numbers.
        onChange={(event) => onChange(Number(event.target.value))}
        // E78: a tap where the value would not change (the middle, while
        // unset) fires no change event, so a click on an unset slider takes
        // its value too. Arrow keys and drags arrive as changes.
        onClick={(event) => {
          if (!isSet) onChange(Number(event.currentTarget.value));
        }}
        aria-describedby={`${id}_hint`}
        // Read out as "7 out of 10" rather than a bare "7".
        aria-valuetext={isSet ? `${value} out of ${SCORE_MAX}` : "Not set"}
        aria-invalid={invalid ? true : undefined}
        // h-11 gives a finger-sized target on a phone; accent-color tints
        // the browser's own slider to match the text colour.
        // accent-color tints the browser's own slider: dark ink on cream, the
        // yellow on black, so the thumb can be seen in either mode (17.4).
        // While unset, the handle is see-through (both browser families'
        // own names for it), so nothing suggests a score was chosen.
        // While unset, the browser's own drawing is switched off
        // (appearance-none) and replaced by one even line with no handle, so
        // nothing reads as "half way" or as a chosen 5. Its "track" and
        // "thumb" are the slider's parts, named differently by Chrome/Safari
        // (-webkit-) and Firefox (-moz-). It is still the same slider: taps,
        // drags and keys work exactly as before.
        className={`h-11 w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
          isSet ? "accent-ink dark:accent-accent" : UNSET_LOOK
        }`}
      />
      {/* The ends of the scale, in words (R49). Hidden from screen readers
          only because the hint above already tells them the same thing. */}
      <div
        aria-hidden="true"
        className="flex justify-between text-sm text-ink-muted"
      >
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
