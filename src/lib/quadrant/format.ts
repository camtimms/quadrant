/**
 * A score as text: "7" for a member's whole-number score, "6.3" for a group
 * average.
 */
export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
