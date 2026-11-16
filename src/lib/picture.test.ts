import { describe, expect, it } from "vitest";
import {
  googlePictureFrom,
  initialOf,
  isGooglePicture,
  isShowablePicture,
  pictureAddress,
  pictureFilePath,
} from "@/lib/picture";

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

// R79, R82 (design 23.2): uploaded pictures are shown from our own route.
const MEMBER = "6a1f0c2e-9b7d-4e3a-8f21-0d5c4b3a2e1f";

describe("pictureAddress", () => {
  it("is the stored Google address for the Google choice", () => {
    expect(
      pictureAddress({
        userId: MEMBER,
        source: "google",
        googleUrl: GOOGLE,
        version: 0,
      }),
    ).toBe(GOOGLE);
  });

  it("is nothing for the Google choice when there is no Google picture", () => {
    expect(
      pictureAddress({
        userId: MEMBER,
        source: "google",
        googleUrl: null,
        version: 0,
      }),
    ).toBeNull();
  });

  // The version makes a new upload a new address, so no cache shows the
  // old one.
  it("is our own route, with the version, for an upload", () => {
    expect(
      pictureAddress({
        userId: MEMBER,
        source: "upload",
        googleUrl: GOOGLE,
        version: 3,
      }),
    ).toBe(`/api/avatar/${MEMBER}?v=3`);
  });

  it("is nothing for the initial", () => {
    expect(
      pictureAddress({
        userId: MEMBER,
        source: "initial",
        googleUrl: GOOGLE,
        version: 3,
      }),
    ).toBeNull();
  });

  it("treats an unknown choice as the initial", () => {
    expect(
      pictureAddress({
        userId: MEMBER,
        source: "banana",
        googleUrl: GOOGLE,
        version: 3,
      }),
    ).toBeNull();
  });
});

describe("isShowablePicture", () => {
  it("accepts a Google picture and our own picture route", () => {
    expect(isShowablePicture(GOOGLE)).toBe(true);
    expect(isShowablePicture(`/api/avatar/${MEMBER}?v=3`)).toBe(true);
  });

  // Anything else could make friends' browsers fetch an address of a
  // member's choosing.
  it.each([
    `/api/avatar/${MEMBER}`,
    `/api/avatar/${MEMBER}?v=3&x=1`,
    `/api/avatar/not-an-id?v=3`,
    `/api/search?q=1`,
    `//evil.example/api/avatar/${MEMBER}?v=3`,
    `https://evil.example/api/avatar/${MEMBER}?v=3`,
    `/api/avatar/${MEMBER}/../../x?v=3`,
    null,
    "",
  ])("refuses %j", (address) => {
    expect(isShowablePicture(address)).toBe(false);
  });
});

describe("pictureFilePath", () => {
  // A new name per upload (design 23.1), in the member's own folder, which
  // is what the storage rules check.
  it("is the member's folder and a name with the version", () => {
    expect(pictureFilePath(MEMBER, 4)).toBe(`${MEMBER}/avatar-4.jpg`);
  });
});
