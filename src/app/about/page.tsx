import type { Metadata } from "next";
import Link from "next/link";
import { SiteLogo } from "@/components/SiteLogo";
import { card, mutedText, textLink } from "@/components/ui/styles";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { TMDB_LOGO_PATH, TMDB_NOTICE, TMDB_URL } from "@/lib/tmdb/attribution";

export const metadata: Metadata = { title: `About ${SITE_NAME}` };

/**
 * /about — what this site is, and the credit to TMDB that their terms of use
 * require (NFR18).
 *
 * This page is public (it is on the allow-list in src/lib/auth/paths.ts): a
 * credit that only members could read would not be much of a credit. It
 * shows nothing private, just fixed text.
 */
export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        {/* Our own name is the biggest thing on the page on purpose: TMDB
            asks that their logo be less prominent than the app's own. */}
        <h1 className="flex items-center gap-3 text-3xl font-semibold">
          <SiteLogo size={40} />
          {SITE_NAME}
        </h1>
        <p>{SITE_DESCRIPTION}</p>
      </div>

      <section
        aria-labelledby="film-data"
        className={`${card} flex flex-col gap-3`}
      >
        <h2 id="film-data" className="text-lg font-semibold">
          Film data
        </h2>
        <p>
          Film titles, release years and posters come from{" "}
          <a
            href={TMDB_URL}
            // Opens in a new tab; "noreferrer" stops TMDB being told which
            // page of ours the visitor came from.
            target="_blank"
            rel="noreferrer"
            className={textLink}
          >
            The Movie Database (TMDB)
          </a>
          .
        </p>
        {/* A plain <img>: it is a small fixed file of our own, so there is
            nothing for Next.js's image optimiser to do. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={TMDB_LOGO_PATH}
          alt="TMDB logo"
          // The file is about 7.7 times wider than it is tall. Giving both
          // numbers lets the browser reserve the space before it loads.
          width={139}
          height={18}
          className="h-[18px] w-[139px]"
        />
        <p className={`text-sm ${mutedText}`}>{TMDB_NOTICE}</p>
      </section>

      {/* NFR5, NFR7: say plainly what personal data is shown and where it
          is loaded from (design 16.3). */}
      <section
        aria-labelledby="pictures"
        className={`${card} flex flex-col gap-3`}
      >
        <h2 id="pictures" className="text-lg font-semibold">
          Members&apos; pictures
        </h2>
        <p data-testid="pictures-notice">
          The picture beside a member&apos;s name is their Google account
          picture. It is loaded from Google&apos;s servers, so Google sees that
          a picture was requested, but not who is signed in here or which page
          they are on. Each member can switch their picture off where they set
          their display name, and friends then see the first letter of their
          name instead.
        </p>
      </section>

      <p>
        <Link href="/" className={textLink}>
          Back to {SITE_NAME}
        </Link>
      </p>
    </main>
  );
}
