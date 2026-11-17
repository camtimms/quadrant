import { classify, PLACEMENT_LABELS } from "@/lib/quadrant";

/**
 * "Where would this land?" — shown under the sliders and updated as they
 * move, before anything is saved.
 *
 * It calls the same `classify` function as the charts, the lists and the
 * save action, so what is promised here is always what happens (R29).
 */
export function PlacementPreview({
  quality,
  enjoyment,
}: {
  /** null while that score is not chosen yet (R92). */
  quality: number | null;
  enjoyment: number | null;
}) {
  if (quality === null || enjoyment === null) {
    return (
      <p
        data-testid="placement-preview"
        aria-live="polite"
        className="rounded-xl bg-well px-3 py-2 text-sm text-ink-muted"
      >
        Choose both scores to see where it lands.
      </p>
    );
  }
  const placement = classify({ quality, enjoyment });

  return (
    <p
      data-testid="placement-preview"
      // aria-live="polite": a screen reader reads the new placement out when
      // it changes, once the member pauses, without interrupting them.
      aria-live="polite"
      className="rounded-xl bg-well px-3 py-2 text-sm"
    >
      <span className="text-ink-muted">
        {quality} / {enjoyment} is{" "}
      </span>
      <strong className="font-semibold">{PLACEMENT_LABELS[placement]}</strong>
    </p>
  );
}
