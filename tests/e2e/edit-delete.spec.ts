import { expect, test } from "@playwright/test";
import { ratingSummary, submitScores } from "./support/rating";

// Signed in as E2E Alice (the default in playwright.config.ts).

/** Alien (1979). Any real film works; the app stores it on first rating. */
const ALIEN = 348;

// R20, R21: change a rating, then delete it, and My films follows.
test("edit a rating, then delete it", async ({ page }) => {
  await page.goto(`/film/${ALIEN}`);
  await expect(
    page.getByRole("heading", { name: "Rate this film" }),
  ).toBeVisible();
  await submitScores(page, { quality: 8, enjoyment: 9 }, "Save rating");
  await expect(ratingSummary(page)).toContainText(
    "Quality 8 · Enjoyment 9 · Masterpieces",
  );

  // Edit: open the folded section and move the scores. Quality 2 is
  // "very low" and enjoyment 9 "very high": a guilty pleasure (R24).
  await ratingSummary(page).click();
  await submitScores(page, { quality: 2, enjoyment: 9 }, "Update rating");
  await expect(ratingSummary(page)).toContainText(
    "Quality 2 · Enjoyment 9 · Guilty Pleasures",
  );

  // My films shows the new scores, not the old ones.
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Alien (1979): quality 2, enjoyment 9, Guilty Pleasures",
    }),
  ).toBeVisible();

  // Delete: two steps, the second naming the film (R21).
  await page.goto(`/film/${ALIEN}`);
  await ratingSummary(page).click();
  await page.getByRole("button", { name: "Delete rating" }).click();
  await expect(page.getByText("Delete your rating of Alien?")).toBeVisible();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(
    page.getByRole("heading", { name: "Rate this film" }),
  ).toBeVisible();

  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /^Alien \(1979\)/ }),
  ).toHaveCount(0);
});
