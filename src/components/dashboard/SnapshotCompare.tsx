"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useSnapshotComparison } from "@/hooks/useRelationships";
import { formatCount, formatFullDate, formatSignedDelta } from "@/lib/utils/format";
import type { SnapshotRecord } from "@/lib/db/schema";

interface SnapshotCompareProps {
  snapshots: SnapshotRecord[]; // desc order
}

export function SnapshotCompare({ snapshots }: SnapshotCompareProps) {
  const [aId, setAId] = useState<string>(snapshots[Math.min(1, snapshots.length - 1)]?.id ?? "");
  const [bId, setBId] = useState<string>(snapshots[0]?.id ?? "");

  const comparison = useSnapshotComparison(aId, bId);
  const a = snapshots.find((s) => s.id === aId);
  const b = snapshots.find((s) => s.id === bId);

  const unusable = (s: SnapshotRecord | undefined) => s && (s.validity === "partial" || s.validity === "invalid");
  const blocked = unusable(a) || unusable(b);

  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <h3 className="text-sm font-semibold text-ink">Compare snapshots</h3>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-ink-faint">Snapshot A</span>
          <select
            value={aId}
            onChange={(e) => setAId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm"
          >
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {formatFullDate(s.createdAt)} {s.label ? `— ${s.label}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-faint">Snapshot B</span>
          <select
            value={bId}
            onChange={(e) => setBId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm"
          >
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {formatFullDate(s.createdAt)} {s.label ? `— ${s.label}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {blocked ? (
        <div className="mt-5 flex gap-3 rounded-xl border border-orange/30 bg-orange-soft/50 p-4">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-orange" />
          <p className="text-xs leading-relaxed text-ink-soft">
            These snapshots can&apos;t be reliably compared because at least one contains incomplete
            follower data. Import a complete, all-time export to unlock comparisons involving that
            snapshot.
          </p>
        </div>
      ) : (
        a &&
        b &&
        comparison && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Follower change" value={formatSignedDelta(b.followersCount - a.followersCount)} />
              <Metric label="Following change" value={formatSignedDelta(b.followingCount - a.followingCount)} />
              <Metric label="New followers" value={formatCount(comparison.newFollowers.length)} />
              <Metric label="Lost followers" value={formatCount(comparison.lostFollowers.length)} />
              <Metric label="Started following" value={formatCount(comparison.startedFollowing.length)} />
              <Metric label="Stopped following" value={formatCount(comparison.stoppedFollowing.length)} />
            </div>
          </div>
        )
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-3">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{value}</p>
    </div>
  );
}
