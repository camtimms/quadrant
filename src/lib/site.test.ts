import { describe, expect, it } from "vitest";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// A deliberately tiny test. Its real job in this first task is to prove the
// test runner, TypeScript and the "@/..." import alias all work together.
describe("site constants", () => {
  it("has a name and a description", () => {
    expect(SITE_NAME).toBe("Quadrant");
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(0);
  });
});
