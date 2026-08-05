import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteAllData,
  getExclusionRules,
  getFeedbackReports,
  protectAccount,
  getProtectedAccounts,
  submitFeedback,
  addExclusionRule as dbAddExclusionRule,
} from "@/lib/db/queries";
import { buildBackup, parseBackupFile, restoreBackup } from "./index";

/**
 * Regression coverage for a real data-loss bug: buildBackup/restoreBackup
 * originally omitted the protectedAccounts table entirely, so exporting a
 * JSON backup and restoring it (a fresh browser, a cleared profile, moving
 * devices) silently dropped every protected account — they'd then resurface
 * in doesNotFollowBack/unfollow-queue suggestions/CSV exports, exactly the
 * "permanently removed account reappears via a JSON file" symptom protected
 * accounts are supposed to never exhibit.
 */

beforeEach(async () => {
  await deleteAllData();
});

describe("backup includes protected accounts", () => {
  it("round-trips a protected account through export and restore", async () => {
    await protectAccount({
      normalizedUsername: "close_friend_1",
      displayUsername: "close_friend_1",
      profileUrl: "https://www.instagram.com/close_friend_1/",
      label: "close friend",
    });

    const backup = await buildBackup();
    expect(backup.protectedAccounts).toHaveLength(1);
    expect(backup.protectedAccounts?.[0].normalizedUsername).toBe("close_friend_1");

    // Simulate a fresh browser/profile: wipe everything, then restore only
    // from the serialized backup (round-tripped through JSON, exactly like
    // a real downloaded-then-reuploaded file).
    await deleteAllData();
    expect(await getProtectedAccounts()).toHaveLength(0);

    const reparsed = parseBackupFile(JSON.stringify(backup));
    await restoreBackup(reparsed);

    const restored = await getProtectedAccounts();
    expect(restored).toHaveLength(1);
    expect(restored[0].normalizedUsername).toBe("close_friend_1");
    expect(restored[0].label).toBe("close friend");
  });

  it("restores as zero protected accounts (not a crash) for a pre-protection-feature backup missing the field", async () => {
    const legacyBackup = {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      snapshots: [],
      snapshotFollowers: [],
      snapshotFollowing: [],
      queueItems: [],
      settings: null,
      // protectedAccounts intentionally absent, as in a backup made before the field existed
    };
    const parsed = parseBackupFile(JSON.stringify(legacyBackup));
    await expect(restoreBackup(parsed)).resolves.not.toThrow();
    expect(await getProtectedAccounts()).toHaveLength(0);
  });

  it("clears protected accounts not present in the restored backup, rather than merging", async () => {
    await protectAccount({
      normalizedUsername: "stale_protection",
      displayUsername: "stale_protection",
      profileUrl: "https://www.instagram.com/stale_protection/",
    });

    const emptyBackup = await buildBackup();
    // Overwrite with an empty protectedAccounts array, simulating restoring
    // an older/different backup that never protected this account.
    const backupWithoutIt = { ...emptyBackup, protectedAccounts: [] };
    await restoreBackup(backupWithoutIt);

    expect(await getProtectedAccounts()).toHaveLength(0);
  });
});

describe("backup includes exclusion rules and feedback reports", () => {
  it("round-trips an exclusion rule and a feedback report through export and restore", async () => {
    await dbAddExclusionRule({ rawPattern: "nba", matchMode: "startsWith", note: "sports pages" });
    await submitFeedback({ message: "Marked someone unfollowed but they came back", category: "stale-data" });

    const backup = await buildBackup();
    expect(backup.exclusionRules).toHaveLength(1);
    expect(backup.feedbackReports).toHaveLength(1);

    await deleteAllData();
    expect(await getExclusionRules()).toHaveLength(0);
    expect(await getFeedbackReports()).toHaveLength(0);

    const reparsed = parseBackupFile(JSON.stringify(backup));
    await restoreBackup(reparsed);

    const restoredRules = await getExclusionRules();
    expect(restoredRules).toHaveLength(1);
    expect(restoredRules[0].pattern).toBe("nba");

    const restoredFeedback = await getFeedbackReports();
    expect(restoredFeedback).toHaveLength(1);
    expect(restoredFeedback[0].category).toBe("stale-data");
  });

  it("restores as empty (not a crash) for a backup predating both features", async () => {
    const legacyBackup = {
      schemaVersion: 3,
      exportedAt: new Date().toISOString(),
      snapshots: [],
      snapshotFollowers: [],
      snapshotFollowing: [],
      queueItems: [],
      settings: null,
      protectedAccounts: [],
      // exclusionRules and feedbackReports intentionally absent
    };
    const parsed = parseBackupFile(JSON.stringify(legacyBackup));
    await expect(restoreBackup(parsed)).resolves.not.toThrow();
    expect(await getExclusionRules()).toHaveLength(0);
    expect(await getFeedbackReports()).toHaveLength(0);
  });
});
