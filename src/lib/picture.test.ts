import { describe, expect, it } from "vitest";
import { googlePictureFrom, initialOf, isGooglePicture } from "@/lib/picture";

const GOOGLE = "https://lh3.googleusercontent.com/a/abc123=s96-c";

// The same cases as the database's own rule, which is tested against the
// real database in tests/rls/profile-picture.test.ts. The two must agree.
describe("isGooglePicture", () => {
  it("accepts an address on Google's picture servers", () => {
    expect(isGooglePicture(GOOGLE)).toBe(true);
    expect(isGooglePicture("https://lh5.googleusercontent.com/a/x")).toBe(true);
  });

  it.each([
    ["plain http", "http://lh3.googleusercontent.com/a/x=s96-c"],
    [
      "Google's name as a prefix of another site",
      "https://lh3.googleusercontent.com.evil.example/a/x",
    ],
    [
      "Google's name inside another site's path",
      "https://evil.example/https://lh3.googleusercontent.com/a/x",
    ],
    ["another Google site", "https://www.googleusercontent.com/a/x"],
    ["no path at all", "https://lh3.googleusercontent.com"],
    ["a script instead of an address", "javascript:alert(1)"],
    ["another site entirely", "https://evil.example/pixel.png"],
    ["an address far too long to be real", GOOGLE + "x".repeat(600)],
    ["nothing", ""],
  ])("refuses %s", (_name, address) => {
    expect(isGooglePicture(address)).toBe(false);
  });

  it("refuses anything that is not text", () => {
    expect(isGooglePicture(null)).toBe(false);
    expect(isGooglePicture(undefined)).toBe(false);
    expect(isGooglePicture(42)).toBe(false);
    expect(isGooglePicture({ href: GOOGLE })).toBe(false);
  });
});

describe("googlePictureFrom", () => {
  it("reads the picture address Google supplied at sign-in", () => {
    expect(googlePictureFrom({ avatar_url: GOOGLE, name: "Cam" })).toBe(GOOGLE);
  });

  it("gives null when there is none", () => {
    expect(googlePictureFrom({ name: "Cam" })).toBeNull();
    expect(googlePictureFrom({})).toBeNull();
  });

  it("gives null for an address that is not Google's", () => {
    expect(
      googlePictureFrom({ avatar_url: "https://evil.example/pixel.png" }),
    ).toBeNull();
  });

  // The sign-in details come from outside the app: assume nothing.
  it("gives null for details of the wrong shape", () => {
    expect(googlePictureFrom(null)).toBeNull();
    expect(googlePictureFrom(undefined)).toBeNull();
    expect(googlePictureFrom("avatar_url")).toBeNull();
    expect(googlePictureFrom({ avatar_url: 7 })).toBeNull();
  });
});

describe("initialOf", () => {
  it("is the first letter of the name, as a capital", () => {
    expect(initialOf("Cam")).toBe("C");
    expect(initialOf("bob")).toBe("B");
  });

  it("skips spaces at the start", () => {
    expect(initialOf("  zoe")).toBe("Z");
  });

  it("keeps a digit or an accented letter", () => {
    expect(initialOf("42nd Street Fan")).toBe("4");
    expect(initialOf("émile")).toBe("É");
  });

  // An emoji is one character to a person but two to JavaScript's string
  // indexing. Half an emoji would show as a broken box.
  it("keeps an emoji whole", () => {
    expect(initialOf("🎬 Cam")).toBe("🎬");
  });

  it("is a question mark when there is no name to take it from", () => {
    expect(initialOf("")).toBe("?");
    expect(initialOf("   ")).toBe("?");
  });
});
