/**
 * Reading a whole table when the database will not hand it over in one go.
 *
 * Supabase's API returns at most a fixed number of rows per request (1,000
 * on this project: design section 15, V5), however many match. It does not
 * report an error when there are more; it simply stops. A page that needs
 * EVERY row, like Friends' films, would work perfectly until the group's
 * thousand-and-first rating and then quietly show wrong averages.
 *
 * So the rows are read in pages: rows 0 to 999, then 1,000 to 1,999, and so
 * on, until all of them have arrived.
 *
 * This function knows nothing about Supabase. It is given a function that
 * fetches one page, which keeps it testable without a database.
 */

/** How many rows are asked for at a time. */
export const PAGE_SIZE = 1000;

/** A safety limit: 100 pages is 100,000 rows, far beyond this app. */
const MAX_PAGES = 100;

/** One page, in the shape a Supabase query answers with. */
type Page<T> = {
  data: T[] | null;
  error: unknown;
  /** The total number of matching rows, if the query asked for it. */
  count: number | null;
};

/**
 * Fetch every row by asking for one page after another.
 *
 * `fetchPage(from, to)` must return the rows at positions `from` to `to`
 * inclusive (Supabase's `.range(from, to)`), always in the same order.
 *
 * How it knows when to stop:
 *  - if pages report the total (`count`), when it has that many rows;
 *  - otherwise, when a page comes back empty.
 * It does NOT stop at the first page that is shorter than it asked for. If
 * the project's cap were ever set lower than PAGE_SIZE, every page would be
 * "short" and that rule would drop most of the rows. Instead, each request
 * starts from however many rows have actually arrived.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<Page<T>>,
  pageSize: number = PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error, count } = await fetchPage(
      rows.length,
      rows.length + pageSize - 1,
    );
    if (error || !data) {
      throw new Error("Could not load the rows.", { cause: error });
    }

    rows.push(...data);

    // An empty page means there is nothing further, whatever the total
    // said: rows can be deleted while we are reading.
    if (data.length === 0) return rows;
    if (count !== null && rows.length >= count) return rows;
  }

  throw new Error(`Could not load the rows: too many pages (${MAX_PAGES}).`);
}
