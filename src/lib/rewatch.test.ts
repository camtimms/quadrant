import { describe, expect, it } from "vitest";
import { timesWatchedLabel, viewingDate } from "./rewatch";

describe("timesWatchedLabel (R84)", () => {
  it.each([
    [1, ""],
    [2, "Watched twice"],
    [3, "Watched 3 times"],
    [12, "Watched 12 times"],
  ])("%i → %j", (times, label) => {
    expect(timesWatchedLabel(times)).toBe(label);
  });

  // Anything unexpected reads as a single watch: say nothing.
  it.each([0, -1, 1.5, Number.NaN, undefined])("%s → nothing", (times) => {
    expect(timesWatchedLabel(times)).toBe("");
  });
});

describe("viewingDate (R85)", () => {
  it("writes the day, short month and year", () => {
    expect(viewingDate("2026-03-12T10:00:00+00:00")).toBe("12 Mar 2026");
  });

  // Shown as the UTC date, the same on every server and in every test.
  it("uses the UTC day", () => {
    expect(viewingDate("2026-03-12T23:30:00+00:00")).toBe("12 Mar 2026");
    expect(viewingDate("2026-03-13T08:30:00+10:00")).toBe("12 Mar 2026");
  });

  it("says nothing for a date it cannot read", () => {
    expect(viewingDate("not a date")).toBe("");
  });
});
