import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadMemberName } from "./member";

// The database is replaced with a stand-in that answers whatever the test
// sets, and records the filter it was given.
const mocks = vi.hoisted(() => ({
  answer: { data: null, error: null } as { data: unknown; error: unknown },
  filters: [] as [string, unknown][],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      const query = {
        select: () => query,
        eq(column: string, value: unknown) {
          mocks.filters.push([column, value]);
          return query;
        },
        maybeSingle: async () => mocks.answer,
      };
      return query;
    },
  }),
}));

const ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

beforeEach(() => {
  mocks.answer = { data: null, error: null };
  mocks.filters = [];
});

describe("loadMemberName (R46)", () => {
  it("returns the member's display name", async () => {
    mocks.answer = { data: { display_name: "Bob" }, error: null };

    expect(await loadMemberName(ID)).toBe("Bob");
    expect(mocks.filters).toEqual([["id", ID]]);
  });

  it("returns null when there is no such member", async () => {
    expect(await loadMemberName(ID)).toBeNull();
  });

  it("lets a database failure surface as an error", async () => {
    mocks.answer = { data: null, error: { message: "down" } };
    await expect(loadMemberName(ID)).rejects.toThrow(
      "Could not load the member.",
    );
  });
});
