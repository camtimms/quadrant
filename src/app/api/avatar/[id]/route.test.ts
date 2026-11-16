import { beforeEach, describe, expect, it, vi } from "vitest";

// The session, the database and storage are replaced, so these tests check
// the route's decisions. Who may read which file is proven against the
// real database in tests/rls/avatars.test.ts.

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  profile: vi.fn(),
  download: vi.fn(),
  downloadedPath: [] as string[],
}));

vi.mock("@/lib/auth/member", () => ({
  getCurrentMember: mocks.getCurrentMember,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => mocks.profile(),
      };
      return query;
    },
    storage: {
      from: () => ({
        download: async (path: string) => {
          mocks.downloadedPath.push(path);
          return mocks.download();
        },
      }),
    },
  }),
}));

import { GET } from "@/app/api/avatar/[id]/route";

const ID = "6a1f0c2e-9b7d-4e3a-8f21-0d5c4b3a2e1f";
const call = (id = ID) =>
  GET(new Request(`https://quadrant.example/api/avatar/${id}?v=3`), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.downloadedPath.length = 0;
  mocks.getCurrentMember.mockResolvedValue({ userId: "me", isMember: true });
  mocks.profile.mockReturnValue({
    data: { picture_source: "upload", picture_version: 3 },
    error: null,
  });
  mocks.download.mockReturnValue({
    data: new Blob([new Uint8Array([0xff, 0xd8, 0xff])], {
      type: "image/jpeg",
    }),
    error: null,
  });
});

describe("GET /api/avatar/<id> (R82, design 23.2)", () => {
  it("serves the member's current uploaded picture as a JPEG", async () => {
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([0xff, 0xd8, 0xff]),
    );
    // The file for the version on the profile (design 23.1).
    expect(mocks.downloadedPath).toEqual([`${ID}/avatar-3.jpg`]);
  });

  // Cached by the viewer's own browser only, for a day; the version in the
  // address changes when the picture does.
  it("lets the browser keep it privately for a day", async () => {
    const response = await call();
    expect(response.headers.get("cache-control")).toBe(
      "private, max-age=86400",
    );
  });

  it("refuses someone who is not signed in or not a member", async () => {
    mocks.getCurrentMember.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    mocks.getCurrentMember.mockResolvedValue({ userId: "x", isMember: false });
    expect((await call()).status).toBe(403);
    expect(mocks.downloadedPath).toEqual([]);
  });

  it("is not found for an address that is not a member id", async () => {
    expect((await call("../../secrets")).status).toBe(404);
    expect(mocks.downloadedPath).toEqual([]);
  });

  it("is not found when the member has not chosen an uploaded picture", async () => {
    mocks.profile.mockReturnValue({
      data: { picture_source: "google", picture_version: 3 },
      error: null,
    });
    expect((await call()).status).toBe(404);
    expect(mocks.downloadedPath).toEqual([]);
  });

  it("is not found for an unknown member or a missing file", async () => {
    mocks.profile.mockReturnValue({ data: null, error: null });
    expect((await call()).status).toBe(404);
    mocks.profile.mockReturnValue({
      data: { picture_source: "upload", picture_version: 3 },
      error: null,
    });
    mocks.download.mockReturnValue({
      data: null,
      error: { message: "Object not found" },
    });
    expect((await call()).status).toBe(404);
  });
});
