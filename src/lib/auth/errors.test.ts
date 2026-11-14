import { describe, expect, it } from "vitest";
import {
  INVITE_ONLY_MESSAGE,
  loginErrorFromCallback,
  loginErrorMessage,
} from "@/lib/auth/errors";

/** Build the query string a sign-in redirect might come back with. */
const params = (values: Record<string, string>) => new URLSearchParams(values);

describe("loginErrorFromCallback", () => {
  it("reports no error for a normal return carrying a code", () => {
    expect(loginErrorFromCallback(params({ code: "abc" }))).toBeNull();
  });

  // The sign-up hook's refusal comes back as an error description containing
  // the hook's own message (R4).
  it("recognises the invite-only refusal from its description", () => {
    expect(
      loginErrorFromCallback(
        params({
          error: "access_denied",
          error_description: INVITE_ONLY_MESSAGE,
        }),
      ),
    ).toBe("not-invited");
  });

  it("recognises it whatever the capitalisation or surrounding text", () => {
    expect(
      loginErrorFromCallback(
        params({
          error: "server_error",
          error_description: "Hook failed: THIS APP IS INVITE-ONLY. Sign in…",
        }),
      ),
    ).toBe("not-invited");
  });

  it("treats any other error as a general sign-in failure", () => {
    expect(
      loginErrorFromCallback(
        params({ error: "access_denied", error_description: "User cancelled" }),
      ),
    ).toBe("sign-in-failed");
    expect(loginErrorFromCallback(params({ error: "server_error" }))).toBe(
      "sign-in-failed",
    );
    expect(loginErrorFromCallback(params({ error_code: "bad_oauth" }))).toBe(
      "sign-in-failed",
    );
  });
});

describe("loginErrorMessage", () => {
  it("has the invite-only wording for not-invited", () => {
    expect(loginErrorMessage("not-invited")).toBe(INVITE_ONLY_MESSAGE);
  });

  it("has a message for a general failure", () => {
    expect(loginErrorMessage("sign-in-failed")).toMatch(/try again/i);
  });

  // The ?error= value comes from the address bar, so anyone can type
  // anything there. Unknown values must show nothing, never the raw text.
  it("shows nothing for an unknown or missing code", () => {
    expect(loginErrorMessage(undefined)).toBeUndefined();
    expect(loginErrorMessage("")).toBeUndefined();
    expect(loginErrorMessage("<script>alert(1)</script>")).toBeUndefined();
    expect(loginErrorMessage("toString")).toBeUndefined();
  });

  // E17: the message must not hint at who is invited.
  it("does not name any email address", () => {
    expect(INVITE_ONLY_MESSAGE).not.toMatch(/@/);
  });
});
