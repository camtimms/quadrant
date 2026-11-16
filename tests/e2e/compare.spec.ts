import { expect, test } from "@playwright/test";
import { MEMBERS, storageStatePath } from "./support/members";
import { submitScores } from "./support/rating";

/** The Godfather (1972). */
const GODFATHER = 238;

// R75, R76 (design 21.2): from a member's page to "you and them".
test("compare yourself with a member from their page", async ({
  page,
  browser,
}) => {
  // Bob rates the film in his own browser.
  const bobContext = await browser.newContext({
    storageState: storageStatePath("bob"),
  });
  const bobPage = await bobContext.newPage();
  await bobPage.goto(`/film/${GODFATHER}`);
  await submitScores(bobPage, { quality: 9, enjoyment: 9 }, "Save rating");
  await bobContext.close();

  // Alice rates it too, then follows Bob's name to his page.
  await page.goto(`/film/${GODFATHER}`);
  await submitScores(page, { quality: 2, enjoyment: 3 }, "Save rating");
  await page
    .getByRole("link", { name: MEMBERS.bob.displayName, exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: `${MEMBERS.bob.displayName}'s films` }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Compare with me" }).click();
  await expect(page).toHaveURL(/\/members\/[^/]+\/compare$/);
  await expect(
    page.getByRole("heading", { name: `You and ${MEMBERS.bob.displayName}` }),
  ).toBeVisible();

  // Both charts, each with its point for the film.
  await expect(
    page.getByRole("heading", { name: "You", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^The Godfather \(1972\): quality 2/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^The Godfather \(1972\): quality 9/ }),
  ).toBeVisible();

  // The film both rated, with both ratings and the distance between them.
  const row = page
    .getByRole("listitem")
    .filter({ hasText: "The Godfather" })
    .filter({ hasText: "apart" });
  await expect(row).toContainText("You: Quality 2 · Enjoyment 3");
  await expect(row).toContainText(
    `${MEMBERS.bob.displayName}: Quality 9 · Enjoyment 9`,
  );
  // 7 across and 6 down: about 9.2 apart.
  await expect(row).toContainText("9.2 apart");
});
