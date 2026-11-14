import { describe, expect, it } from "vitest";
import {
  DISPLAY_NAME_MAX_LENGTH,
  parseDisplayName,
  suggestDisplayName,
} from "@/lib/validation/profile";

describe("parseDisplayName", () => {
  it("accepts an ordinary name", () => {
    expect(parseDisplayName("Cam")).toEqual({ ok: true, value: "Cam" });
  });

  // Stray spaces from a phone keyboard should not become part of the name.
  it("trims spaces from both ends", () => {
    expect(parseDisplayName("  Cam T  ")).toEqual({ ok: true, value: "Cam T" });
  });

  it("keeps spaces inside the name", () => {
    expect(parseDisplayName("Cam T")).toEqual({ ok: true, value: "Cam T" });
  });

  it.each([
    ["an empty name", ""],
    ["a name of only spaces", "     "],
    ["a name of only tabs and line breaks", "\t\n"],
  ])("rejects %s", (_label, input) => {
    const result = parseDisplayName(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/enter a name/i);
  });

  it("has a limit of 40 characters, matching the database", () => {
    expect(DISPLAY_NAME_MAX_LENGTH).toBe(40);
  });

  it("accepts a name of exactly 40 characters", () => {
    const name = "x".repeat(40);
    expect(parseDisplayName(name)).toEqual({ ok: true, value: name });
  });

  it("rejects a name of 41 characters and states the limit", () => {
    const result = parseDisplayName("x".repeat(41));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/40/);
  });

  // Length is measured after trimming, like the database's check.
  it("does not count surrounding spaces towards the limit", () => {
    const name = "x".repeat(40);
    expect(parseDisplayName(`   ${name}   `)).toEqual({
      ok: true,
      value: name,
    });
  });

  // JavaScript's .length counts some characters (most emoji) as two. The
  // database counts them as one. Counting the way the database does keeps
  // the two checks in agreement, so a name the form accepts is never then
  // refused by the database, or the other way round.
  it("counts an emoji as one character, as the database does", () => {
    const name = "🎬".repeat(40);
    expect(name.length).toBe(80); // what a naive check would see
    expect(parseDisplayName(name)).toEqual({ ok: true, value: name });
    expect(parseDisplayName("🎬".repeat(41)).ok).toBe(false);
  });

  it.each([undefined, null, 42, {}, ["Cam"]])(
    "rejects %s, which is not text at all",
    (input) => {
      expect(parseDisplayName(input).ok).toBe(false);
    },
  );
});

describe("suggestDisplayName", () => {
  // R7: the form starts with the name Google supplied.
  it("uses the full name from Google when there is one", () => {
    expect(suggestDisplayName({ full_name: "Cam Timms" })).toBe("Cam Timms");
  });

  it("falls back to the shorter name field", () => {
    expect(suggestDisplayName({ name: "Cam" })).toBe("Cam");
  });

  it("prefers the full name when both are present", () => {
    expect(suggestDisplayName({ full_name: "Cam Timms", name: "cam" })).toBe(
      "Cam Timms",
    );
  });

  it("suggests nothing when Google supplied no name", () => {
    expect(suggestDisplayName({})).toBe("");
    expect(suggestDisplayName(undefined)).toBe("");
    expect(suggestDisplayName({ full_name: "   " })).toBe("");
  });

  // The account's metadata is outside our control, so treat it as untrusted.
  it("ignores values that are not text", () => {
    expect(suggestDisplayName({ full_name: 42, name: ["x"] })).toBe("");
  });

  it("shortens a very long name so the suggestion is itself valid", () => {
    const suggestion = suggestDisplayName({ full_name: "x".repeat(100) });
    expect(suggestion).toBe("x".repeat(40));
    expect(parseDisplayName(suggestion).ok).toBe(true);
  });

  // NFR5: an email address must never become someone's visible name by default.
  it("never suggests an email address", () => {
    expect(suggestDisplayName({ full_name: "cam@example.com" })).toBe("");
    expect(suggestDisplayName({ email: "cam@example.com" })).toBe("");
  });
});
