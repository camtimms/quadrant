"use client";

// "use client" because this component uses React hooks: one to react to
// what the server action returns, others to follow the picture choice and
// whether the cropper is open. The saving itself happens on the server.

import { useActionState, useState, useTransition } from "react";
import { removePicture } from "@/app/(app)/actions/picture";
import { saveDisplayName } from "@/app/(app)/actions/profile";
import { Avatar } from "@/components/Avatar";
import { PictureCropper } from "@/components/profile/PictureCropper";
import {
  buttonMain,
  buttonSecondary,
  errorText,
  focusRing,
  mutedText,
  textField,
} from "@/components/ui/styles";
import {
  DISPLAY_NAME_MAX_LENGTH,
  type DisplayNameFormState,
  type PictureChoice,
} from "@/lib/validation/profile";

type Props = {
  /** What the field starts with: the current name, or a suggestion. */
  initialName: string;
  submitLabel: string;
  /** The member's stored choice (R79); "google" for a first visit. */
  pictureChoice: PictureChoice;
  /** The member's own Google picture, or null if their account has none. */
  googlePicture: string | null;
  /** The address of their uploaded picture, or null if they have none. */
  ownPicture: string | null;
};

/**
 * The member's display name and which picture friends see beside it (R7,
 * R79, design 23.4): their Google picture, their own uploaded picture, or
 * just their initial. A preview shows exactly what friends will see.
 */
export function DisplayNameForm({
  initialName,
  submitLabel,
  pictureChoice,
  googlePicture,
  ownPicture,
}: Props) {
  // useActionState connects a form to a server action:
  //   state      what the action returned last time (starts as {})
  //   formAction what to hand to <form action={...}>
  //   isPending  true while the request is in flight
  const [state, formAction, isPending] = useActionState<
    DisplayNameFormState,
    FormData
  >(saveDisplayName, {});

  // The choice is followed here so the preview changes the moment another
  // is picked, before anything is saved.
  const [chosen, setChosen] = useState<PictureChoice>(
    state.pictureChoice ?? pictureChoice,
  );
  const [cropping, setCropping] = useState(false);
  const [removing, startRemoving] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);

  const previewUrl =
    chosen === "google"
      ? googlePicture
      : chosen === "upload"
        ? ownPicture
        : null;

  const options: {
    value: PictureChoice;
    label: string;
    disabled: boolean;
    hint?: string;
  }[] = [
    {
      value: "google",
      label: "My Google picture",
      disabled: googlePicture === null,
      hint:
        googlePicture === null
          ? "Your Google account has no picture."
          : undefined,
    },
    {
      value: "upload",
      label: "My own picture",
      // E69: something must be uploaded first.
      disabled: ownPicture === null,
    },
    { value: "initial", label: "Just my initial", disabled: false },
  ];

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

      {/* R79: one choice of three. A fieldset with a legend is how a group
          of radio buttons is named for screen readers. */}
      <fieldset className="mt-2 flex flex-col gap-3">
        <legend className="mb-2 font-medium">Picture your friends see</legend>
        <div className="flex items-center gap-3">
          <span data-testid="picture-preview">
            <Avatar name={initialName} url={previewUrl} size="md" />
          </span>
          <span className={`text-sm ${mutedText}`}>
            What your friends will see
          </span>
        </div>

        {options.map((option) => (
          <div key={option.value} className="flex flex-col gap-1">
            <label
              className={`flex items-center gap-2 ${option.disabled ? mutedText : ""}`}
            >
              <input
                type="radio"
                name="picture"
                value={option.value}
                checked={chosen === option.value}
                disabled={option.disabled}
                onChange={() => setChosen(option.value)}
                // accent-ink: the browser's own radio drawn in the text
                // colour, which reads in both modes.
                className={`h-4 w-4 accent-ink ${focusRing}`}
              />
              {option.label}
            </label>
            {option.hint ? (
              <p className={`ml-6 text-sm ${mutedText}`}>{option.hint}</p>
            ) : null}
            {option.value === "upload" ? (
              <div className="ml-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCropping(true)}
                  className={`${buttonSecondary} text-sm`}
                >
                  {ownPicture ? "Replace" : "Upload a picture"}
                </button>
                {ownPicture ? (
                  <button
                    type="button"
                    disabled={removing}
                    onClick={() =>
                      startRemoving(async () => {
                        setProblem(null);
                        const result = await removePicture();
                        if (result.status === "error")
                          setProblem(result.message);
                      })
                    }
                    className={`${buttonSecondary} text-sm`}
                  >
                    {removing ? "Removing…" : "Remove"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}

        {cropping ? (
          // Saving the picture also makes it the chosen one; the page then
          // redraws with it (the action calls refresh()).
          <div className="rounded-xl bg-page p-3">
            <PictureCropper
              onDone={() => {
                setCropping(false);
                setChosen("upload");
              }}
              onCancel={() => setCropping(false)}
            />
          </div>
        ) : null}

        <p className={`text-sm ${mutedText}`}>
          With &quot;Just my initial&quot;, friends see the first letter of your
          name.
        </p>
      </fieldset>

      {problem ? (
        <p role="alert" className={errorText}>
          {problem}
        </p>
      ) : null}
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
