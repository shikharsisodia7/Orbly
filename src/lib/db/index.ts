import Dexie, { type EntityTable } from "dexie";
import type {
  AccountBioCacheRecord,
  AccountStatusCacheRecord,
  ExclusionRuleRecord,
  FeedbackReportRecord,
  FollowerCheckEntryRecord,
  FollowerCheckRecord,
  ProtectedAccountRecord,
  QueueItemRecord,
  SettingsRecord,
  SnapshotFollowerRecord,
  SnapshotFollowingRecord,
  SnapshotRecord,
} from "./schema";
import { normalizeExclusionRuleRecord, normalizeSnapshotRecord } from "./migrate";

export class OrblyDatabase extends Dexie {
  snapshots!: EntityTable<SnapshotRecord, "id">;
  snapshotFollowers!: EntityTable<SnapshotFollowerRecord, "id">;
  snapshotFollowing!: EntityTable<SnapshotFollowingRecord, "id">;
  queueItems!: EntityTable<QueueItemRecord, "id">;
  settings!: EntityTable<SettingsRecord, "id">;
  protectedAccounts!: EntityTable<ProtectedAccountRecord, "id">;
  exclusionRules!: EntityTable<ExclusionRuleRecord, "id">;
  feedbackReports!: EntityTable<FeedbackReportRecord, "id">;
  accountBioCache!: EntityTable<AccountBioCacheRecord, "id">;
  accountStatusCache!: EntityTable<AccountStatusCacheRecord, "id">;
  followerChecks!: EntityTable<FollowerCheckRecord, "id">;
  followerCheckEntries!: EntityTable<FollowerCheckEntryRecord, "id">;

  constructor(name = "orbly-local") {
    super(name);
    this.version(1).stores({
      snapshots: "id, createdAt, datasetHash",
      snapshotFollowers: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      snapshotFollowing: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      queueItems: "id, normalizedUsername, status, source, addedAt",
      settings: "id",
    });

    // Adds validity tracking (parserVersion, dateRangeSource, validity,
    // validityReasons, profileReferenceCounts) to every existing snapshot.
    // Snapshots imported before this fix are re-assessed rather than trusted
    // by default — a date-limited or otherwise incomplete snapshot must not
    // become "complete" simply by virtue of already existing.
    this.version(2)
      .stores({
        snapshots: "id, createdAt, datasetHash, validity",
        snapshotFollowers: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
        snapshotFollowing: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
        queueItems: "id, normalizedUsername, status, source, addedAt",
        settings: "id",
      })
      .upgrade(async (tx) => {
        const snapshots = await tx.table<SnapshotRecord>("snapshots").toArray();
        await Promise.all(
          snapshots.map((snapshot) =>
            tx.table("snapshots").update(snapshot.id, normalizeSnapshotRecord(snapshot))
          )
        );
      });

    // Adds the protected-accounts table (manual tagging: verified, brand,
    // close friend, or any custom label) — permanently excluded from
    // unfollow suggestions across every future re-import, the same way
    // queueItems already survive re-imports. &normalizedUsername enforces
    // one protection record per account and gives O(1) membership checks.
    this.version(3).stores({
      snapshots: "id, createdAt, datasetHash, validity",
      snapshotFollowers: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      snapshotFollowing: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      queueItems: "id, normalizedUsername, status, source, addedAt",
      settings: "id",
      protectedAccounts: "id, &normalizedUsername, dateAdded",
    });

    // Adds pattern-based exclusion rules (e.g. "nothing with nba in the
    // name") and self-service feedback reports — both new, independent
    // tables, so this migration only adds stores and touches no existing
    // data.
    this.version(4).stores({
      snapshots: "id, createdAt, datasetHash, validity",
      snapshotFollowers: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      snapshotFollowing: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      queueItems: "id, normalizedUsername, status, source, addedAt",
      settings: "id",
      protectedAccounts: "id, &normalizedUsername, dateAdded",
      exclusionRules: "id, &pattern, createdAt",
      feedbackReports: "id, category, status, createdAt",
    });

    // Adds bio-based exclusion rules alongside username ones (a rule is now
    // scoped by `field`, so the same pattern text can exist once per field —
    // "nba" as a username rule and "nba" as a bio rule are independent).
    // Also adds accountBioCache and accountStatusCache: both populated one
    // account at a time via the browser extension's explicit, user-triggered
    // lookup — never bulk-fetched — so a captured bio or a "no longer found"
    // status keeps being honored everywhere that account appears afterward.
    this.version(5)
      .stores({
        snapshots: "id, createdAt, datasetHash, validity",
        snapshotFollowers: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
        snapshotFollowing: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
        queueItems: "id, normalizedUsername, status, source, addedAt",
        settings: "id",
        protectedAccounts: "id, &normalizedUsername, dateAdded",
        exclusionRules: "id, &[field+pattern], createdAt, field",
        feedbackReports: "id, category, status, createdAt",
        accountBioCache: "id, &normalizedUsername, fetchedAt",
        accountStatusCache: "id, &normalizedUsername, status, checkedAt",
      })
      .upgrade(async (tx) => {
        const rules = await tx.table<ExclusionRuleRecord>("exclusionRules").toArray();
        await Promise.all(
          rules.map((rule) => tx.table("exclusionRules").update(rule.id, normalizeExclusionRuleRecord(rule)))
        );
      });

    // Adds the "Check Now" fast-unfollower-check history — deliberately
    // separate from snapshots (see FollowerCheckRecord's doc comment for
    // why), so this migration only adds new, independent stores.
    this.version(6).stores({
      snapshots: "id, createdAt, datasetHash, validity",
      snapshotFollowers: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      snapshotFollowing: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      queueItems: "id, normalizedUsername, status, source, addedAt",
      settings: "id",
      protectedAccounts: "id, &normalizedUsername, dateAdded",
      exclusionRules: "id, &[field+pattern], createdAt, field",
      feedbackReports: "id, category, status, createdAt",
      accountBioCache: "id, &normalizedUsername, fetchedAt",
      accountStatusCache: "id, &normalizedUsername, status, checkedAt",
      followerChecks: "id, checkedAt, snapshotId",
      followerCheckEntries: "id, checkId, [checkId+normalizedUsername]",
    });
  }
}

let dbInstance: OrblyDatabase | null = null;

/** Lazily creates a single shared Dexie instance (browser-only). */
export function getDb(): OrblyDatabase {
  if (typeof window === "undefined") {
    throw new Error("OrblyDatabase can only be used in the browser");
  }
  if (!dbInstance) {
    dbInstance = new OrblyDatabase();
  }
  return dbInstance;
}

export * from "./schema";
