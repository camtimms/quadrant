import { expect, test } from "@playwright/test";
import { MEMBERS, storageStatePath } from "./support/members";
import { setScore } from "./support/rating";

/** Clue (1985). */
const CLUE = 15196;

// R69–R71 (design 20): like a friend's review, see it kept, take it back.
test("like a friend's review, then take the like back", async ({
  page,
  browser,
}) => {
  // Bob rates the film with a written review, in his own browser.
  const bobContext = await browser.newContext({
    storageState: storageStatePath("bob"),
  });
  const bobPage = await bobContext.newPage();
  await bobPage.goto(`/film/${CLUE}`);
  await setScore(bobPage, "Quality", 8);
  await setScore(bobPage, "Enjoyment", 9);
  await bobPage
    .getByRole("textbox", { name: /Review/ })
    .fill("Communism was just a red herring.");
  await bobPage.getByRole("button", { name: "Save rating" }).click();
  await expect(
    bobPage.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await bobContext.close();

  // Alice (this test's page) likes it.
  await page.goto(`/film/${CLUE}`);
  const like = page.getByRole("button", {
    name: `Like ${MEMBERS.bob.displayName}'s review`,
  });
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await like.click();

  const unlike = page.getByRole("button", {
    name: `Unlike ${MEMBERS.bob.displayName}'s review`,
  });
  await expect(unlike).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Liked by you")).toBeVisible();

  // Saved for real: still there after a fresh load.
  await page.reload();
  await expect(unlike).toHaveAttribute("aria-pressed", "true");
  await expect(unlike).toContainText("1");

  // And taken back.
  await unlike.click();
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText(/Liked by/)).toHaveCount(0);
  await page.reload();
  await expect(like).toHaveAttribute("aria-pressed", "false");
});
