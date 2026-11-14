import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_ICON_BACKGROUND, SITE_NAME } from "@/lib/site";

/**
 * Next.js turns this function into /manifest.webmanifest and links to it
 * from every page.
 *
 * A web manifest is what a phone reads when someone chooses "Add to Home
 * screen": the name to put under the icon, which icon to use, and what
 * colour to show while the site opens (NFR25). Writing it in code, not as a
 * fixed file, means the name comes from SITE_NAME like everywhere else.
 *
 * It is on the public-paths list (src/lib/auth/paths.ts): browsers fetch a
 * manifest without the member's cookies, and it says nothing private.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    // "standalone" opens the saved site without the browser's address bar.
    display: "standalone",
    background_color: SITE_ICON_BACKGROUND,
    theme_color: SITE_ICON_BACKGROUND,
    // Android asks for these two sizes. The files live in public/icons.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
