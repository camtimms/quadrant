import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isScheduledCall,
  KEEP_ALIVE_PATH,
  RUNS_PER_DAY,
} from "@/lib/keepAlive";

// NFR26 (design 19): keeping the free database awake.

const SECRET = "abcdefghij0123456789";

describe("isScheduledCall", () => {
  // Vercel sends the project's CRON_SECRET as "Bearer <secret>".
  it("accepts the secret exactly as Vercel sends it", () => {
    expect(isScheduledCall(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it.each([
    ["no header", null],
    ["an empty header", ""],
    ["the secret without Bearer", SECRET],
    [
      "a wrong secret of the same length",
      `Bearer ${"x".repeat(SECRET.length)}`,
    ],
    ["a shorter secret", `Bearer ${SECRET.slice(1)}`],
    ["a longer secret", `Bearer ${SECRET}0`],
    ["a different capitalisation", `bearer ${SECRET}`],
  ])("refuses %s", (_, header) => {
    expect(isScheduledCall(header, SECRET)).toBe(false);
  });

  // E49: with no secret set up, nobody gets in, not even with an empty or
  // "undefined" header.
  it.each([undefined, ""])(
    "refuses everyone while the secret is not set (%j)",
    (secret) => {
      expect(isScheduledCall("Bearer ", secret)).toBe(false);
      expect(isScheduledCall("Bearer undefined", secret)).toBe(false);
    },
  );
});

describe("vercel.json schedule", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    crons?: { path: string; schedule: string }[];
  };
  const crons = config.crons ?? [];

  it("calls the keep-alive endpoint three times a day", () => {
    expect(RUNS_PER_DAY).toBe(3);
    expect(crons).toHaveLength(RUNS_PER_DAY);
    for (const cron of crons) expect(cron.path).toBe(KEEP_ALIVE_PATH);
  });

  // The free plan refuses any job that runs more than once a day: each must
  // name one minute of one hour, every day.
  it("runs each job once a day, as the free plan requires", () => {
    for (const { schedule } of crons) {
      expect(schedule).toMatch(/^\d{1,2} \d{1,2} \* \* \*$/);
    }
  });

  it("spreads the runs across the day", () => {
    const hours = crons.map(({ schedule }) => Number(schedule.split(" ")[1]));
    expect(new Set(hours).size).toBe(RUNS_PER_DAY);
    const sorted = [...hours].sort((a, b) => a - b);
    // No two runs within six hours of each other.
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(6);
    }
  });
});
