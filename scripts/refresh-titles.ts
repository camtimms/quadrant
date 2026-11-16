/**
 * npm run refresh-titles          refresh film copies in quadrant-dev
 * npm run refresh-titles:prod     ... in quadrant-prod
 *
 * Fetches again from TMDB every stored film whose copy is more than 150
 * days old, because TMDB's terms forbid keeping their data for longer than
 * six months (E10, NFR18, design section 4.3). Film pages refresh their own
 * copy after 30 days; this catches films nobody has opened. Run it every
 * month or two; it is safe to run at any time and changes nothing else.
 *
 * Settings come from .env.local for dev, and from .env.prod.local for prod:
 * a git-ignored file holding the production values of the four variables
 * this needs (see .env.example). It is deliberately NOT called
 * .env.production.local, because Next.js would read that file in every
 * production build on this machine, including the end-to-end tests', and
 * point them at real data.
 *
 * Run through tsx (see package.json), which understands TypeScript and the
 * "@/..." imports, with the "react-server" condition so that the app's
 * `import "server-only"` guard lets a script through.
 */
import { existsSync } from "node:fs";
import { PROD_PROJECT_REF } from "@/lib/maintenance/backupPlan";

async function main(): Promise<number> {
  const prod = process.argv.includes("--prod");
  const envFile = prod ? ".env.prod.local" : ".env.local";
  if (!existsSync(envFile)) {
    console.error(
      `${envFile} is missing. See "Maintenance" in README.md for what goes in it.`,
    );
    return 1;
  }
  process.loadEnvFile(envFile);

  // Safety catch: the file must point at the project the command names, so
  // a mixed-up file is caught before anything is written.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const isProdUrl = url.includes(`//${PROD_PROJECT_REF}.`);
  if (prod !== isProdUrl) {
    console.error(
      `Refusing to run: ${envFile} points at ${url || "nothing"}, which is not the ${prod ? "production" : "dev"} project.`,
    );
    return 1;
  }

  // Imported only now, after the settings are in place.
  const { refreshStaleTitles, REFRESH_AFTER_DAYS } =
    await import("@/lib/titles/refreshStale");

  console.log(
    `Refreshing film copies older than ${REFRESH_AFTER_DAYS} days in ${new URL(url).host} ...`,
  );
  const report = await refreshStaleTitles();

  console.log(
    `Checked ${report.checked}; refreshed ${report.refreshed.length}.`,
  );
  for (const name of report.refreshed) console.log(`  refreshed  ${name}`);
  if (report.notOnTmdb.length > 0) {
    console.log(
      "\nNo longer on TMDB (old copy kept, because members' ratings point at it):",
    );
    for (const name of report.notOnTmdb) console.log(`  ${name}`);
  }
  if (report.failed.length > 0) {
    console.error("\nCould not refresh (try again later):");
    for (const line of report.failed) console.error(`  ${line}`);
    return 1;
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
