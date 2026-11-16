import { describe, expect, it } from "vitest";
import { backupPlan, PROD_PROJECT_REF } from "@/lib/maintenance/backupPlan";

// What `npm run backup` will do, worked out without running anything. The
// script itself only creates the folder and runs these commands.

const NOW = new Date("2026-11-16T03:04:05.678Z");

describe("backupPlan", () => {
  it("names the folder after the project and the time, safe on Windows", () => {
    // No colons: Windows does not allow them in file names.
    expect(backupPlan("dev", NOW).folder).toBe(
      "backups/dev-2026-11-16T03-04-05Z",
    );
    expect(backupPlan("prod", NOW).folder).toBe(
      "backups/prod-2026-11-16T03-04-05Z",
    );
  });

  it("dumps roles, schema and data, as Supabase's backup guide does", () => {
    const steps = backupPlan("dev", NOW).steps;
    expect(steps.map((step) => step.file)).toEqual([
      "backups/dev-2026-11-16T03-04-05Z/roles.sql",
      "backups/dev-2026-11-16T03-04-05Z/schema.sql",
      "backups/dev-2026-11-16T03-04-05Z/data.sql",
    ]);
    expect(steps[0].args).toContain("--role-only");
    expect(steps[1].args).not.toContain("--data-only");
    expect(steps[1].args).not.toContain("--role-only");
    expect(steps[2].args).toEqual(
      expect.arrayContaining(["--data-only", "--use-copy"]),
    );
    // Left out by the guide's data dump too.
    expect(steps[2].args.join(" ")).toContain(
      "-x storage.buckets_vectors -x storage.vector_indexes",
    );
  });

  it("targets the linked project (dev) by default", () => {
    for (const step of backupPlan("dev", NOW).steps) {
      expect(step.args.slice(0, 3)).toEqual(["db", "dump", "--remote"]);
      expect(step.args.join(" ")).not.toContain(PROD_PROJECT_REF);
    }
  });

  it("targets production by its project id when asked", () => {
    expect(PROD_PROJECT_REF).toBe("ykmpktjnqlmmirfciycq");
    for (const step of backupPlan("prod", NOW).steps) {
      expect(step.args.slice(0, 3)).toEqual([
        "db",
        "dump",
        `--remote=${PROD_PROJECT_REF}`,
      ]);
    }
  });

  it("writes each dump to its own file", () => {
    for (const step of backupPlan("prod", NOW).steps) {
      const at = step.args.indexOf("--file");
      expect(step.args[at + 1]).toBe(step.file);
    }
  });
});
