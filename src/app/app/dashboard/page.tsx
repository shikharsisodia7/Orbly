"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { RequireUsableSnapshot } from "@/components/dashboard/RequireUsableSnapshot";
import { RelationshipOverview } from "@/components/dashboard/RelationshipOverview";
import { HistoryChart } from "@/components/dashboard/HistoryChart";
import { RecentChangesFeed } from "@/components/dashboard/RecentChangesFeed";
import { ValidityBadge } from "@/components/ui/ValidityBadge";
import { useCurrentRelationships, useSnapshotComparison } from "@/hooks/useRelationships";
import { useSnapshots, usePreviousSnapshot } from "@/hooks/useSnapshots";
import { formatFullDate } from "@/lib/utils/format";
import type { SnapshotRecord } from "@/lib/db/schema";

function DashboardContent({ latest }: { latest: SnapshotRecord }) {
  const snapshots = useSnapshots();
  const relationships = useCurrentRelationships(latest.id);
  const previous = usePreviousSnapshot(latest.id);
  const comparison = useSnapshotComparison(previous?.id, latest.id);

  if (!relationships || !snapshots) return null;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`Snapshot from ${formatFullDate(latest.createdAt)}${latest.label ? ` — ${latest.label}` : ""}`}
        action={<ValidityBadge validity={latest.validity} />}
      />

      <div className="space-y-6">
        <RelationshipOverview
          followersCount={latest.followersCount}
          followingCount={latest.followingCount}
          relationships={relationships}
        />

        <HistoryChart snapshots={snapshots} />

        {previous && comparison ? (
          <RecentChangesFeed changes={comparison} from={previous} to={latest} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border-strong bg-cream/40 p-6 text-center text-sm text-ink-soft">
            Import another snapshot to start tracking changes between exports.
          </div>
        )}
      </div>
    </>
  );
}

export default function DashboardPage() {
  return <RequireUsableSnapshot>{(latest) => <DashboardContent latest={latest} />}</RequireUsableSnapshot>;
}
