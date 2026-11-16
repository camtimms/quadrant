import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DisplayNameForm } from "@/components/profile/DisplayNameForm";
import { card, mutedText, textLink } from "@/components/ui/styles";
import { getCurrentMember } from "@/lib/auth/member";
import { PICTURE_BUCKET, pictureAddress } from "@/lib/picture";
import { createClient } from "@/lib/supabase/server";
import type { PictureChoice } from "@/lib/validation/profile";
import { SITE_NAME } from "@/lib/site";

/**
 * Choose or change a display name (R7), and which picture friends see:
 * your Google picture, one you upload, or just your initial (R79).
 *
 * A member lands here automatically the first time they sign in, because the
 * signed-in layout sends anyone without a profile to this page. They can
 * come back later from the header to change the name.
 *
 * This page deliberately lives OUTSIDE the (app) folder. Everything in (app)
 * requires a profile, so a page whose job is to create one cannot be inside
 * it: the member would be redirected here, forever.
 */
export default function WelcomePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-4 sm:p-6">
      <div className={`${card} flex flex-col gap-6 p-6`}>
        <Suspense fallback={<p className={`text-sm ${mutedText}`}>Loading…</p>}>
          <WelcomeContent />
        </Suspense>
      </div>
    </main>
  );
}

async function WelcomeContent() {
  const member = await getCurrentMember();

  // proxy.ts already redirects signed-out visitors, but this page is outside
  // the (app) layout, so it does its own membership check too.
  if (!member) redirect("/login");
  if (!member.isMember) redirect("/auth/not-invited");

  const isFirstVisit = member.displayName === null;

  // Is there an uploaded picture? The member's folder in the picture bucket
  // says (design 23.4); the storage rules only let them list their own.
  const supabase = await createClient();
  const { data: files } = await supabase.storage
    .from(PICTURE_BUCKET)
    .list(member.userId);
  const ownPicture =
    files && files.length > 0
      ? pictureAddress({
          userId: member.userId,
          source: "upload",
          googleUrl: null,
          version: member.pictureVersion,
        })
      : null;

  // Start on the stored choice, unless that picture is not there any more
  // (a Google account without one, or an upload since removed).
  let pictureChoice: PictureChoice = member.pictureSource;
  if (pictureChoice === "google" && !member.googlePicture)
    pictureChoice = "initial";
  if (pictureChoice === "upload" && !ownPicture) pictureChoice = "initial";

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">
          {isFirstVisit ? `Welcome to ${SITE_NAME}` : "Your name and picture"}
        </h1>
        <p>
          {isFirstVisit
            ? "What should your friends see you as?"
            : "Change the name and picture your friends see beside your ratings."}
        </p>
      </div>
      <DisplayNameForm
        initialName={member.displayName ?? member.suggestedName}
        submitLabel={isFirstVisit ? "Continue" : "Save"}
        pictureChoice={pictureChoice}
        googlePicture={member.googlePicture}
        ownPicture={ownPicture}
        // A new key rebuilds the form after an upload or removal, so it
        // starts again from what is now stored.
        key={`${ownPicture ?? "none"}-${pictureChoice}`}
      />
      {isFirstVisit ? null : (
        <Link href="/" className={`${textLink} self-start text-sm`}>
          Cancel
        </Link>
      )}
    </>
  );
}
