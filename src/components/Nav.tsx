"use client";

// "use client" because the highlighted link depends on which page the
// browser is showing, and that is only known in the browser as the member
// moves around. Everything else in the header stays on the server.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { isCurrentPage, NAV_LINKS } from "@/lib/nav";

/**
 * The links between the three main pages, with the current one marked
 * (T31, R48).
 *
 * The current page is marked two ways: aria-current="page", which a screen
 * reader announces as "current page", and a bold underline, which does not
 * depend on colour (NFR14).
 *
 * Each link has generous padding so it is an easy target for a thumb.
 *
 * Why the Suspense: reading the address (usePathname) makes this part of
 * the page depend on the request. With Cache Components switched on,
 * Next.js insists that such a part sits inside <Suspense>, so the rest of
 * the page can be prepared ahead of time. The fallback is the same links
 * with nothing marked, so they are there and usable at once; the marker
 * appears a moment later.
 */
export function Nav() {
  return (
    <Suspense fallback={<NavLinks pathname={null} />}>
      <CurrentNavLinks />
    </Suspense>
  );
}

function CurrentNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

/** The links themselves. `pathname` null means "mark nothing". */
function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main">
      {/* -mx-2 lines the text up with the edge of the header while the
          links keep their padding as touch area. */}
      <ul className="-mx-2 flex flex-wrap items-center text-sm">
        {NAV_LINKS.map(({ label, href }) => {
          const current = pathname !== null && isCurrentPage(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`inline-block rounded px-2 py-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 active:bg-foreground/25 ${
                  current ? "font-semibold underline decoration-2" : ""
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
