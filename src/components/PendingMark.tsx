"use client";

// "use client" because it uses a hook that watches what the browser is doing.

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/Spinner";

/**
 * A spinner that shows on a link while the page it leads to is loading
 * (NFR23). Put it INSIDE a <Link>: that is how it knows which link it
 * belongs to.
 *
 * Why it is needed: tapping a link starts loading the next page, but the
 * current page stays on screen until that is ready. Without a sign that the
 * tap registered, people tap again, or assume the app has frozen.
 *
 * useLinkStatus() is provided by Next.js. `pending` is true from the moment
 * the link is followed until the new page is shown.
 *
 * The mark is ALWAYS rendered and only its opacity changes. If it were
 * added and removed instead, the text beside it would jump sideways each
 * time. The short delay before it appears stops it flickering on and off
 * when a page loads almost instantly.
 */
export function PendingMark({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      data-testid="pending-mark"
      data-pending={pending}
      className={`inline-flex transition-opacity ${
        pending ? "opacity-100 delay-150" : "opacity-0"
      } ${className}`}
    >
      <Spinner />
    </span>
  );
}
