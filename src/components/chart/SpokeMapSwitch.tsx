"use client";

// "use client" because it remembers which hub was chosen. The map itself
// has no state; this only decides what it is given.

import { useState } from "react";
import { SpokeMap } from "@/components/chart/SpokeMap";
import type { MemberRating } from "@/components/film/RatingCards";
import { pill, pillCurrent } from "@/components/ui/styles";

type Props = {
  /** Every member's current rating of the film, the viewer's included. */
  ratings: readonly MemberRating[];
};

type Hub = "average" | "me";

const CHOICES: readonly { hub: Hub; label: string }[] = [
  { hub: "average", label: "From the average" },
  { hub: "me", label: "From me" },
];

/**
 * The spoke map with a switch for where its lines start (R97): the group
 * average, or the viewer's own rating.
 *
 * It starts on the average on every visit, as the owner asked, so the
 * choice lives only in React state: not in the address, not in the
 * browser's storage. The switch is offered only when "From me" can mean
 * something: the viewer has rated the film, and so has somebody else.
 */
export function SpokeMapSwitch({ ratings }: Props) {
  const [hub, setHub] = useState<Hub>("average");
  const canSwitch =
    ratings.some((rating) => rating.isViewer) && ratings.length > 1;

  return (
    <div className="flex flex-col gap-3">
      {canSwitch ? (
        // A group of two toggle buttons. aria-pressed tells a screen reader
        // which one is on; the pressed one is also yellow and bold, so it
        // is not told apart by colour alone (NFR14).
        <div
          role="group"
          aria-label="Draw the lines"
          className="flex flex-wrap gap-2"
        >
          {CHOICES.map((choice) => (
            <button
              key={choice.hub}
              type="button"
              aria-pressed={hub === choice.hub}
              onClick={() => setHub(choice.hub)}
              className={
                // The same sizes as the filter chips, so neither jumps.
                hub === choice.hub
                  ? `${pillCurrent} text-sm`
                  : `${pill} text-sm`
              }
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : null}
      <SpokeMap ratings={ratings} hub={hub} />
    </div>
  );
}
