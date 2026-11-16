import { expect, test } from "@playwright/test";
import { MEMBERS, storageStatePath } from "./support/members";
import { setScore } from "./support/rating";

/** Casablanca (1942): no other end-to-end test rates it. */
const CASABLANCA = 289;

// R79 (design 23): upload your own picture, and friends see it beside your
// rating, served through the members-only picture route.
test("upload your own picture and a friend sees it", async ({
  page,
  browser,
}) => {
  // Alice (this test's page) rates a film, so she has a card to show.
  await page.goto(`/film/${CASABLANCA}`);
  await setScore(page, "Quality", 9);
  await setScore(page, "Enjoyment", 9);
  await page.getByRole("button", { name: "Save rating" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toBeVisible();

  // Any real JPEG will do as "a photo": a screenshot of the page is one.
  const photo = await page.screenshot({
    type: "jpeg",
    clip: { x: 0, y: 0, width: 300, height: 400 },
  });

  await page.goto("/welcome");
  await page.getByRole("button", { name: "Upload a picture" }).click();
  await page.getByLabel("Choose a photo").setInputFiles({
    name: "me.jpg",
    mimeType: "image/jpeg",
    buffer: photo,
  });
  await expect(page.getByTestId("crop-photo")).toBeVisible();
  await page.getByRole("button", { name: "Save picture" }).click();

  // Saved: the page comes back with "my own picture" chosen and previewed.
  const own = page.getByRole("radio", { name: /My own picture/ });
  await expect(own).toBeChecked();
  await expect(
    page.getByTestId("picture-preview").locator("img"),
  ).toHaveAttribute("src", /^\/api\/avatar\/[0-9a-f-]+\?v=\d+$/);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL("/");

  // Bob sees Alice's picture on her card, and it really loads.
  const bobContext = await browser.newContext({
    storageState: storageStatePath("bob"),
  });
  const bobPage = await bobContext.newPage();
  await bobPage.goto(`/film/${CASABLANCA}`);
  const card = bobPage
    .getByTestId("rating-card")
    .filter({ hasText: MEMBERS.alice.displayName });
  const picture = card.getByTestId("avatar").locator("img");
  await expect(picture).toHaveAttribute("src", /^\/api\/avatar\//);
  await expect
    .poll(() => picture.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await bobContext.close();
});
