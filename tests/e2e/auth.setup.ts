import { test as setup } from "@playwright/test";
import { MEMBERS, storageStatePath, type MemberKey } from "./support/members";
import { createSignedInMember, removeAllE2eData } from "./support/testData";

/**
 * Runs once before the tests (the "setup" project in playwright.config.ts).
 *
 * It clears out anything an earlier run left behind, creates two throwaway
 * members, and saves a signed-in browser state for each. A test then starts
 * already signed in by naming that file, instead of signing in every time.
 */
setup("create two signed-in members", async ({ browser, baseURL }) => {
  await removeAllE2eData();

  const host = new URL(baseURL!).hostname;
  for (const member of Object.keys(MEMBERS) as MemberKey[]) {
    const context = await browser.newContext();
    await context.addCookies(await createSignedInMember(member, host));
    await context.storageState({ path: storageStatePath(member) });
    await context.close();
  }
});
