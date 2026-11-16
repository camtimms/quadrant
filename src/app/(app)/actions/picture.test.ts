import { beforeEach, describe, expect, it, vi } from "vitest";

// The session, the database and storage are replaced, so these tests check
// the actions' decisions. The storage rules themselves are proven against
// the real database in tests/rls/avatars.test.ts.

const ME = "6a1f0c2e-9b7d-4e3a-8f21-0d5c4b3a2e1f";

const mocks = vi.hoisted(() => ({
  getCurrentMember: vi.fn(),
  refresh: vi.fn(),
  profile: { picture_source: "google", picture_version: 2 },
  updates: [] as unknown[],
  updateError: null as unknown,
  uploads: [] as { path: string; options: unknown }[],
  uploadError: null as unknown,
  listed: [] as { name: string }[],
  removed: [] as string[][],
}));

vi.mock("@/lib/auth/member", () => ({
  getCurrentMember: mocks.getCurrentMember,
}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({ data: mocks.profile, error: null }),
        update: (values: unknown) => {
          mocks.updates.push(values);
          return { eq: async () => ({ error: mocks.updateError }) };
        },
      };
      return query;
    },
    storage: {
      from: () => ({
        upload: async (path: string, _file: unknown, options: unknown) => {
          mocks.uploads.push({ path, options });
          return { error: mocks.uploadError };
        },
        list: async () => ({ data: mocks.listed, error: null }),
        remove: async (paths: string[]) => {
          mocks.removed.push(paths);
          return { data: [], error: null };
        },
      }),
    },
  }),
}));

import { removePicture, savePicture } from "@/app/(app)/actions/picture";

const jpegBytes = (size = 3000) => {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes;
};
const form = (blob: Blob | string | null) => {
  const data = new FormData();
  if (blob !== null) data.set("picture", blob);
  return data;
};
const jpeg = (size?: number) =>
  new Blob([jpegBytes(size)], { type: "image/jpeg" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile = { picture_source: "google", picture_version: 2 };
  mocks.updates.length = 0;
  mocks.uploads.length = 0;
  mocks.removed.length = 0;
  mocks.updateError = null;
  mocks.uploadError = null;
  mocks.listed = [{ name: "avatar-1.jpg" }, { name: "avatar-2.jpg" }];
  mocks.getCurrentMember.mockResolvedValue({ userId: ME, isMember: true });
});

describe("savePicture (R80)", () => {
  it("uploads under the next version's name and makes it the chosen picture", async () => {
    expect(await savePicture(form(jpeg()))).toEqual({ status: "ok" });
    expect(mocks.uploads).toEqual([
      {
        path: `${ME}/avatar-3.jpg`,
        options: { contentType: "image/jpeg", upsert: false },
      },
    ]);
    expect(mocks.updates).toEqual([
      { picture_source: "upload", picture_version: 3 },
    ]);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  // Design 23.1: older files go once the new one is saved.
  it("tidies away the member's older pictures afterwards", async () => {
    mocks.listed = [
      { name: "avatar-1.jpg" },
      { name: "avatar-2.jpg" },
      { name: "avatar-3.jpg" },
    ];
    await savePicture(form(jpeg()));
    expect(mocks.removed).toEqual([
      [`${ME}/avatar-1.jpg`, `${ME}/avatar-2.jpg`],
    ]);
  });

  // Checked by the bytes, not by the name or the declared type.
  it("refuses a file that does not start like a JPEG", async () => {
    const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
      type: "image/jpeg",
    });
    expect((await savePicture(form(png))).status).toBe("error");
    expect(mocks.uploads).toEqual([]);
  });

  it("refuses a file over 200 KB", async () => {
    expect((await savePicture(form(jpeg(201 * 1024)))).status).toBe("error");
    expect(mocks.uploads).toEqual([]);
  });

  it.each([
    ["no file", null],
    ["text instead of a file", "not a file"],
    ["an empty file", new Blob([])],
  ])("refuses %s", async (_, value) => {
    expect((await savePicture(form(value))).status).toBe("error");
    expect(mocks.uploads).toEqual([]);
  });

  it("refuses someone signed out or not a member", async () => {
    mocks.getCurrentMember.mockResolvedValue(null);
    expect((await savePicture(form(jpeg()))).status).toBe("error");
    mocks.getCurrentMember.mockResolvedValue({ userId: ME, isMember: false });
    expect((await savePicture(form(jpeg()))).status).toBe("error");
    expect(mocks.uploads).toEqual([]);
  });

  // E66: a failed upload leaves the choice alone.
  it("changes nothing when the upload fails", async () => {
    mocks.uploadError = { message: "storage down" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await savePicture(form(jpeg()))).status).toBe("error");
    expect(mocks.updates).toEqual([]);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

describe("removePicture (R81)", () => {
  it("deletes the member's files and shows their initial instead", async () => {
    mocks.profile = { picture_source: "upload", picture_version: 2 };
    expect(await removePicture()).toEqual({ status: "ok" });
    expect(mocks.removed).toEqual([
      [`${ME}/avatar-1.jpg`, `${ME}/avatar-2.jpg`],
    ]);
    expect(mocks.updates).toEqual([{ picture_source: "initial" }]);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  // Removing an upload that is not the chosen picture changes no choice.
  it("leaves another choice alone", async () => {
    mocks.profile = { picture_source: "google", picture_version: 2 };
    await removePicture();
    expect(mocks.updates).toEqual([]);
  });

  it("refuses someone who is not a member", async () => {
    mocks.getCurrentMember.mockResolvedValue({ userId: ME, isMember: false });
    expect((await removePicture()).status).toBe("error");
    expect(mocks.removed).toEqual([]);
  });
});
