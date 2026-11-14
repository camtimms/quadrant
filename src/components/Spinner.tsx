/**
 * A small spinning ring meaning "working on it" (NFR23).
 *
 * It is drawn with nothing but a border: a circle whose border is the text
 * colour all the way round except the top, which is see-through. Spinning it
 * makes the gap go round.
 *
 * It is decoration (aria-hidden): wherever it is used, words nearby or the
 * element's own label say what is happening, which is what a screen reader
 * needs. For members who have asked their device to reduce motion it stays
 * visible but does not spin.
 */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none ${className}`}
    />
  );
}
