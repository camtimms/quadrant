/**
 * A member's id is a UUID: 32 hexadecimal digits in groups of 8-4-4-4-12,
 * such as 3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b. Supabase gives every user
 * one when they first sign in.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check a member id that arrived in an address such as /members/<id>.
 *
 * It is text typed into an address bar, so it is checked before it goes
 * anywhere near the database. Asking Postgres for the member "alice" is not
 * dangerous (the query is parameterised), but it fails with an error instead
 * of finding nobody, and that error would show as a broken page where "not
 * found" is the honest answer.
 *
 * Returns the id in lower case, or null if it is not a UUID.
 */
export function parseMemberId(input: unknown): string | null {
  if (typeof input !== "string" || !UUID.test(input)) return null;
  return input.toLowerCase();
}
