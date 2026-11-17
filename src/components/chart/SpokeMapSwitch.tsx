"use client";

// "use client" because it remembers which hub was chosen. The map itself
// has no state; this only decides what it is given.

import { useState, type ReactNode } from "react";
import { SpokeMap } from "@/components/chart/SpokeMap";
import { DisagreementTable } from "@/components/film/DisagreementTable";
import type { MemberRating } from "@/components/film/RatingCards";
import { pill, pillCurrent } from "@/components/ui/styles";

type Props = {
  /** Every member's current rating of the film, the viewer's included. */
  ratings: readonly MemberRating[];
  /**
   * Shown between the map and the table: the group's numbers, with the
   * spread curves folded under them (R99, R101). Drawn on the server and
   * passed in, so this client component does not need their code.
   */
  between?: ReactNode;
};

type Hub = "average" | "me";

const CHOICES: readonly { hub: Hub; label: string }[] = [
  { hub: "average", label: "From the average" },
  { hub: "me", label: "From me" },
];

/**
 * The body of "Everyone's ratings" (R99): a switch for where the lines
 * start (R97), the spoke map, the group's numbers, and the table, which
 * follows the same switch so it always measures what the map draws (R100).
 *
 * It starts on the average on every visit, as the owner asked, so the
 * choice lives only in React state: not in the address, not in the
 * browser's storage. The switch is offered only when "From me" can mean
 * something: the viewer has rated the film, and so has somebody else.
 */
export function SpokeMapSwitch({ ratings, between }: Props) {
  const [hub, setHub] = useState<Hub>("average");
  const canSwitch =
    ratings.some((rating) => rating.isViewer) && ratings.length > 1;

  return (
    <div className="flex flex-col gap-4">
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
      {between}
      <DisagreementTable ratings={ratings} hub={hub} />
    </div>
  );
}
