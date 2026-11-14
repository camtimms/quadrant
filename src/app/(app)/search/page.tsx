import type { Metadata } from "next";
import { SearchBox } from "@/components/film/SearchBox";

export const metadata: Metadata = { title: "Search films" };

/**
 * /search — find a film to rate (R9–R13).
 *
 * The page itself is a Server Component and does almost nothing: it reads the
 * query from the address (/search?q=heat), if there is one, and hands it to
 * SearchBox, which does the searching in the browser.
 *
 * Being inside the (app) folder, it is only shown to members: the layout
 * checks that before anything here appears.
 */
export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  // In Next.js 16 searchParams is a promise, so it has to be awaited.
  const { q } = await searchParams;
  // ?q=a&q=b arrives as a list; just take the first.
  const initialQuery = (Array.isArray(q) ? q[0] : q) ?? "";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Search</h1>
      <SearchBox initialQuery={initialQuery} />
    </main>
  );
}
