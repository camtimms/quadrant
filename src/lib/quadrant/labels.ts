import type { Placement } from "@/lib/quadrant/types";

/**
 * The words members actually read (NFR22).
 *
 * The keys on the left are internal names used in code and in URLs such as
 * ?filter=serious-watches. The strings on the right are what is displayed.
 * To rename a placement, change the string on the right and nothing else:
 * placements are never stored in the database, so no data needs migrating.
 *
 * "Serious Watches" is a working name the owner expects may change.
 */
export const PLACEMENT_LABELS: Record<Placement, string> = {
  masterpieces: "Masterpieces",
  "guilty-pleasures": "Guilty Pleasures",
  "serious-watches": "Serious Watches",
  "not-worth-watching": "Not Worth Watching",
  good: "Good",
  bad: "Bad",
  enjoyable: "Enjoyable",
  "not-enjoyable": "Not Enjoyable",
  "on-the-fence": "On the fence",
};

/**
 * The words at the two ends of each slider and each chart axis (R49).
 * They point at the labels above instead of repeating the strings, so
 * renaming "Good" in one place renames it on the sliders and the chart too.
 */
export const SCALE_END_LABELS = {
  quality: { low: PLACEMENT_LABELS.bad, high: PLACEMENT_LABELS.good },
  enjoyment: {
    low: PLACEMENT_LABELS["not-enjoyable"],
    high: PLACEMENT_LABELS.enjoyable,
  },
} as const;
