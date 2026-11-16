import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The database is replaced, so these tests check what the route decides:
// who may call it and what it answers. The real count is checked against
// the dev project in tests/rls/titles-store.test.ts.
const countTitles = vi.hoisted(() => vi.fn());
vi.mock("@/lib/titles/store", () => ({ countTitles }));

import { GET } from "@/app/api/keep-alive/route";

const SECRET = "abcdefghij0123456789";
const call = (authorization?: string) =>
  GET(
    new Request("https://quadrant.example/api/keep-alive", {
      headers: authorization ? { authorization } : {},
    }),
  );

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  countTitles.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/keep-alive (NFR26)", () => {
  // E48: anyone but the scheduler is turned away before the database is
  // asked anything.
  it("refuses a call without the secret, without touching the database", async () => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(countTitles).not.toHaveBeenCalled();
  });

  it("refuses a call with the wrong secret", async () => {
    const response = await call("Bearer not-the-secret");
    expect(response.status).toBe(401);
    expect(countTitles).not.toHaveBeenCalled();
  });

  // E49
  it("refuses everyone while CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await call("Bearer ");
    expect(response.status).toBe(401);
    expect(countTitles).not.toHaveBeenCalled();
  });

  it("asks the database one question and reports the answer", async () => {
    countTitles.mockResolvedValue(42);
    const response = await call(`Bearer ${SECRET}`);
    expect(response.status).toBe(200);
    expect(countTitles).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ ok: true, films: 42 });
  });

  // E50: a paused or unreachable database shows up as a failure in
  // Vercel's logs. The reason stays in the server log, not the response.
  it("reports a failure when the database does not answer", async () => {
    countTitles.mockRejectedValue(new Error("connection refused, host xyz"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await call(`Bearer ${SECRET}`);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ ok: false });
    expect(JSON.stringify(body)).not.toContain("xyz");
  });

  // Never stored by a cache in front of the site, or a run could be
  // answered without reaching the database at all.
  it("asks not to be cached", async () => {
    countTitles.mockResolvedValue(1);
    const response = await call(`Bearer ${SECRET}`);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
