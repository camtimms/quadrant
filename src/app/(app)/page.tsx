import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// Placeholder home page for the walking skeleton (task T1).
// It becomes the "My films" page in task T26.
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-3xl font-semibold">{SITE_NAME}</h1>
      <p>{SITE_DESCRIPTION}</p>
      <p className="text-sm opacity-70">
        Nothing to see yet. The app is being built.
      </p>
    </main>
  );
}
