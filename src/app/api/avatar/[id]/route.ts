import { getCurrentMember } from "@/lib/auth/member";
import { createClient } from "@/lib/supabase/server";
import { PICTURE_BUCKET, pictureFilePath } from "@/lib/picture";
import { parseMemberId } from "@/lib/validation/memberId";

/**
 * GET /api/avatar/<member id>?v=<version> — a member's uploaded picture
 * (R79, R82, design 23.2).
 *
 * Pictures are in a PRIVATE storage bucket, so nobody can open one from an
 * address alone (NFR6). This route is the only way to see one: proxy.ts
 * already turns away signed-out visitors (as for every /api route), the
 * membership check below turns away anyone else, and the file is read with
 * the viewer's own session, so the bucket's rules decide too.
 *
 * The `?v=` in the address is the picture's version. It is not read here
 * (the profile says which file is current); it is there so that a new
 * picture has a new address, which lets browsers keep each one for a day
 * without ever showing a replaced picture.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const member = await getCurrentMember();
  if (!member) return new Response(null, { status: 401 });
  if (!member.isMember) return new Response(null, { status: 403 });

  const userId = parseMemberId((await params).id);
  if (userId === null) return notFound();

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("picture_source, picture_version")
    .eq("id", userId)
    .maybeSingle();
  // Only a member who chose their uploaded picture has one to show.
  if (error || !profile || profile.picture_source !== "upload") {
    return notFound();
  }

  const file = await supabase.storage
    .from(PICTURE_BUCKET)
    .download(pictureFilePath(userId, profile.picture_version));
  if (file.error || !file.data) return notFound();

  return new Response(file.data, {
    headers: {
      "Content-Type": "image/jpeg",
      // Kept by the viewer's own browser only ("private"), for a day.
      "Cache-Control": "private, max-age=86400",
    },
  });
}

/** Avatar shows the member's initial when a picture is not found (E68). */
function notFound(): Response {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });
}
