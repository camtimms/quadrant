import { expect, test } from "@playwright/test";
import { MEMBERS, storageStatePath } from "./support/members";
import { ratingSummary, setScore, submitScores } from "./support/rating";

// Signed in as E2E Alice (the default in playwright.config.ts).

/** Vertigo (1958): no other end-to-end test rates it. */
const VERTIGO = 426;

// R83–R85, R87 (design 24): log a rewatch, see the count and the earlier
// viewing, and a friend sees the count too; deleting takes every viewing.
test("log a rewatch, then delete every viewing", async ({ page, browser }) => {
  await page.goto(`/film/${VERTIGO}`);
  await page.getByRole("textbox", { name: /Review/ }).fill("Slow at first.");
  await submitScores(page, { quality: 6, enjoyment: 5 }, "Save rating");
  await expect(ratingSummary(page)).toContainText("Quality 6 · Enjoyment 5");
  await expect(ratingSummary(page)).not.toContainText("Watched");

  // The rewatch: new scores and a new review; the old ones are kept.
  await ratingSummary(page).click();
  await page.getByRole("button", { name: "Log a rewatch" }).click();
  await setScore(page, "Quality", 9);
  await setScore(page, "Enjoyment", 8);
  await expect(page.getByRole("textbox", { name: /Review/ })).toHaveValue("");
  await page
    .getByRole("textbox", { name: /Review/ })
    .fill("A masterpiece the second time.");
  await page.getByRole("button", { name: "Log rewatch" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await expect(ratingSummary(page)).toContainText(
    "Quality 9 · Enjoyment 8 · Masterpieces · Watched twice",
  );

  // The earlier viewing, under the member's own rating.
  await ratingSummary(page).click();
  const earlier = page.getByRole("region", { name: "Earlier viewings" });
  await expect(earlier).toContainText("Quality 6 · Enjoyment 5");
  await expect(earlier).toContainText("Slow at first.");

  // Bob sees the count on Alice's card, and her new review, not the old one.
  const bobContext = await browser.newContext({
    storageState: storageStatePath("bob"),
  });
  const bobPage = await bobContext.newPage();
  await bobPage.goto(`/film/${VERTIGO}`);
  const card = bobPage
    .getByTestId("rating-card")
    .filter({ hasText: MEMBERS.alice.displayName });
  await expect(card).toContainText("Watched twice");
  await expect(card).toContainText("A masterpiece the second time.");
  await expect(card).not.toContainText("Slow at first.");
  await expect(bobPage.getByText("Earlier viewings")).toHaveCount(0);
  await bobContext.close();

  // Deleting names the earlier viewing and takes it too (R87).
  await page.getByRole("button", { name: "Delete rating" }).click();
  await expect(
    page.getByText("Delete your rating of Vertigo and your earlier viewing?"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(
    page.getByRole("heading", { name: "Rate this film" }),
  ).toBeVisible();
  await expect(page.getByText("Earlier viewings")).toHaveCount(0);
});
