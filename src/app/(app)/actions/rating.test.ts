import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentMember } from "@/lib/auth/member";
import type { EnsureTitleResult } from "@/lib/titles/ensureTitle";
import type {
  DeleteRatingState,
  RatingFormState,
} from "@/lib/validation/rating";
import { deleteRating, saveRating } from "./rating";

// The actions sit between four things: who is signed in, our film store,
// the database, and Next.js's "redraw the page" call. All four are replaced
// with stand-ins here, so these tests are about the actions' own decisions:
// what gets checked, in what order, and what the member is told.
//
// That the DATABASE really refuses bad data and other people's rows is
// proven separately, against a real database, in tests/rls/ratings.test.ts.

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn<() => Promise<CurrentMember | null>>(),
  ensureTitle: vi.fn<(tmdbId: number) => Promise<EnsureTitleResult>>(),
  rpc: vi.fn(),
  deleteResult: vi.fn(),
  deleteFilters: [] as [string, unknown][],
  existingReview: vi.fn(),
  reviewFilters: [] as [string, unknown][],
  refresh: vi.fn(),
  redirect: vi.fn<(url: string) => never>(),
}));

vi.mock("@/lib/auth/member", () => ({
  getCurrentMember: mocks.getCurrentMember,
}));
vi.mock("@/lib/titles/ensureTitle", () => ({
  ensureTitle: mocks.ensureTitle,
}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  // A pretend Supabase client with just the two things the actions use:
  //   .rpc("save_rating", {...})
  //   .from("ratings").delete().eq(...).eq(...).eq(...)
  createClient: async () => ({
    rpc: mocks.rpc,
    from: (table: string) => ({
      // .select("review").eq(...).eq(...).eq(...).maybeSingle()
      select: (columns: string) => {
        expect(table).toBe("ratings");
        expect(columns).toBe("review");
        const query = {
          eq(column: string, value: unknown) {
            mocks.reviewFilters.push([column, value]);
            return query;
          },
          maybeSingle: async () => mocks.existingReview(),
        };
        return query;
      },
      delete: () => {
        expect(table).toBe("ratings");
        const query = {
          eq(column: string, value: unknown) {
            mocks.deleteFilters.push([column, value]);
            return query;
          },
          // Awaiting the query "runs" it.
          then: (resolve: (value: unknown) => void) =>
            resolve(mocks.deleteResult()),
        };
        return query;
      },
    }),
  }),
}));

const MEMBER: CurrentMember = {
  userId: "00000000-0000-4000-8000-000000000001",
  isMember: true,
  displayName: "Cam",
  suggestedName: "Cam",
  pictureSource: "google",
  pictureVersion: 0,
  googlePicture: null,
};

const TITLE = {
  id: 42,
  media_type: "movie",
  tmdb_id: 10999,
  title: "Commando",
  release_year: 1985,
  poster_path: "/x.jpg",
  overview: "A description.",
  fetched_at: "2026-11-14T00:00:00Z",
};

/** Build the form data a browser would send. */
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const IDLE = { status: "idle" } as const;

function save(fields: Record<string, string> = {}): Promise<RatingFormState> {
  return saveRating(
    IDLE,
    form({
      tmdb_id: "10999",
      quality: "3",
      enjoyment: "9",
      review: "So bad it's good.",
      ...fields,
    }),
  );
}

/**
 * Save, expecting it to work. A successful save ends in a redirect, which
 * (like the real one) is a thrown signal, not a returned value.
 */
async function savedAndRedirected(fields: Record<string, string> = {}) {
  await expect(save(fields)).rejects.toThrow("NEXT_REDIRECT");
}

function remove(titleId = "42"): Promise<DeleteRatingState> {
  return deleteRating(IDLE, form({ title_id: titleId }));
}

