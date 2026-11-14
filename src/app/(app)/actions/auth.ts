"use server";

// "use server" marks every function exported from this file as a Server
// Action: it runs on the server, but a form in the browser can call it.

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/paths";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Start signing in with Google (R2).
 *
 * This does not sign anyone in by itself. It asks Supabase for the address of
 * Google's sign-in page and sends the browser there. Google then sends the
 * person back to /auth/callback, which finishes the job.
 */
export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next")?.toString());
  const supabase = await createClient();

  const callbackUrl = new URL(
    "/auth/callback",
    getPublicEnv().NEXT_PUBLIC_SITE_URL,
  );
  callbackUrl.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    redirect("/login?error=sign-in-failed");
  }
  redirect(data.url);
}

/** End the session on this device and return to the sign-in page (R8). */
export async function signOut() {
  const supabase = await createClient();
  // scope "local" ends the session on this device only, which is what R8
  // asks for; the member stays signed in on their other devices.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
