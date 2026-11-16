/**
 * The two members the tests sign in as. Kept apart from testData.ts, which
 * reads secret settings the moment it is imported: playwright.config.ts
 * needs these names before it has loaded those settings.
 */
export const MEMBERS = {
  alice: { label: "alice", displayName: "E2E Alice" },
  bob: { label: "bob", displayName: "E2E Bob" },
} as const;

export type MemberKey = keyof typeof MEMBERS;

/** Where each member's saved browser state (their cookies) is kept. */
export function storageStatePath(member: MemberKey): string {
  // Git-ignored: it holds a live session for a dev-project test user.
  return `tests/e2e/.auth/${member}.json`;
}
