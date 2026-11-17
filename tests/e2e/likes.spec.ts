import { expect, test, type Locator } from "@playwright/test";
import { MEMBERS, storageStatePath } from "./support/members";
import { setScore } from "./support/rating";

/**
 * Press a like button and wait until it shows as liked.
 *
 * The page arrives as finished HTML before its JavaScript has loaded, so a
 * press in that first moment can land on a button that does nothing yet
 * (seen twice on 2026-11-16). Once the JavaScript is running, a press
 * changes the button at once, so: press, look briefly, and press again only
 * while the button still says "Like". It can never be pressed twice into
 * "not liked".
 */
async function pressLike(like: Locator, unlike: Locator) {
  await expect(async () => {
    if (await like.isVisible()) await like.click();
    await expect(unlike).toHaveAttribute("aria-pressed", "true", {
      timeout: 1_000,
    });
  }).toPass();
  await saved(unlike);
}

/**
 * Wait until a like or unlike has reached the server. The button shows the
 * change at once and marks itself busy (aria-disabled) until the save is
 * done; reloading before then would cut the save off (seen 2026-11-17).
 */
async function saved(button: Locator) {
  await expect(button).not.toHaveAttribute("aria-disabled", "true");
}

/** Clue (1985). */
const CLUE = 15196;
/** Psycho (1960). */
const PSYCHO = 539;

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
  const unlike = page.getByRole("button", {
    name: `Unlike ${MEMBERS.bob.displayName}'s review`,
  });
  await pressLike(like, unlike);
  await expect(page.getByText("Liked by you")).toBeVisible();

  // Saved for real: still there after a fresh load.
  await page.reload();
  await expect(unlike).toHaveAttribute("aria-pressed", "true");
  await expect(unlike).toContainText("1");

  // And taken back.
  await unlike.click();
  await expect(like).toHaveAttribute("aria-pressed", "false");
  await saved(like);
  await expect(page.getByText(/Liked by/)).toHaveCount(0);
  await page.reload();
  await expect(like).toHaveAttribute("aria-pressed", "false");
});

// R78 (design 22): a like given in the Friends' films feed is the same
// like as on the film page.
test("a like in the Friends' films feed shows on the film page", async ({
  page,
  browser,
}) => {
  const bobContext = await browser.newContext({
    storageState: storageStatePath("bob"),
  });
  const bobPage = await bobContext.newPage();
  await bobPage.goto(`/film/${PSYCHO}`);
  await setScore(bobPage, "Quality", 9);
  await setScore(bobPage, "Enjoyment", 8);
  await bobPage
    .getByRole("textbox", { name: /Review/ })
    .fill("The shower scene still works.");
  await bobPage.getByRole("button", { name: "Save rating" }).click();
  await expect(
    bobPage.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
  await bobContext.close();

  // Most recent is Friends' films' first order: Bob's rating is at the top.
  await page.goto("/friends");
  await expect(
    page.getByRole("heading", { name: /Recent ratings/ }),
  ).toBeVisible();
  const entry = page
    .getByRole("listitem")
    .filter({ hasText: "The shower scene still works." });
  await expect(entry).toContainText(MEMBERS.bob.displayName);
  await pressLike(
    entry.getByRole("button", {
      name: `Like ${MEMBERS.bob.displayName}'s review`,
    }),
    entry.getByRole("button", {
      name: `Unlike ${MEMBERS.bob.displayName}'s review`,
    }),
  );

  // The film page shows the very same like.
  await page.goto(`/film/${PSYCHO}`);
  await expect(
    page.getByRole("button", {
      name: `Unlike ${MEMBERS.bob.displayName}'s review`,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Liked by you")).toBeVisible();
});
