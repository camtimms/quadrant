import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  createTestUser,
  PG,
  removeAllTestData,
  signedOutClient,
  type TestUser,
} from "./helpers";

/**
 * Uploaded pictures (R79–R82, design 23.1), proven from outside: the
 * storage bucket's rules and the two new profile columns, tried as a
 * browser would try them.
 */

const BUCKET = "avatars";

// The smallest bytes a JPEG starts with; storage checks the declared type
// and the size, the app's own action checks the bytes (design 23.3).
const jpeg = (bytes = 2000) => {
  const data = new Uint8Array(bytes);
  data.set([0xff, 0xd8, 0xff, 0xe0]);
  return data;
};
const pathOf = (user: TestUser) => `${user.id}/avatar-1.jpg`;

let alice: TestUser;
let bob: TestUser;
let mallory: TestUser; // signed in, never invited

const upload = (
  user: TestUser,
  path: string,
  data: Uint8Array,
  contentType = "image/jpeg",
) =>
  user.client.storage
    .from(BUCKET)
    .upload(path, data, { contentType, upsert: true });

/** Remove every file the tests put in the bucket (owner's view). */
async function removeTestFiles() {
  for (const user of [alice, bob, mallory].filter(Boolean)) {
    await admin.storage.from(BUCKET).remove([pathOf(user)]);
  }
}

beforeAll(async () => {
  await removeAllTestData();
  [alice, bob] = await Promise.all([
    createTestUser("pic-alice"),
    createTestUser("pic-bob"),
  ]);
  mallory = await createTestUser("pic-mallory", { invited: false });
  for (const [user, name] of [
    [alice, "Alice"],
    [bob, "Bob"],
  ] as const) {
    const { error } = await user.client
      .from("profiles")
      .insert({ id: user.id, display_name: name });
    if (error) throw error;
  }
});

afterAll(async () => {
  await removeTestFiles();
  await removeAllTestData();
});

describe("the avatars bucket (design 23.1)", () => {
  // R82: never served to anyone with just an address.
  it("is private, takes only JPEGs, and at most 200 KB a file", async () => {
    const { data, error } = await admin.storage.getBucket(BUCKET);
    expect(error).toBeNull();
    expect(data).toMatchObject({
      public: false,
      allowed_mime_types: ["image/jpeg"],
      file_size_limit: 200 * 1024,
    });
  });
});

describe("uploading your own picture (R80, R81)", () => {
  it("lets a member upload into their own folder", async () => {
    const { error } = await upload(alice, pathOf(alice), jpeg());
    expect(error).toBeNull();
  });

  it("lets them replace it in place", async () => {
    const { error } = await upload(alice, pathOf(alice), jpeg(3000));
    expect(error).toBeNull();
  });

  it("refuses an upload into someone else's folder", async () => {
    const { error } = await upload(bob, pathOf(alice), jpeg());
    expect(error).not.toBeNull();
  });

  it("refuses a file that is not a JPEG", async () => {
    const { error } = await upload(bob, pathOf(bob), jpeg(), "image/png");
    expect(error).not.toBeNull();
  });

  it("refuses a file over 200 KB", async () => {
    const { error } = await upload(bob, pathOf(bob), jpeg(201 * 1024));
    expect(error).not.toBeNull();
  });

  it("refuses an upload from someone who is not a member", async () => {
    const { error } = await upload(mallory, pathOf(mallory), jpeg());
    expect(error).not.toBeNull();
  });
});

describe("seeing a picture (R82)", () => {
  it("lets another member read it", async () => {
    const { data, error } = await bob.client.storage
      .from(BUCKET)
      .download(pathOf(alice));
    expect(error).toBeNull();
    expect(data?.size).toBe(3000);
  });

  it("shows nothing to someone who is not a member", async () => {
    const { data } = await mallory.client.storage
      .from(BUCKET)
      .download(pathOf(alice));
    expect(data).toBeNull();
  });

  it("shows nothing to a signed-out visitor", async () => {
    const { data } = await signedOutClient()
      .storage.from(BUCKET)
      .download(pathOf(alice));
    expect(data).toBeNull();
  });
});

describe("removing a picture (R81)", () => {
  it("does not let a member delete someone else's", async () => {
    await bob.client.storage.from(BUCKET).remove([pathOf(alice)]);
    const { data } = await alice.client.storage
      .from(BUCKET)
      .download(pathOf(alice));
    expect(data).not.toBeNull();
  });

  it("lets a member delete their own", async () => {
    const removed = await alice.client.storage
      .from(BUCKET)
      .remove([pathOf(alice)]);
    expect(removed.error).toBeNull();
    // remove() lists what it actually deleted: nothing, if a rule refused.
    expect(removed.data?.map((file) => file.name)).toEqual([pathOf(alice)]);
    // The bucket's own listing is the real state: the file is gone. (A
    // download straight after can still return the old copy for a while,
    // from Supabase's cache; hence a new file name per upload, design 23.1.)
    const listed = await admin.storage.from(BUCKET).list(alice.id);
    expect(listed.data?.map((file) => file.name) ?? []).toEqual([]);
  });
});

describe("the picture choice on a profile (R79)", () => {
  const sourceOf = async (user: TestUser) => {
    const { data, error } = await user.client
      .from("profiles")
      .select("picture_source, show_picture, picture_version")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    return data;
  };

  it("starts as the Google picture", async () => {
    expect(await sourceOf(bob)).toMatchObject({
      picture_source: "google",
      show_picture: true,
      picture_version: 0,
    });
  });

  it("can be any of the three choices, and nothing else", async () => {
    for (const choice of ["upload", "initial", "google"] as const) {
      const { error } = await bob.client
        .from("profiles")
        .update({ picture_source: choice })
        .eq("id", bob.id);
      expect(error).toBeNull();
    }
    const { error } = await bob.client
      .from("profiles")
      // Deliberately not one of the three choices.
      .update({ picture_source: "banana" })
      .eq("id", bob.id);
    expect(error?.code).toBe(PG.checkViolation);
  });

  // The old on/off switch keeps meaning "Google picture on" (design 23.1),
  // so the sign-in code and T29a's rule keep working.
  it("keeps the old on/off switch in step", async () => {
    await bob.client
      .from("profiles")
      .update({ picture_source: "initial" })
      .eq("id", bob.id);
    expect((await sourceOf(bob)).show_picture).toBe(false);
    await bob.client
      .from("profiles")
      .update({ picture_source: "google" })
      .eq("id", bob.id);
    expect((await sourceOf(bob)).show_picture).toBe(true);
  });

  // The form on the live site writes only the old switch until T41d; the
  // choice must follow it, or turning the picture off would stop working.
  it("follows the old switch when only the switch is changed", async () => {
    await bob.client
      .from("profiles")
      .update({ show_picture: false })
      .eq("id", bob.id);
    expect(await sourceOf(bob)).toMatchObject({
      picture_source: "initial",
      show_picture: false,
    });
    await bob.client
      .from("profiles")
      .update({ show_picture: true })
      .eq("id", bob.id);
    expect(await sourceOf(bob)).toMatchObject({
      picture_source: "google",
      show_picture: true,
    });
  });

  it("lets a member raise their own picture's version, not someone else's", async () => {
    await bob.client
      .from("profiles")
      .update({ picture_version: 3 })
      .eq("id", bob.id);
    expect((await sourceOf(bob)).picture_version).toBe(3);

    await bob.client
      .from("profiles")
      .update({ picture_version: 99 })
      .eq("id", alice.id);
    expect((await sourceOf(alice)).picture_version).toBe(0);
  });
});
