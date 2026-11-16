import { describe, expect, it } from "vitest";
import { isCurrentPage, NAV_LINKS } from "@/lib/nav";

describe("NAV_LINKS (T31)", () => {
  it("lists the three main pages, in order", () => {
    expect(NAV_LINKS.map((link) => [link.label, link.href])).toEqual([
      ["My films", "/"],
      ["Friends' films", "/friends"],
      ["Search", "/search"],
    ]);
  });
});

describe("isCurrentPage", () => {
  it("marks My films only on the home page itself", () => {
    expect(isCurrentPage("/", "/")).toBe(true);
    // Every address starts with "/", so a prefix test would mark My films
    // as current everywhere.
    expect(isCurrentPage("/friends", "/")).toBe(false);
    expect(isCurrentPage("/film/10999", "/")).toBe(false);
  });

  it("marks a section on its own page", () => {
    expect(isCurrentPage("/friends", "/friends")).toBe(true);
    expect(isCurrentPage("/search", "/search")).toBe(true);
  });

  // The pathname never includes "?filter=…", but a trailing slash can
  // appear if someone types one.
  it("ignores a trailing slash", () => {
    expect(isCurrentPage("/friends/", "/friends")).toBe(true);
  });

  it("does not mark a section for an address that merely starts the same", () => {
    expect(isCurrentPage("/friendship", "/friends")).toBe(false);
    expect(isCurrentPage("/searches", "/search")).toBe(false);
  });

  // A film or a member's page belongs to none of the three.
  it("marks nothing on a film or member page", () => {
    for (const path of ["/film/10999", "/members/abc"]) {
      expect(NAV_LINKS.some((link) => isCurrentPage(path, link.href))).toBe(
        false,
      );
    }
  });
});
