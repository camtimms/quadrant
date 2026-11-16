/**
 * npm run backup          dump quadrant-dev to backups/dev-<time>/
 * npm run backup:prod     dump quadrant-prod to backups/prod-<time>/
 *
 * Supabase's free plan keeps no backups (design section 11), so the owner
 * takes their own now and then. What is dumped, and why in three files, is
 * explained in src/lib/maintenance/backupPlan.ts; restoring is in README.md.
 *
 * Needs Docker Desktop running: the Supabase command-line tool runs pg_dump
 * inside it. Uses the tool's own sign-in (the same one `db:push` uses), so
 * no database password goes in any file.
 *
 * The dump holds every member's email address and review. backups/ is
 * git-ignored; keep the files somewhere private.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { backupPlan } from "@/lib/maintenance/backupPlan";

function run(command: string, args: string[], quiet = false): number {
  const result = spawnSync(command, args, {
    stdio: quiet ? "ignore" : "inherit",
    // On Windows, `supabase` and `docker` are .cmd/.exe wrappers that only
    // a shell finds. The arguments are all fixed text from backupPlan, never
    // anything typed in, so passing them through a shell is safe.
    shell: true,
  });
  return result.status ?? 1;
}

function main(): number {
  const target = process.argv.includes("--prod") ? "prod" : "dev";

  if (run("docker", ["info"], true) !== 0) {
    console.error(
      "Docker is not running. Start Docker Desktop, wait until it says it is running, and try again.",
    );
    return 1;
  }

  const { folder, steps } = backupPlan(target, new Date());
  mkdirSync(folder, { recursive: true });
  console.log(`Backing up quadrant-${target} to ${folder}/ ...`);

  for (const step of steps) {
    // `npx` finds the Supabase tool installed in this project.
    if (run("npx", ["supabase", ...step.args]) !== 0) {
      console.error(`Could not write ${step.file}. Nothing else was changed.`);
      return 1;
    }
  }

  console.log("\nDone:");
  for (const step of steps) {
    const kb = Math.ceil(statSync(step.file).size / 1024);
    console.log(`  ${step.file}  (${kb} KB)`);
  }
  return 0;
}

process.exit(main());
