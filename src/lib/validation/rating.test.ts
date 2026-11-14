import { describe, expect, it } from "vitest";
import {
  REVIEW_MAX_LENGTH,
  parseRatingInput,
  parseTmdbId,
} from "@/lib/validation/rating";

// Form values always arrive as text, so the inputs here are strings: "7",
// not 7.
const valid = { quality: "7", enjoyment: "3", review: "Fine." };

describe("parseRatingInput", () => {
  it("accepts two whole-number scores and a review", () => {
    expect(parseRatingInput(valid)).toEqual({
      ok: true,
      value: { quality: 7, enjoyment: 3, review: "Fine." },
    });
  });

  // E14: 0 is a real score. The classic bug is treating "0" as "nothing".
  it("accepts 0 and 10", () => {
    expect(
      parseRatingInput({ ...valid, quality: "0", enjoyment: "10" }),
    ).toMatchObject({ ok: true, value: { quality: 0, enjoyment: 10 } });
  });

  // E22: untouched sliders are a real 5/5.
  it("accepts 5 and 5", () => {
    expect(
      parseRatingInput({ ...valid, quality: "5", enjoyment: "5" }),
    ).toMatchObject({ ok: true, value: { quality: 5, enjoyment: 5 } });
  });

  describe("scores (R16)", () => {
    // Each of these is refused, and the result names which field was wrong.
    const bad: [string, unknown][] = [
      ["missing", undefined],
      ["null", null],
      // Number("") is 0 in JavaScript, so an empty value must be caught
      // before any conversion, or a missing score would be saved as 0.
      ["empty", ""],
      ["only spaces", " "],
      ["a fraction", "7.5"],
      ["below the range", "-1"],
      ["above the range", "11"],
      ["far above the range", "100"],
      ["words", "seven"],
      ["scientific notation", "1e1"],
      ["a number with spaces", " 7 "],
      ["a real number rather than text", 7],
      ["a list", ["7"]],
    ];

    it.each(bad)("rejects a quality that is %s", (_name, quality) => {
      const result = parseRatingInput({ ...valid, quality });
      expect(result).toMatchObject({ ok: false, field: "quality" });
      expect(!result.ok && result.message).toMatch(/quality/i);
    });

    it.each(bad)("rejects an enjoyment that is %s", (_name, enjoyment) => {
      const result = parseRatingInput({ ...valid, enjoyment });
      expect(result).toMatchObject({ ok: false, field: "enjoyment" });
      expect(!result.ok && result.message).toMatch(/enjoyment/i);
    });

    it("says what the allowed range is", () => {
      const result = parseRatingInput({ ...valid, quality: "11" });
      expect(!result.ok && result.message).toMatch(/0 to 10/);
    });
  });

  describe("review (R17)", () => {
    it("is optional: missing, null and empty all mean no review", () => {
      for (const review of [undefined, null, "", "   "]) {
        expect(parseRatingInput({ ...valid, review })).toMatchObject({
          ok: true,
          value: { review: "" },
        });
      }
    });

    it("trims spaces from the ends", () => {
      expect(
        parseRatingInput({ ...valid, review: "  Great.  " }),
      ).toMatchObject({ ok: true, value: { review: "Great." } });
    });

    it("accepts 500 characters and rejects 501, naming the field", () => {
      expect(REVIEW_MAX_LENGTH).toBe(500);
      expect(
        parseRatingInput({ ...valid, review: "a".repeat(500) }),
      ).toMatchObject({ ok: true });

      const result = parseRatingInput({ ...valid, review: "a".repeat(501) });
      expect(result).toMatchObject({ ok: false, field: "review" });
      // The message states the limit (R17).
      expect(!result.ok && result.message).toMatch(/500/);
    });

    it("counts an emoji as one character, as the database does", () => {
      expect(
        parseRatingInput({ ...valid, review: "🎬".repeat(500) }),
      ).toMatchObject({ ok: true });
      expect(
        parseRatingInput({ ...valid, review: "🎬".repeat(501) }),
      ).toMatchObject({ ok: false, field: "review" });
    });

    // Browsers send a line break in a text box as two characters ("\r\n")
    // but count it as one against the box's own limit. Without tidying, a
    // review the box accepted could be refused by the server.
    it("counts a line break as one character", () => {
      const review = "a\r\n".repeat(250); // 500 as typed, 750 as sent
      const result = parseRatingInput({ ...valid, review });
      expect(result).toMatchObject({ ok: true });
      expect(result.ok && result.value.review).not.toContain("\r");
    });

    it("rejects a review that is not text", () => {
      expect(parseRatingInput({ ...valid, review: 42 })).toMatchObject({
        ok: false,
        field: "review",
      });
    });

    // R18: nothing is stripped or escaped here. The text is stored exactly
    // as typed and made safe where it is displayed.
    it("keeps HTML as plain characters", () => {
      const review = "<script>alert(1)</script> & <b>bold</b>";
      expect(parseRatingInput({ ...valid, review })).toMatchObject({
        ok: true,
        value: { review },
      });
    });
  });

  it("reports the first problem when several fields are wrong", () => {
    expect(
      parseRatingInput({
        quality: "11",
        enjoyment: "",
        review: "a".repeat(501),
      }),
    ).toMatchObject({ ok: false, field: "quality" });
  });
});

describe("parseTmdbId", () => {
  it("accepts a positive whole number sent as text", () => {
    expect(parseTmdbId("10999")).toBe(10999);
  });

  it.each([
    [undefined],
    [null],
    [""],
    ["0"],
    ["-5"],
    ["1.5"],
    ["abc"],
    ["10999abc"],
    ["99999999999"], // too big for the database column
    [10999],
  ])("rejects %j", (value) => {
    expect(parseTmdbId(value)).toBeNull();
  });
});
