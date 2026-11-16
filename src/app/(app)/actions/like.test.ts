import { beforeEach, describe, expect, it, vi } from "vitest";

// The session and the database are replaced, so these tests check the
// action's decisions. What the database itself allows is proven in
// tests/rls/review-likes.test.ts.

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  refresh: vi.fn(),
  inserted: [] as unknown[],
  insertResult: vi.fn(),
  deleteFilters: [] as [string, unknown][],
  deleteResult: vi.fn(),
}));

vi.mock("@/lib/auth/member", () => ({
  getCurrentMember: mocks.getCurrentMember,
}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      expect(table).toBe("review_likes");
      return {
        insert: async (row: unknown) => {
          mocks.inserted.push(row);
          return mocks.insertResult();
        },
        delete: () => {
          const query = {
            eq(column: string, value: unknown) {
              mocks.deleteFilters.push([column, value]);
              return query;
            },
            then(resolve: (answer: unknown) => void) {
              resolve(mocks.deleteResult());
            },
          };
          return query;
        },
      };
    },
  }),
}));

import { setReviewLike } from "@/app/(app)/actions/like";

const MEMBER = {
  userId: "00000000-0000-4000-8000-000000000001",
  isMember: true,
  displayName: "Cam",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.inserted.length = 0;
  mocks.deleteFilters.length = 0;
  mocks.getCurrentMember.mockResolvedValue(MEMBER);
  mocks.insertResult.mockReturnValue({ error: null });
  mocks.deleteResult.mockReturnValue({ error: null });
});

describe("setReviewLike (R69)", () => {
  it("adds the member's own like and redraws the page", async () => {
    expect(await setReviewLike(41, true)).toEqual({ status: "ok" });
    // The member's id comes from the session, never from the browser.
    expect(mocks.inserted).toEqual([{ rating_id: 41, user_id: MEMBER.userId }]);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("removes only the member's own like of that review", async () => {
    expect(await setReviewLike(41, false)).toEqual({ status: "ok" });
    expect(mocks.deleteFilters).toEqual([
      ["rating_id", 41],
      ["user_id", MEMBER.userId],
    ]);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  // E51: a like that is already there is what the member wanted.
  it("treats liking an already-liked review as done", async () => {
    mocks.insertResult.mockReturnValue({ error: { code: "23505" } });
    expect(await setReviewLike(41, true)).toEqual({ status: "ok" });
  });

  // E53: the button puts itself back and says so.
  it("reports a failure the database gives", async () => {
    mocks.insertResult.mockReturnValue({ error: { code: "42501" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await setReviewLike(41, true);
    expect(result.status).toBe("error");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("reports an unexpected failure instead of throwing", async () => {
    mocks.getCurrentMember.mockRejectedValue(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await setReviewLike(41, true)).status).toBe("error");
  });

  it("refuses someone whose session has ended", async () => {
    mocks.getCurrentMember.mockResolvedValue(null);
    expect((await setReviewLike(41, true)).status).toBe("error");
    expect(mocks.inserted).toEqual([]);
  });

  it("refuses a signed-in person who is not a member", async () => {
    mocks.getCurrentMember.mockResolvedValue({ ...MEMBER, isMember: false });
    expect((await setReviewLike(41, true)).status).toBe("error");
    expect(mocks.inserted).toEqual([]);
  });

  // A server action can be called with anything, not only what our button
  // sends.
  it.each([
    ["a fraction", 4.5, true],
    ["zero", 0, true],
    ["a negative id", -3, true],
    ["text", "41", true],
    ["a non-boolean choice", 41, "yes"],
  ])("refuses %s, touching nothing", async (_, ratingId, liked) => {
    const result = await setReviewLike(ratingId as number, liked as boolean);
    expect(result.status).toBe("error");
    expect(mocks.getCurrentMember).not.toHaveBeenCalled();
    expect(mocks.inserted).toEqual([]);
  });
});
