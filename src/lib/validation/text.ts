/**
 * Count characters the way Postgres does.
 *
 * "abc".length is 3, but "🎬".length is 2: JavaScript's .length counts
 * 16-bit units, and most emoji need two. Spreading a string into an array
 * splits it into whole characters instead, which matches the database's
 * char_length(). Used wherever a length limit also exists as a database
 * CHECK, so the form and the database always agree.
 */
export const characterCount = (value: string) => [...value].length;
