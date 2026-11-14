"use client";

// "use client" because this component uses a React hook to react to what the
// server action returns. The saving itself still happens on the server.

import { useActionState } from "react";
import { saveDisplayName } from "@/app/(app)/actions/profile";
import {
  DISPLAY_NAME_MAX_LENGTH,
  type DisplayNameFormState,
} from "@/lib/validation/profile";

type Props = {
  /** What the field starts with: the current name, or a suggestion. */
  initialName: string;
  submitLabel: string;
};

export function DisplayNameForm({ initialName, submitLabel }: Props) {
  // useActionState connects a form to a server action:
  //   state      what the action returned last time (starts as {})
  //   formAction what to hand to <form action={...}>
  //   isPending  true while the request is in flight
  const [state, formAction, isPending] = useActionState<
    DisplayNameFormState,
    FormData
  >(saveDisplayName, {});

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
        className="rounded border border-foreground/30 bg-transparent px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2"
      />
      <p id="display_name_help" className="text-sm opacity-70">
        Shown to your friends beside your ratings. Up to{" "}
        {DISPLAY_NAME_MAX_LENGTH} characters.
      </p>
      {state.message ? (
        // role="alert" makes screen readers announce the problem (NFR15).
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-foreground px-4 py-2 font-medium text-background hover:opacity-90 active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
