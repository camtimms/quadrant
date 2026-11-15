import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveDisplayName } from "./profile";

// The session, the database and Next.js's redirect are replaced with
// stand-ins, so these tests are about the action's own decisions: what is
// checked, what is saved, and in what order. That the DATABASE refuses
// anything improper is proven in tests/rls/.

const mocks = vi.hoisted(() => ({
  claims: vi.fn(),
  upsert: vi.fn(),
  rpc: vi.fn(),
  redirect: vi.fn<(url: string) => never>(),
  /** Every database call, in the order it was made. */
  calls: [] as string[],
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: mocks.claims },
    from: (table: string) => ({
      upsert: async (row: unknown) => {
        mocks.calls.push(`upsert ${table}`);
        return mocks.upsert(row);
      },
    }),
    rpc: async (name: string) => {
      mocks.calls.push(`rpc ${name}`);
      return mocks.rpc(name);
    },
  }),
}));

const USER_ID = "00000000-0000-4000-8000-000000000001";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

/** A browser sends a ticked checkbox as "on" and an unticked one not at all. */
const TICKED = { show_picture: "on" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.claims.mockResolvedValue({ data: { claims: { sub: USER_ID } } });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("saveDisplayName", () => {
  it("saves the name and the picture choice under the signed-in member's id", async () => {
    await saveDisplayName({}, form({ display_name: "  Cam  ", ...TICKED }));

    expect(mocks.upsert).toHaveBeenCalledWith({
      id: USER_ID,
      display_name: "Cam",
      show_picture: true,
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  // R63: an unticked box is missing from the form altogether.
  it("saves the picture as switched off when the box is unticked", async () => {
    await saveDisplayName({}, form({ display_name: "Cam" }));

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ show_picture: false }),
    );
  });

  // The address itself is never taken from the form. The database works it
  // out (design 16.1).
  it("never sends a picture address, whatever the form contains", async () => {
    await saveDisplayName(
      {},
      form({
        display_name: "Cam",
        ...TICKED,
        avatar_url: "https://evil.example/pixel.png",
      }),
    );

    expect(mocks.upsert.mock.calls[0][0]).not.toHaveProperty("avatar_url");
  });

  // R62: the choice is saved first, then the database fills in (or leaves
  // empty) the address to match it.
  it("asks the database to store the picture after saving the choice", async () => {
    await saveDisplayName({}, form({ display_name: "Cam", ...TICKED }));

    expect(mocks.calls).toEqual([
      "upsert profiles",
      "rpc sync_profile_picture",
    ]);
  });

  // The name and the choice are saved; a picture that could not be fetched
  // this time will be stored at the next sign-in. Not worth an error.
  it("still succeeds when storing the picture fails", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "down" } });

    const result = await saveDisplayName(
      {},
      form({ display_name: "Cam", ...TICKED }),
    );

    expect(result).toBeUndefined();
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  describe("when something is wrong", () => {
    it("refuses a bad name without touching the database", async () => {
      const result = await saveDisplayName(
        {},
        form({ display_name: "   ", ...TICKED }),
      );

      expect(result?.message).toMatch(/enter a name/i);
      expect(mocks.calls).toEqual([]);
      expect(mocks.redirect).not.toHaveBeenCalled();
    });

    // E19: what the member typed and ticked is handed back, not lost.
    it("hands back what was typed and ticked", async () => {
      const long = "x".repeat(41);

      expect(
        await saveDisplayName({}, form({ display_name: long, ...TICKED })),
      ).toMatchObject({ value: long, showPicture: true });
      expect(
        await saveDisplayName({}, form({ display_name: long })),
      ).toMatchObject({ value: long, showPicture: false });
    });

    it("says so when the session has expired", async () => {
      mocks.claims.mockResolvedValue({ data: null });

      const result = await saveDisplayName(
        {},
        form({ display_name: "Cam", ...TICKED }),
      );

      expect(result?.message).toMatch(/session expired/i);
      expect(result).toMatchObject({ value: "Cam", showPicture: true });
      expect(mocks.calls).toEqual([]);
    });

    it("says so when the save fails, and does not go on to the picture", async () => {
      mocks.upsert.mockResolvedValue({ error: { message: "refused" } });

      const result = await saveDisplayName(
        {},
        form({ display_name: "Cam", ...TICKED }),
      );

      expect(result?.message).toMatch(/couldn't be saved/i);
      expect(mocks.calls).toEqual(["upsert profiles"]);
      expect(mocks.redirect).not.toHaveBeenCalled();
    });
  });
});
