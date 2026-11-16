import { expect, test } from "@playwright/test";

// No cookies at all: a stranger's browser.
test.use({ storageState: { cookies: [], origins: [] } });

// R1: a signed-out visitor sees only the sign-in page, and is brought back
// to where they were heading afterwards.
test("a signed-out visit goes to the sign-in page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Sign in with Google" }),
  ).toBeVisible();

  await page.goto("/friends");
  await expect(page).toHaveURL(/\/login\?next=%2Ffriends$/);
});
