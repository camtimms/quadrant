import { test as teardown } from "@playwright/test";
import { removeAllE2eData } from "./support/testData";

/**
 * Runs once after every test has finished (the "cleanup" project in
 * playwright.config.ts), pass or fail, so the dev project is left as it
 * was found: no test members, no test ratings.
 */
teardown("remove the test members and their ratings", async () => {
  await removeAllE2eData();
});
