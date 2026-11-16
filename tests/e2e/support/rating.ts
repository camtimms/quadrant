import { expect, type Page } from "@playwright/test";

/**
 * Set a score slider the way a person on a keyboard would: Home takes it to
 * 0, then one Right arrow per point. Keys rather than Playwright's fill(),
 * because fill() sets the value behind React's back and React may not
 * notice; key presses go through the same events as a real person's.
 */
export async function setScore(
  page: Page,
  name: "Quality" | "Enjoyment",
  score: number,
): Promise<void> {
  const slider = page.getByRole("slider", { name, exact: true });
  await slider.focus();
  await slider.press("Home");
  for (let step = 0; step < score; step++) await slider.press("ArrowRight");
  await expect(slider).toHaveValue(String(score));
}

/**
 * On a film page, fill in the open rating form and press its button
 * ("Save rating" the first time, "Update rating" after), then wait for the
 * page to come back saying "Saved" (R23).
 */
export async function submitScores(
  page: Page,
  scores: { quality: number; enjoyment: number },
  button: "Save rating" | "Update rating",
): Promise<void> {
  await setScore(page, "Quality", scores.quality);
  await setScore(page, "Enjoyment", scores.enjoyment);
  await page.getByRole("button", { name: button }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();
}

/**
 * The folded-away "Your rating" section's one-line summary, e.g.
 * "Quality 8 · Enjoyment 9 · Masterpieces".
 */
export function ratingSummary(page: Page) {
  return page.locator("summary").filter({ hasText: "Your rating" });
}
