import { expect, test } from "@playwright/test";
import { submitScores } from "./support/rating";

// Signed in as E2E Alice (the default in playwright.config.ts).

// R9, R15, R30: find a film, rate it, and see it on My films where the
// scores say it belongs.
test("search, rate, and the film appears on My films in the right quadrant", async ({
  page,
}) => {
  await page.goto("/search");
  await page.getByLabel("Search films").fill("Heat");

  // The 1995 film, not the many others called Heat. The result is one link
  // holding the poster, title and year.
  const result = page
    .getByRole("link")
    .filter({ hasText: /^\s*Heat\s*1995/ })
    .first();
  await result.click();
  await expect(page).toHaveURL(/\/film\/949$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Heat/);

  // 8 and 9 are both 7.5 or more: a masterpiece (R24).
  await submitScores(page, { quality: 8, enjoyment: 9 }, "Save rating");

  await page.goto("/");
  const point = page.getByRole("button", {
    name: "Heat (1995): quality 8, enjoyment 9, Masterpieces",
  });
  await expect(point).toBeVisible();

  // And it is drawn in the top-right quarter of the chart: right of the
  // middle (quality above 5) and above it (enjoyment above 5). Measured
  // against the chart's drawing area, from the page as it is laid out.
  const where = await point.evaluate((element) => {
    const chart = element.closest("[data-zoom-layer]")!.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return {
      across: (box.x + box.width / 2 - chart.x) / chart.width,
      down: (box.y + box.height / 2 - chart.y) / chart.height,
    };
  });
  expect(where.across).toBeGreaterThan(0.5);
  expect(where.down).toBeLessThan(0.5);
});
