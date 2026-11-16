"use client";

// "use client" because the highlighted link depends on which page the
// browser is showing, and that is only known in the browser as the member
// moves around. Everything else in the header stays on the server.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { pill, pillCurrent } from "@/components/ui/styles";
import { isCurrentPage, NAV_LINKS } from "@/lib/nav";

/**
 * The links between the three main pages, with the current one marked
 * (T31, R48).
 *
 * The current page is marked for everyone: aria-current="page", which a
 * screen reader announces as "current page", and a filled yellow pill with
 * bold text, outlined in light mode so it does not rely on colour (NFR14).
 *
 * Each pill has generous padding so it is an easy target for a thumb.
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

/**
 * The links themselves, as pills in a rounded track (NFR24). The current
 * page's pill is yellow; the others sit flat in the track, so only one
 * thing stands out. `pathname` null means "mark nothing".
 */
function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main">
      {/* inline-flex: the track is only as wide as its three pills. A very
          narrow screen wraps them rather than widening the page. */}
      <ul className="inline-flex flex-wrap items-center gap-1 rounded-full bg-well p-1 text-sm">
        {NAV_LINKS.map(({ label, href }) => {
          const current = pathname !== null && isCurrentPage(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                // The resting pill takes the track's own colour, so it
                // reads as part of the track until pressed.
                className={current ? pillCurrent : pill}
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
