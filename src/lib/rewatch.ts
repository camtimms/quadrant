// Words for the rewatch log (R84, R85). Pure functions, so they are tested
// directly and used the same way on every page.

/**
 * "Watched twice", "Watched 3 times", or "" for a single watch: a film
 * watched once says nothing, because that is what rating it means.
 * Anything that is not a whole number above 1 is treated as one watch.
 */
export function timesWatchedLabel(times: number | undefined): string {
  if (times === undefined || !Number.isInteger(times) || times < 2) return "";
  return times === 2 ? "Watched twice" : `Watched ${times} times`;
}

// Built once: making a formatter is slow compared with using one.
// en-GB gives "12 Mar 2026" (day first, short month). The time zone is
// fixed to UTC so the server, the tests and every visitor see the same day;
// a viewing logged late in the evening far from UTC may show the next or
// previous day, which for "when did I watch this" is close enough.
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** The day a viewing was logged, as "12 Mar 2026", or "" if unreadable. */
export function viewingDate(timestamp: string): string {
  const time = Date.parse(timestamp);
  return Number.isNaN(time) ? "" : DATE_FORMAT.format(time);
}
