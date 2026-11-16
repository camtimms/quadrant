import { describe, expect, it } from "vitest";
import { isApiPath, isPublicPath, safeNextPath } from "@/lib/auth/paths";

describe("isApiPath", () => {
  it.each(["/api", "/api/search", "/api/anything/else"])(
    "treats %s as a data endpoint",
    (path) => {
      expect(isApiPath(path)).toBe(true);
    },
  );

  // "/apiary" merely starts with the same letters.
  it.each(["/", "/search", "/apiary", "/film/api"])(
    "treats %s as a page",
    (path) => {
      expect(isApiPath(path)).toBe(false);
    },
  );

  it("no data endpoint is public", () => {
    expect(isPublicPath("/api/search")).toBe(false);
  });

  // NFR26 (design 19): Vercel's scheduler calls this without a member's
  // session. The route checks its own secret, so it must get past the
  // sign-in check in proxy.ts first.
  it("lets the scheduler reach the keep-alive endpoint, and only that", () => {
    expect(isPublicPath("/api/keep-alive")).toBe(true);
    expect(isPublicPath("/api/search")).toBe(false);
    expect(isPublicPath("/api/keep-alive-and-more")).toBe(false);
  });
});

describe("isPublicPath", () => {
  // R1: only these may be seen without signing in.
  it.each([
    "/login",
    "/auth/callback",
    "/auth/not-invited",
    "/about",
    "/robots.txt",
    "/manifest.webmanifest",
  ])("lets signed-out visitors see %s", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  // Everything else needs a session, including pages that do not exist yet:
  // the list says what is public, so anything new is private by default.
  it.each([
    "/",
    "/search",
    "/film/603",
    "/friends",
    "/members/abc",
    "/welcome",
    "/api/search",
    "/some-page-added-next-year",
  ])("keeps %s private", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });

  // A public path must match exactly or as a whole folder, never as a prefix
  // of something else's name.
  it.each(["/loginx", "/login-admin", "/aboutus", "/authentic", "/auth"])(
    "is not fooled by the look-alike %s",
    (path) => {
      expect(isPublicPath(path)).toBe(false);
    },
  );

  it("treats a trailing slash the same", () => {
    expect(isPublicPath("/login/")).toBe(true);
  });
});

describe("safeNextPath", () => {
  // After signing in we send people on to where they were going. That
  // destination arrives in the URL, so anyone can put anything in it.
  it("keeps an ordinary path within the site", () => {
    expect(safeNextPath("/film/603")).toBe("/film/603");
    expect(safeNextPath("/friends?sort=recent")).toBe("/friends?sort=recent");
  });

  it("falls back to the home page when nothing is given", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  // An "open redirect": a link to OUR sign-in that bounces the person to
  // someone else's site afterwards. Only same-site paths are allowed.
  it.each([
    "https://evil.example",
    "http://evil.example/login",
    "//evil.example",
    // Two characters, "/" then "\". Written with a doubled backslash because
    // a single one inside a JavaScript string would just vanish.
    "/\\evil.example",
    "evil.example",
    "javascript:alert(1)",
  ])("refuses to send people off-site via %s", (next) => {
    expect(safeNextPath(next)).toBe("/");
  });
});
