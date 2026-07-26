"use client";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { RequireSnapshot } from "@/components/dashboard/RequireSnapshot";
import { SnapshotTimeline } from "@/components/dashboard/SnapshotTimeline";
import { SnapshotCompare } from "@/components/dashboard/SnapshotCompare";
import { useSnapshots } from "@/hooks/useSnapshots";

function SnapshotsContent() {
  const snapshots = useSnapshots();
  if (!snapshots) return null;

  return (
    <>
      <PageHeader title="Snapshots" subtitle="Every import you've saved, and how they compare." count={snapshots.length} />
      <div className="space-y-6">
        {snapshots.length >= 2 && <SnapshotCompare snapshots={snapshots} />}
        <SnapshotTimeline snapshots={snapshots} />
      </div>
    </>
  );
}

export default function SnapshotsPage() {
  return <RequireSnapshot>{() => <SnapshotsContent />}</RequireSnapshot>;
}
