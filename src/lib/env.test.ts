import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "@/lib/env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

describe("parsePublicEnv", () => {
  it("accepts a complete, well-formed set of variables", () => {
    expect(parsePublicEnv(valid)).toEqual(valid);
  });

  // The whole point of this module: a missing variable should stop the app
  // immediately with a message that names it, not fail later with a
  // confusing network error.
  it("rejects a missing variable and names it", () => {
    const withoutUrl = {
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        valid.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_SITE_URL: valid.NEXT_PUBLIC_SITE_URL,
    };
    expect(() => parsePublicEnv(withoutUrl)).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("rejects an empty value", () => {
    expect(() =>
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("rejects a URL that is not a URL", () => {
    expect(() =>
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not a url" }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  // An easy mistake: copying the address of the dashboard page instead of
  // the project's own URL. It is a valid URL, so it needs its own check.
  it("rejects the Supabase dashboard address with a helpful hint", () => {
    expect(() =>
      parsePublicEnv({
        ...valid,
        NEXT_PUBLIC_SUPABASE_URL:
          "https://supabase.com/dashboard/project/abcdefghijklmnop",
      }),
    ).toThrow(/dashboard/);
  });

  // The site URL is glued to "/auth/callback" to build the sign-in return
  // address, so a trailing slash or a path would produce a broken link.
  it.each([
    "http://localhost:3000/",
    "https://quadrant-db.vercel.app/some/page",
    "not a url",
  ])("rejects the site URL %s", (siteUrl) => {
    expect(() =>
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SITE_URL: siteUrl }),
    ).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("names every problem at once, not just the first", () => {
    expect(() => parsePublicEnv({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL[\s\S]*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it("points the reader at .env.example", () => {
    expect(() => parsePublicEnv({})).toThrow(/\.env\.example/);
  });

  it("never echoes a value back in the error message", () => {
    const secretLooking = "sb_publishable_do_not_print_me";
    try {
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "nope",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secretLooking,
      });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(String(error)).not.toContain(secretLooking);
    }
  });
});
