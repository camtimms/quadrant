import { describe, expect, it } from "vitest";
import { fetchAllPages } from "@/lib/data/paging";

/**
 * A pretend database table of `total` numbered rows that, like the real
 * API, never hands over more than `cap` rows in one answer, however many
 * are asked for. It also notes each request it was sent.
 */
function fakeTable(total: number, cap: number, { count = true } = {}) {
  const all = Array.from({ length: total }, (_, index) => index);
  const requests: [number, number][] = [];
  return {
    requests,
    fetchPage: async (from: number, to: number) => {
      requests.push([from, to]);
      // "to" is included, as in Supabase's .range(from, to).
      const wanted = all.slice(from, to + 1);
      return {
        data: wanted.slice(0, cap),
        error: null,
        count: count ? total : null,
      };
    },
  };
}

describe("fetchAllPages (V5)", () => {
  it("returns everything in one request when it fits", async () => {
    const table = fakeTable(3, 1000);

    expect(await fetchAllPages(table.fetchPage, 1000)).toEqual([0, 1, 2]);
    expect(table.requests).toEqual([[0, 999]]);
  });

  it("keeps asking until it has every row, in order", async () => {
    const table = fakeTable(2500, 1000);

    const rows = await fetchAllPages(table.fetchPage, 1000);

    expect(rows).toHaveLength(2500);
    expect(rows[0]).toBe(0);
    expect(rows[2499]).toBe(2499);
    expect(table.requests).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("stops without an extra request when the last page is exactly full", async () => {
    const table = fakeTable(2000, 1000);

    expect(await fetchAllPages(table.fetchPage, 1000)).toHaveLength(2000);
    expect(table.requests).toHaveLength(2);
  });

  // The danger this guards against: the project's cap being LOWER than the
  // page size we ask for. Stopping at the first short page would then
  // silently drop most of the rows.
  it("still gets every row when the server's cap is below the page size", async () => {
    const table = fakeTable(1200, 500);

    const rows = await fetchAllPages(table.fetchPage, 1000);

    expect(rows).toHaveLength(1200);
    expect(new Set(rows).size).toBe(1200);
    // Each request starts where the rows actually received left off.
    expect(table.requests.map(([from]) => from)).toEqual([0, 500, 1000]);
  });

  it("works without a total, stopping at the first empty page", async () => {
    const table = fakeTable(1500, 1000, { count: false });

    expect(await fetchAllPages(table.fetchPage, 1000)).toHaveLength(1500);
    expect(table.requests).toHaveLength(3);
  });

  it("returns an empty list for an empty table", async () => {
    const table = fakeTable(0, 1000);

    expect(await fetchAllPages(table.fetchPage, 1000)).toEqual([]);
    expect(table.requests).toHaveLength(1);
  });

  it("stops if rows disappear while it is reading", async () => {
    // Says there are 10 rows but only ever has 4: a rating deleted between
    // two requests. It must give up, not ask for ever.
    const rows = await fetchAllPages(
      async (from: number) => ({
        data: [0, 1, 2, 3].slice(from),
        error: null,
        count: 10,
      }),
      1000,
    );

    expect(rows).toEqual([0, 1, 2, 3]);
  });

  it("passes on a failure, with the cause attached", async () => {
    const failure = { message: "down" };

    await expect(
      fetchAllPages(
        async () => ({ data: null, error: failure, count: null }),
        1000,
      ),
    ).rejects.toMatchObject({
      message: "Could not load the rows.",
      cause: failure,
    });
  });

  it("gives up instead of looping for ever", async () => {
    // A broken source that always has one more row.
    await expect(
      fetchAllPages(async () => ({ data: [1], error: null, count: null }), 1),
    ).rejects.toThrow(/too many pages/i);
  });
});
