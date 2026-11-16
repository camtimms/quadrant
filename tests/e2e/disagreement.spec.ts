import { expect, test } from "@playwright/test";
import { MEMBERS, storageStatePath } from "./support/members";
import { submitScores } from "./support/rating";

/** Jaws (1975). */
const JAWS = 578;

// R38–R41: when two members have rated a film, each sees how far the other
// is from them, as a line on the chart and as a number in a table.
test("a film two members rated shows the disagreement table", async ({
  page,
  browser,
}) => {
  // Bob rates it first, in his own browser.
  const bobContext = await browser.newContext({
    storageState: storageStatePath("bob"),
  });
  const bobPage = await bobContext.newPage();
  await bobPage.goto(`/film/${JAWS}`);
  await submitScores(bobPage, { quality: 9, enjoyment: 3 }, "Save rating");
  await bobContext.close();

  // Then Alice (this test's own page). Her point is (6, 7) and Bob's is
  // (9, 3): 3 across and 4 down, so the line between them is exactly 5.
  await page.goto(`/film/${JAWS}`);
  await submitScores(page, { quality: 6, enjoyment: 7 }, "Save rating");

  const table = page.getByRole("table", {
    name: /How far each friend is from you/,
  });
  await expect(table).toBeVisible();

  const bobRow = table
    .getByRole("row")
    .filter({ hasText: MEMBERS.bob.displayName });
  // The last cell holds the number and then its "Biggest disagreement"
  // badge, run together in the cell's text: "5Biggest disagreement". The
  // (?!\d) makes sure the number is 5 and not, say, 5.5 or 50.
  await expect(bobRow.getByRole("cell")).toHaveText(["9", "3", /^5(?![\d.])/]);
  // With one friend, theirs is the biggest disagreement, marked in words.
  await expect(bobRow).toContainText("Biggest disagreement");
});