beforeEach(() => {
  mocks.getCurrentMember.mockResolvedValue(MEMBER);
  mocks.ensureTitle.mockResolvedValue({ ok: true, title: TITLE });
  mocks.rpc.mockResolvedValue({ data: { id: 1 }, error: null });
  mocks.deleteResult.mockReturnValue({ error: null });
  // The real redirect() never returns: it throws a signal for Next.js.
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
  mocks.deleteFilters.length = 0;
  mocks.reviewFilters.length = 0;
  mocks.existingReview.mockResolvedValue({
    data: { review: "My earlier review." },
    error: null,
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("saveRating", () => {
  describe("a good rating (R15, R23)", () => {
    it("stores the film and saves the scores under it", async () => {
      await savedAndRedirected({ quality: "2", enjoyment: "9" });

      expect(mocks.ensureTitle).toHaveBeenCalledWith(10999);
      expect(mocks.rpc).toHaveBeenCalledWith("save_rating", {
        p_title_id: 42, // OUR id for the film, from ensureTitle
        p_quality: 2,
        p_enjoyment: 9,
        p_review: "So bad it's good.",
      });
    });

    // R23 (v5): after saving, the member lands on My films with the film
    // they just rated pointed out.
    it("sends the member to My films, naming the film in the address", async () => {
      await savedAndRedirected();
      expect(mocks.redirect).toHaveBeenCalledTimes(1);
      expect(mocks.redirect).toHaveBeenCalledWith("/?rated=10999");
    });

    // The stand-in for redirect() throws, as the real one does. If the
    // redirect were ever moved inside the action's try/catch, that catch
    // would swallow it and this would come back as an error instead.
    it("lets the redirect through instead of reporting it as a failure", async () => {
      await expect(save()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("only redirects after the rating is stored", async () => {
      const order: string[] = [];
      mocks.rpc.mockImplementation(async () => {
        order.push("saved");
        return { data: { id: 1 }, error: null };
      });
      mocks.redirect.mockImplementation(() => {
        order.push("redirected");
        throw new Error("NEXT_REDIRECT");
      });

      await savedAndRedirected();

      expect(order).toEqual(["saved", "redirected"]);
    });

    // E14: 0 is a score, not "nothing".
    it("accepts 0 and 10", async () => {
      await savedAndRedirected({ quality: "0", enjoyment: "10" });
      expect(mocks.rpc.mock.calls[0][1]).toMatchObject({
        p_quality: 0,
        p_enjoyment: 10,
      });
    });

    // E22: untouched sliders are a real 5/5.
    it("saves untouched sliders as 5/5", async () => {
      await savedAndRedirected({ quality: "5", enjoyment: "5" });
      expect(mocks.rpc.mock.calls[0][1]).toMatchObject({
        p_quality: 5,
        p_enjoyment: 5,
      });
    });

    it("accepts every pair of whole-number scores", async () => {
      for (let quality = 0; quality <= 10; quality++) {
        for (let enjoyment = 0; enjoyment <= 10; enjoyment++) {
          await savedAndRedirected({
            quality: String(quality),
            enjoyment: String(enjoyment),
          });
        }
      }
      expect(mocks.rpc).toHaveBeenCalledTimes(121);
    });

    it("sends 'no review' as an empty string", async () => {
      await savedAndRedirected({ review: "   " });
      expect(mocks.rpc.mock.calls[0][1].p_review).toBe("");
    });

    it("accepts a 500-character review", async () => {
      await savedAndRedirected({ review: "a".repeat(500) });
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
    });
  });

  describe("a bad rating (R16, R17)", () => {
    it.each([
      ["a missing quality", { quality: "" }, "quality"],
      ["a fractional quality", { quality: "7.5" }, "quality"],
      ["a quality of 11", { quality: "11" }, "quality"],
      ["a quality of -1", { quality: "-1" }, "quality"],
      ["a missing enjoyment", { enjoyment: "" }, "enjoyment"],
      ["a fractional enjoyment", { enjoyment: "2.5" }, "enjoyment"],
      ["an enjoyment of 11", { enjoyment: "11" }, "enjoyment"],
      ["a 501-character review", { review: "a".repeat(501) }, "review"],
    ])("rejects %s and names the field", async (_name, fields, field) => {
      const result = await save(fields);

      expect(result).toMatchObject({ status: "error", field });
      // Nothing was looked up or written.
      expect(mocks.ensureTitle).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(mocks.redirect).not.toHaveBeenCalled();
    });

    it("rejects a score field left out of the request entirely", async () => {
      const data = form({ tmdb_id: "10999", enjoyment: "5" });
      expect(await saveRating(IDLE, data)).toMatchObject({
        status: "error",
        field: "quality",
      });
    });

    it("hands back what was typed, so the form can refill itself", async () => {
      const review = "a".repeat(501);
      const result = await save({ quality: "8", enjoyment: "2", review });
      expect(result).toMatchObject({
        status: "error",
        values: { quality: "8", enjoyment: "2", review },
      });
    });

    it("rejects something that is not a film id", async () => {
      const result = await save({ tmdb_id: "abc" });
      expect(result).toMatchObject({ status: "error" });
      expect(mocks.ensureTitle).not.toHaveBeenCalled();
    });
  });

  describe("who is asking", () => {
    // E19: the session ran out while they were writing.
    it("returns an error, not an exception, when the session has expired", async () => {
      mocks.getCurrentMember.mockResolvedValue(null);

      const result = await save({ review: "A long, considered review." });

      expect(result).toMatchObject({
        status: "error",
        message: expect.stringMatching(/sign in again/i),
        // The typed review comes back so it is not lost.
        values: { review: "A long, considered review." },
      });
      expect(mocks.ensureTitle).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalled();
    });

    // The secret key is behind ensureTitle. A non-member must never get
    // that far, or a stranger with a Google account could fill our
    // database with films.
    it("refuses a signed-in non-member before the film store is touched", async () => {
      mocks.getCurrentMember.mockResolvedValue({ ...MEMBER, isMember: false });

      expect(await save()).toMatchObject({ status: "error" });
      expect(mocks.ensureTitle).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalled();
    });

    it("refuses a member who has not chosen a display name yet", async () => {
      mocks.getCurrentMember.mockResolvedValue({
        ...MEMBER,
        displayName: null,
      });

      expect(await save()).toMatchObject({ status: "error" });
      expect(mocks.ensureTitle).not.toHaveBeenCalled();
    });

    // The session can also run out between our check and the database's.
    it("treats the database's 'permission denied' as an expired session", async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { code: "42501", message: "permission denied" },
      });

      expect(await save()).toMatchObject({
        status: "error",
        message: expect.stringMatching(/sign in again/i),
        values: { review: "So bad it's good." },
      });
    });
  });

  describe("when something else goes wrong", () => {
    it("says the film cannot be found when TMDB has no such film", async () => {
      mocks.ensureTitle.mockResolvedValue({ ok: false, reason: "not-found" });

      const result = await save();

      expect(result).toMatchObject({
        status: "error",
        message: expect.stringMatching(/find that film/i),
      });
      expect(mocks.rpc).not.toHaveBeenCalled();
    });

    // E9
    it("says to try again when TMDB is down, and keeps the review", async () => {
      mocks.ensureTitle.mockResolvedValue({ ok: false, reason: "unavailable" });

      expect(await save()).toMatchObject({
        status: "error",
        message: expect.stringMatching(/try again/i),
        values: { review: "So bad it's good." },
      });
      expect(mocks.rpc).not.toHaveBeenCalled();
    });

    it("says it could not be saved when the database refuses, without details", async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: {
          code: "23514",
          message: 'violates check "ratings_quality_check"',
        },
      });

      const result = await save();

      expect(result).toMatchObject({ status: "error" });
      // Internal details go to the server log, never to the screen.
      expect(JSON.stringify(result)).not.toContain("ratings_quality_check");
      expect(mocks.redirect).not.toHaveBeenCalled();
    });

    it("returns an error rather than throwing if the film store fails", async () => {
      mocks.ensureTitle.mockRejectedValue(new Error("database is down"));

      expect(await save()).toMatchObject({
        status: "error",
        values: { review: "So bad it's good." },
      });
    });
  });
});

// The in-place editor (R51) changes only the scores.
describe("saveRating from the in-place editor", () => {
  /** Save as the editor does: scores, no review field, and a return address. */
  function saveInPlace(fields: Record<string, string> = {}) {
    return saveRating(
      IDLE,
      form({
        tmdb_id: "10999",
        quality: "8",
        enjoyment: "7",
        return_to: "/?filter=on-the-fence",
        ...fields,
      }),
    );
  }

  describe("the review", () => {
    it("is kept when the form has no review field", async () => {
      await expect(saveInPlace()).rejects.toThrow("NEXT_REDIRECT");

      expect(mocks.rpc.mock.calls[0][1]).toEqual({
        p_title_id: 42,
        p_quality: 8,
        p_enjoyment: 7,
        p_review: "My earlier review.",
      });
      // Read for THIS member and THIS film only.
      expect(mocks.reviewFilters).toEqual(
        expect.arrayContaining([
          ["user_id", MEMBER.userId],
          ["title_id", 42],
          ["is_current", true],
        ]),
      );
    });

    it("stays empty when there was no review", async () => {
      mocks.existingReview.mockResolvedValue({
        data: { review: null },
        error: null,
      });
      await expect(saveInPlace()).rejects.toThrow("NEXT_REDIRECT");
      expect(mocks.rpc.mock.calls[0][1].p_review).toBe("");
    });

    // The difference that matters: a field that is PRESENT but empty means
    // the member cleared their review on the film page.
    it("is removed when the form sends an empty review field", async () => {
      await expect(saveInPlace({ review: "" })).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mocks.rpc.mock.calls[0][1].p_review).toBe("");
      expect(mocks.existingReview).not.toHaveBeenCalled();
    });

    // Never trade a review for a score: if the old review cannot be read,
    // nothing is saved at all.
    it("saves nothing if the existing review cannot be read", async () => {
      mocks.existingReview.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });

      expect(await saveInPlace()).toMatchObject({ status: "error" });
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(mocks.redirect).not.toHaveBeenCalled();
    });
  });

  describe("where it goes afterwards", () => {
    it("returns to the page it came from, keeping the filter", async () => {
      await expect(saveInPlace()).rejects.toThrow("NEXT_REDIRECT");
      expect(mocks.redirect).toHaveBeenCalledWith(
        "/?filter=on-the-fence&rated=10999",
      );
    });

    it("goes to My films when no return address is given", async () => {
      await expect(saveInPlace({ return_to: "" })).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mocks.redirect).toHaveBeenCalledWith("/?rated=10999");
    });

    // return_to is typed by whoever sends the form. It must never be able
    // to send a member to another site (an "open redirect").
    it.each([
      ["https://evil.example/"],
      ["//evil.example/"],
      ["/\\evil.example"],
      ["javascript:alert(1)"],
    ])("refuses to send the member to %s", async (returnTo) => {
      await expect(saveInPlace({ return_to: returnTo })).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mocks.redirect).toHaveBeenCalledWith("/?rated=10999");
    });

    it("does not let a return address set which film is pointed out", async () => {
      await expect(
        saveInPlace({ return_to: "/?rated=555&filter=good" }),
      ).rejects.toThrow("NEXT_REDIRECT");
      const url = new URL(mocks.redirect.mock.calls[0][0], "http://x");
      expect(url.searchParams.getAll("rated")).toEqual(["10999"]);
      expect(url.searchParams.get("filter")).toBe("good");
    });
  });
});

