"use client";

// "use client" because this component uses React hooks: one to react to
// what the server action returns, one to follow the checkbox. The saving
// itself still happens on the server.

import { useActionState, useState } from "react";
import { saveDisplayName } from "@/app/(app)/actions/profile";
import { Avatar } from "@/components/Avatar";
import {
  buttonMain,
  errorText,
  focusRing,
  mutedText,
  textField,
} from "@/components/ui/styles";
import {
  DISPLAY_NAME_MAX_LENGTH,
  type DisplayNameFormState,
} from "@/lib/validation/profile";

type Props = {
  /** What the field starts with: the current name, or a suggestion. */
  initialName: string;
  submitLabel: string;
  /** The member's stored choice; true for someone signing in for the first time. */
  showPicture: boolean;
  /** The member's own Google picture, or null if their account has none. */
  pictureUrl: string | null;
};

export function DisplayNameForm({
  initialName,
  submitLabel,
  showPicture,
  pictureUrl,
}: Props) {
  // useActionState connects a form to a server action:
  //   state      what the action returned last time (starts as {})
  //   formAction what to hand to <form action={...}>
  //   isPending  true while the request is in flight
  const [state, formAction, isPending] = useActionState<
    DisplayNameFormState,
    FormData
  >(saveDisplayName, {});

  // The checkbox is followed here so the picture beside it can change the
  // moment it is ticked or unticked: the member sees what friends will see
  // before saving anything.
  const [wantsPicture, setWantsPicture] = useState(showPicture);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="display_name" className="font-medium">
        Display name
      </label>
      <input
        id="display_name"
        name="display_name"
        type="text"
        // After a failed save, refill the field with what was typed so
        // nothing is lost (the action returns it as state.value).
        defaultValue={state.value ?? initialName}
        // key forces React to rebuild the input when the returned value
        // changes; defaultValue is otherwise only read once.
        key={state.value ?? initialName}
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        required
        autoComplete="nickname"
        // These two link the error text to the field for screen readers.
        aria-invalid={state.message ? true : undefined}
        aria-describedby="display_name_help"
        className={textField}
      />
      <p id="display_name_help" className={`text-sm ${mutedText}`}>
        Shown to your friends beside your ratings. Up to{" "}
        {DISPLAY_NAME_MAX_LENGTH} characters.
      </p>

      {/* The picture choice (R63). The preview shows exactly what friends
          will see beside the member's name: their Google picture, or their
          initial when the box is unticked. */}
      <div className="mt-2 flex items-start gap-3">
        <Avatar
          name={initialName}
          url={wantsPicture ? pictureUrl : null}
          size="md"
        />
        <div className="flex flex-col gap-1">
          {/* Wrapping the checkbox in its <label> makes the words part of
              the target: tapping the text ticks the box. */}
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              // A browser sends a ticked checkbox as show_picture=on and
              // leaves an unticked one out of the form altogether.
              name="show_picture"
              checked={wantsPicture}
              onChange={(event) => setWantsPicture(event.target.checked)}
              aria-describedby="show_picture_help"
              // accent-ink: the browser draws its own tick box in the text
              // colour, which reads on both modes (the yellow would not on
              // cream).
              className={`h-4 w-4 accent-ink ${focusRing}`}
            />
            Show my Google picture to friends
          </label>
          <p id="show_picture_help" className={`text-sm ${mutedText}`}>
            {pictureUrl
              ? "If this is off, friends see the first letter of your name instead."
              : "Your Google account has no picture, so friends see the first letter of your name. If you add one, this decides whether it is shown."}
          </p>
        </div>
      </div>

      {state.message ? (
        // role="alert" makes screen readers announce the problem (NFR15).
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={isPending} className={buttonMain}>
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
