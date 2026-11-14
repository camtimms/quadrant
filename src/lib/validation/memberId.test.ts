import { describe, expect, it } from "vitest";
import { parseMemberId } from "./memberId";

const ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

describe("parseMemberId", () => {
  it("accepts a member id as the database writes it", () => {
    expect(parseMemberId(ID)).toBe(ID);
  });

  // The database compares ids ignoring case; lower case keeps ours comparable.
  it("lower-cases an id typed in capitals", () => {
    expect(parseMemberId(ID.toUpperCase())).toBe(ID);
  });

  it.each([
    ["empty text", ""],
    ["a word", "alice"],
    ["a number", "42"],
    ["an id that is too short", ID.slice(0, -1)],
    ["an id that is too long", `${ID}0`],
    ["an id without its dashes", ID.replaceAll("-", "")],
    ["an id with a letter that is not hexadecimal", ID.replace("3", "g")],
    ["an id with something after it", `${ID}/edit`],
    ["an id with a space before it", ` ${ID}`],
    ["an attempt at SQL", "' or 1=1 --"],
  ])("rejects %s", (_name, input) => {
    expect(parseMemberId(input)).toBeNull();
  });

  it("rejects anything that is not text", () => {
    expect(parseMemberId(undefined)).toBeNull();
    expect(parseMemberId(null)).toBeNull();
    expect(parseMemberId(42)).toBeNull();
    expect(parseMemberId([ID])).toBeNull();
  });
});