describe("saveRating as a rewatch (R83)", () => {
  it("logs a rewatch instead of editing", async () => {
    await savedAndRedirected({ rewatch: "1", quality: "8", enjoyment: "7" });

    expect(mocks.rpc).toHaveBeenCalledWith("log_rewatch", {
      p_title_id: 42,
      p_quality: 8,
      p_enjoyment: 7,
      p_review: "So bad it's good.",
    });
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      "save_rating",
      expect.anything(),
    );
  });

  it("returns to the film page saying Saved, as any save does", async () => {
    await savedAndRedirected({ rewatch: "1", return_to: "/film/10999" });
    expect(mocks.redirect).toHaveBeenCalledWith("/film/10999?rated=10999");
  });

  // A rewatch always brings its own review (empty for none): it never
  // copies the earlier one.
  it("does not keep the earlier review when the field is left out", async () => {
    const data = form({
      tmdb_id: "10999",
      quality: "3",
      enjoyment: "9",
      rewatch: "1",
    });
    await expect(saveRating(IDLE, data)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.existingReview).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "log_rewatch",
      expect.objectContaining({ p_review: "" }),
    );
  });

  it("checks the scores as any save does", async () => {
    const result = await save({ rewatch: "1", quality: "11" });
    expect(result).toMatchObject({ status: "error", field: "quality" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps what was typed when the database refuses", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "boom" },
    });
    const result = await save({ rewatch: "1" });
    expect(result).toMatchObject({
      status: "error",
      values: { review: "So bad it's good." },
    });
    expect(JSON.stringify(result)).not.toContain("boom");
  });

  it("ignores any other value of the field", async () => {
    await savedAndRedirected({ rewatch: "yes" });
    expect(mocks.rpc).toHaveBeenCalledWith("save_rating", expect.anything());
  });
});

describe("deleteRating (R21)", () => {
  // R87: every viewing goes, earlier ones included.
  it("deletes all of the member's entries for that film", async () => {
    expect(await remove("42")).toEqual({ status: "deleted" });

    // The user id comes from the session, never from the form.
    expect(mocks.deleteFilters).toEqual([
      ["user_id", MEMBER.userId],
      ["title_id", 42],
    ]);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it.each([[""], ["abc"], ["-1"], ["1.5"]])(
    "rejects %j as a film, without touching the database",
    async (titleId) => {
      expect(await remove(titleId)).toMatchObject({ status: "error" });
      expect(mocks.deleteFilters).toEqual([]);
    },
  );

  it("returns an error, not an exception, when the session has expired", async () => {
    mocks.getCurrentMember.mockResolvedValue(null);

    expect(await remove()).toMatchObject({
      status: "error",
      message: expect.stringMatching(/sign in again/i),
    });
    expect(mocks.deleteFilters).toEqual([]);
  });

  it("says so when the database refuses", async () => {
    mocks.deleteResult.mockReturnValue({
      error: { code: "XX000", message: "boom" },
    });

    const result = await remove();

    expect(result).toMatchObject({ status: "error" });
    expect(JSON.stringify(result)).not.toContain("boom");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
