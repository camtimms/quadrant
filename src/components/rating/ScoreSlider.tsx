import { useId } from "react";
import { SCORE_MAX, SCORE_MIN } from "@/lib/validation/rating";

type Props = {
  /** The form field name the server action reads: "quality" or "enjoyment". */
  name: "quality" | "enjoyment";
  /** The visible name of the scale, e.g. "Quality". */
  label: string;
  /** One line under the label saying what the scale measures. */
  hint: string;
  value: number;
  onChange: (value: number) => void;
  /** The words at the two ends, from SCALE_END_LABELS (e.g. Bad, Good). */
  lowLabel: string;
  highLabel: string;
  /** True when the server said this field was the problem. */
  invalid?: boolean;
};

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
}: Props) {
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
          className="text-2xl font-semibold tabular-nums"
        >
          {value}
        </span>
      </div>
      <p id={`${id}_hint`} className="text-sm opacity-70">
        {hint}
        {/* "sr-only" text is invisible on screen but read by screen
            readers. Sighted members see the same words under the slider. */}
        <span className="sr-only">
          {" "}
          {SCORE_MIN} is {lowLabel}, {SCORE_MAX} is {highLabel}.
        </span>
      </p>
      <input
        id={id}
        name={name}
        type="range"
        min={SCORE_MIN}
        max={SCORE_MAX}
        step={1}
        value={value}
        // A slider's value arrives as text ("7"); the rest of the form
        // works in numbers.
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby={`${id}_hint`}
        // Read out as "7 out of 10" rather than a bare "7".
        aria-valuetext={`${value} out of ${SCORE_MAX}`}
        aria-invalid={invalid ? true : undefined}
        // h-11 gives a finger-sized target on a phone; accent-color tints
        // the browser's own slider to match the text colour.
        className="h-11 w-full cursor-pointer accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
      />
      {/* The ends of the scale, in words (R49). Hidden from screen readers
          only because the hint above already tells them the same thing. */}
      <div
        aria-hidden="true"
        className="flex justify-between text-sm opacity-70"
      >
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
