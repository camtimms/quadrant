/**
 * What `npm run backup` does, as data (design section 11: Supabase's free
 * plan keeps no backups, so the owner takes their own now and then).
 *
 * Three files, the split and flags Supabase's own backup guide uses
 * (supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore):
 *   roles.sql   database roles (this app adds none, but a restore expects it)
 *   schema.sql  tables, functions and row-level-security policies
 *   data.sql    every row, including the sign-in accounts in auth.users
 *
 * The dumps are made by the Supabase command-line tool, which runs the
 * standard Postgres tool pg_dump inside Docker, so nothing extra needs
 * installing beyond Docker Desktop. This file only works out the commands;
 * scripts/backup.ts runs them. Keeping it free of side effects is what lets
 * it be tested.
 */

/**
 * The production project's id, as in package.json's `db:push:prod`. Not a
 * secret: it is part of the project's public address.
 */
export const PROD_PROJECT_REF = "ykmpktjnqlmmirfciycq";

export type BackupTarget = "dev" | "prod";

export type BackupStep = {
  /** Where this dump is written. */
  file: string;
  /** Arguments for the `supabase` command. */
  args: string[];
};

export function backupPlan(
  target: BackupTarget,
  now: Date,
): { folder: string; steps: BackupStep[] } {
  // "2026-11-16T03:04:05.678Z" -> "2026-11-16T03-04-05Z". Colons are not
  // allowed in Windows file names, and the milliseconds are noise.
  const stamp = now
    .toISOString()
    .replace(/\.\d+Z$/, "Z")
    .replaceAll(":", "-");
  // backups/ is git-ignored: a dump holds every member's email and review.
  const folder = `backups/${target}-${stamp}`;

  // Plain --remote means the linked project, which is always dev (README).
  const remote =
    target === "prod" ? `--remote=${PROD_PROJECT_REF}` : "--remote";

  const step = (name: string, extra: string[]): BackupStep => {
    const file = `${folder}/${name}.sql`;
    return { file, args: ["db", "dump", remote, ...extra, "--file", file] };
  };

  return {
    folder,
    steps: [
      step("roles", ["--role-only"]),
      step("schema", []),
      // COPY statements load far faster than one INSERT per row on restore.
      // The two excluded tables are left out by Supabase's own guide (see
      // README, "Maintenance"); this app stores no files, so they are empty.
      step("data", [
        "--data-only",
        "--use-copy",
        "-x",
        "storage.buckets_vectors",
        "-x",
        "storage.vector_indexes",
      ]),
    ],
  };
}
