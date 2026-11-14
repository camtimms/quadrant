import type { MetadataRoute } from "next";

/**
 * Next.js turns this function into /robots.txt.
 *
 * The app is private to a group of friends (NFR6), so every crawler is asked
 * to stay away from every path. This is a polite request, not security:
 * well-behaved crawlers obey it, but it stops nobody. The real protection is
 * sign-in plus the database's row-level security (design sections 3.5 and 5).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
