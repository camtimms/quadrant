import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env.server";

// Shaped like the real token (three parts joined by dots) but made up.
const token = "eyJhbGciOiJIUzI1NiJ9.eyJleGFtcGxlIjp0cnVlfQ.c2lnbmF0dXJl";

describe("parseServerEnv", () => {
  it("accepts a token shaped like TMDB's read access token", () => {
    expect(parseServerEnv({ TMDB_API_READ_ACCESS_TOKEN: token })).toEqual({
      TMDB_API_READ_ACCESS_TOKEN: token,
    });
  });

  it("rejects a missing token and names the variable", () => {
    expect(() => parseServerEnv({})).toThrow(
      /TMDB_API_READ_ACCESS_TOKEN is missing/,
    );
  });

  // The easy mistake: TMDB shows a short "API Key" right next to the token.
  it("rejects the short API key with a hint about which one to use", () => {
    expect(() =>
      parseServerEnv({
        TMDB_API_READ_ACCESS_TOKEN: "0123456789abcdef0123456789abcdef",
      }),
    ).toThrow(/API Read Access Token/);
  });

  it("never echoes the value back in the error message", () => {
    const wrong = "0123456789abcdef0123456789abcdef";
    try {
      parseServerEnv({ TMDB_API_READ_ACCESS_TOKEN: wrong });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(String(error)).not.toContain(wrong);
    }
  });
});
