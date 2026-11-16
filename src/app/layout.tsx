import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { NO_INDEX, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/themeChoice";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  // Becomes <meta name="robots" content="noindex, nofollow"> on every page (NFR6).
  robots: NO_INDEX,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The script below may add data-theme to this element before React
      // starts. That is deliberate, so React is told not to object that
      // the page differs from the server's copy (R68, design 18).
      suppressHydrationWarning
    >
      <head>
        {/* Applies a light or dark mode chosen earlier on this device
            before anything is painted, so there is no flash of the other
            mode (E42). Fixed text from src/lib/themeChoice.ts, nothing from
            a member in it, which is what makes writing it out raw safe. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {/* On every page, signed in or not: the link to the TMDB credit
            (NFR18). Pages use "flex-1" to fill the height, which keeps this
            at the bottom of the screen even when a page is short. */}
        <Footer />
      </body>
    </html>
  );
}
