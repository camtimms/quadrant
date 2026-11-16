"use server";

// "use server": these are Server Actions, called from the picture cropper
// in the browser but always run on the server. Each is a public door,
// callable with anything, so each checks everything itself (see rating.ts).

import { refresh } from "next/cache";
import { getCurrentMember } from "@/lib/auth/member";
import { PICTURE_BUCKET, pictureFilePath } from "@/lib/picture";
import { createClient } from "@/lib/supabase/server";

export type PictureResult =
  { status: "ok" } | { status: "error"; message: string };

/** The bucket's own limit (migration 7); checked here first, kindly. */
const MAX_BYTES = 200 * 1024;

const fail = (message: string): PictureResult => ({ status: "error", message });

/** Every JPEG file starts with these three bytes. */
async function looksLikeJpeg(file: Blob): Promise<boolean> {
  const start = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  return start[0] === 0xff && start[1] === 0xd8 && start[2] === 0xff;
}

/**
 * Save a member's uploaded picture (R80, design 23.3): the 256 x 256 JPEG
 * the cropper made, sent as the form field "picture".
 *
 * Order matters (E66): the file is uploaded first, under the NEXT
 * version's name, and only then does the profile point at it. A failed
 * upload therefore leaves the member's choice and picture exactly as they
 * were. Older files are tidied away last; if that fails, nothing shows it.
 */
export async function savePicture(formData: FormData): Promise<PictureResult> {
  const file = formData.get("picture");
  // A File is a Blob with a name; anything else (text, nothing) is refused.
  if (!(file instanceof Blob) || file.size === 0) {
    return fail("Choose a picture first.");
  }
  if (file.size > MAX_BYTES) return fail("That picture is too large.");
  // The bytes, not the name or the declared type, say what a file is.
  if (!(await looksLikeJpeg(file))) {
    return fail("That file couldn't be saved as a picture.");
  }

  try {
    const member = await getCurrentMember();
    if (!member) return fail("Your session expired. Sign in again.");
    if (!member.isMember) return fail("Only members can add a picture.");

    const supabase = await createClient();
    const { data: profile, error: readError } = await supabase
      .from("profiles")
      .select("picture_source, picture_version")
      .eq("id", member.userId)
      .single();
    if (readError || !profile) throw readError;

    const version = profile.picture_version + 1;
    const path = pictureFilePath(member.userId, version);
    const uploaded = await supabase.storage
      .from(PICTURE_BUCKET)
      .upload(path, file, { contentType: "image/jpeg", upsert: false });
    if (uploaded.error) {
      console.error("Uploading a picture failed:", uploaded.error);
      return fail("That picture couldn't be saved. Please try again.");
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ picture_source: "upload", picture_version: version })
      .eq("id", member.userId);
    if (updateError) throw updateError;

    await removeFiles(supabase, member.userId, path);
  } catch (error) {
    console.error("savePicture failed unexpectedly:", error);
    return fail("That picture couldn't be saved. Please try again.");
  }

  refresh();
  return { status: "ok" };
}

/**
 * Remove a member's uploaded picture (R81). If it was the chosen picture,
 * their initial is shown instead; any other choice is left as it is.
 */
export async function removePicture(): Promise<PictureResult> {
  try {
    const member = await getCurrentMember();
    if (!member) return fail("Your session expired. Sign in again.");
    if (!member.isMember) return fail("Only members can change a picture.");

    const supabase = await createClient();
    await removeFiles(supabase, member.userId, null);

    const { data: profile } = await supabase
      .from("profiles")
      .select("picture_source, picture_version")
      .eq("id", member.userId)
      .single();
    if (profile?.picture_source === "upload") {
      const { error } = await supabase
        .from("profiles")
        .update({ picture_source: "initial" })
        .eq("id", member.userId);
      if (error) throw error;
    }
  } catch (error) {
    console.error("removePicture failed unexpectedly:", error);
    return fail("That picture couldn't be removed. Please try again.");
  }

  refresh();
  return { status: "ok" };
}

/**
 * Delete the files in a member's folder, except `keep` (the one just
 * saved). The storage rules only let a member delete their own.
 */
async function removeFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keep: string | null,
): Promise<void> {
  const { data: files } = await supabase.storage
    .from(PICTURE_BUCKET)
    .list(userId);
  const old = (files ?? [])
    .map((file) => `${userId}/${file.name}`)
    .filter((path) => path !== keep);
  if (old.length > 0) {
    await supabase.storage.from(PICTURE_BUCKET).remove(old);
  }
}
