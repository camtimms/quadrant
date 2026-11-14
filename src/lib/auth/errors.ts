/**
 * Sign-in problems, and the words shown for them on the sign-in page.
 *
 * The sign-in page is told what went wrong by a short code in its address
 * (/login?error=not-invited). Only the codes listed here mean anything;
 * the page never displays text taken from the address itself.
 */

/**
 * The one message for anyone who is not on the invite list (R4).
 *
 * The database's sign-up hook (migration 2) returns this same sentence.
 * It is the same for every refused address and names nobody, so it cannot
 * be used to work out who IS invited (requirements E17).
 */
export const INVITE_ONLY_MESSAGE =
  "This app is invite-only. Sign in with the Google account you were invited with.";

const LOGIN_ERROR_MESSAGES = {
  "not-invited": INVITE_ONLY_MESSAGE,
  "sign-in-failed": "Sign-in didn't complete. Please try again.",
} as const;

export type LoginError = keyof typeof LOGIN_ERROR_MESSAGES;

/**
 * The message for an error code from the address bar, or undefined if the
 * code is not one of ours.
 *
 * Object.hasOwn is used rather than a plain lookup because every JavaScript
 * object also answers to built-in names such as "toString"; a plain lookup
 * would return a function for ?error=toString.
 */
export function loginErrorMessage(
  code: string | undefined,
): string | undefined {
  if (!code || !Object.hasOwn(LOGIN_ERROR_MESSAGES, code)) return undefined;
  return LOGIN_ERROR_MESSAGES[code as LoginError];
}

/**
 * Work out what went wrong from the address Google/Supabase sent the person
 * back to. Returns null when nothing went wrong.
 *
 * When sign-in fails, the return address carries error details instead of a
 * code. The invite-only refusal is recognised by the hook's own wording in
 * the description; anything else is reported as a general failure.
 */
export function loginErrorFromCallback(
  params: URLSearchParams,
): LoginError | null {
  const hasError =
    params.has("error") ||
    params.has("error_code") ||
    params.has("error_description");
  if (!hasError) return null;

  const description = params.get("error_description") ?? "";
  return /invite-only/i.test(description) ? "not-invited" : "sign-in-failed";
}
