import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { NO_INDEX } from "@/lib/site";

// NFR6: nothing on this site may be publicly indexable.
describe("robots.txt", () => {
  it("disallows everything for every crawler", () => {
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
  });

  it("does not advertise a sitemap or allow any path", () => {
    const result = robots();
    expect(result.sitemap).toBeUndefined();
    expect(result.rules).not.toHaveProperty("allow");
  });
});

describe("page-level robots metadata", () => {
  it("tells crawlers not to index or follow", () => {
    expect(NO_INDEX).toEqual({ index: false, follow: false });
  });
});
