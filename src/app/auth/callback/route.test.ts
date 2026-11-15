import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Supabase is replaced with a stand-in, so these tests are about the order
// of the steps and where each outcome sends the visitor.

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  rpc: vi.fn(),
  signOut: vi.fn(),
  /** Every Supabase call, in the order it was made. */
  calls: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: async (code: string) => {
        mocks.calls.push("exchange");
        return mocks.exchange(code);
      },
      signOut: async (options: unknown) => {
        mocks.calls.push("signOut");
        return mocks.signOut(options);
      },
    },
    rpc: async (name: string) => {
      mocks.calls.push(`rpc ${name}`);
      return mocks.rpc(name);
    },
  }),
}));

const ORIGIN = "https://quadrant.test";

function visit(query: string) {
  return GET(new NextRequest(`${ORIGIN}/auth/callback${query}`));
}

/** Where a response sends the browser, without the site's own address. */
const destination = (response: Response) =>
  response.headers.get("location")?.replace(ORIGIN, "");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.exchange.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  // A member, and the picture is stored without trouble.
  mocks.rpc.mockImplementation(async (name: string) =>
    name === "is_current_user_member"
      ? { data: true, error: null }
      : { data: null, error: null },
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /auth/callback", () => {
  it("signs a member in and sends them to the app", async () => {
    const response = await visit("?code=abc");

    expect(mocks.exchange).toHaveBeenCalledWith("abc");
    expect(destination(response)).toBe("/");
  });

  // R62: the picture follows the member's Google account.
  it("stores the member's Google picture once they are known to be a member", async () => {
    await visit("?code=abc");

    expect(mocks.calls).toEqual([
      "exchange",
      "rpc is_current_user_member",
      "rpc sync_profile_picture",
    ]);
  });

  // A picture is not worth refusing a sign-in over.
  it("still signs the member in when storing the picture fails", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "is_current_user_member"
        ? { data: true, error: null }
        : { data: null, error: { message: "down" } },
    );

    expect(destination(await visit("?code=abc"))).toBe("/");
  });

  it("still signs the member in when storing the picture throws", async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "is_current_user_member") return { data: true, error: null };
      throw new Error("network");
    });

    expect(destination(await visit("?code=abc"))).toBe("/");
  });

  // R4
  it("signs out someone who is not on the invite list, storing no picture", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });

    const response = await visit("?code=abc");

    expect(destination(response)).toBe("/login?error=not-invited");
    expect(mocks.calls).toEqual([
      "exchange",
      "rpc is_current_user_member",
      "signOut",
    ]);
  });

  it("sends a visit with no code back to sign-in, touching nothing", async () => {
    const response = await visit("");

    expect(destination(response)).toBe("/login?error=sign-in-failed");
    expect(mocks.calls).toEqual([]);
  });

  it("sends a failed exchange back to sign-in", async () => {
    mocks.exchange.mockResolvedValue({ error: { message: "bad code" } });

    const response = await visit("?code=abc");

    expect(destination(response)).toBe("/login?error=sign-in-failed");
    expect(mocks.calls).toEqual(["exchange"]);
  });

  it("goes on to the page the visitor first asked for", async () => {
    expect(destination(await visit("?code=abc&next=/friends"))).toBe(
      "/friends",
    );
  });

  // The address is typed by whoever made the link, so it is not trusted.
  it("ignores a 'next' that leads off the site", async () => {
    expect(
      destination(await visit("?code=abc&next=https://evil.example/")),
    ).toBe("/");
  });
});
