"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ValidityBadge } from "@/components/ui/ValidityBadge";
import { formatFullDate, formatSignedDelta } from "@/lib/utils/format";
import { deleteSnapshot, renameSnapshot } from "@/lib/db/queries";
import type { SnapshotRecord } from "@/lib/db/schema";

interface SnapshotTimelineProps {
  snapshots: SnapshotRecord[]; // desc order
}

export function SnapshotTimeline({ snapshots }: SnapshotTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deletingSnapshot = snapshots.find((s) => s.id === deletingId);

  return (
    <div className="space-y-3">
      {snapshots.map((snapshot, i) => {
        const previous = snapshots[i + 1];
        const isFirst = i === snapshots.length - 1;
        const isEditing = editingId === snapshot.id;

        return (
          <div key={snapshot.id} className="rounded-2xl border border-border bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {formatFullDate(snapshot.createdAt)}
                </p>
                {isEditing ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      autoFocus
                      value={draftLabel}
                      onChange={(e) => setDraftLabel(e.target.value)}
                      placeholder="Label this snapshot"
                      className="rounded-md border border-border-strong px-2 py-1 text-sm"
                    />
                    <button
                      onClick={async () => {
                        await renameSnapshot(snapshot.id, draftLabel);
                        setEditingId(null);
                      }}
                      className="rounded-md bg-ink p-1.5 text-white"
                      aria-label="Save label"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md bg-surface p-1.5 text-ink-soft"
                      aria-label="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-base font-medium text-ink">
                      {snapshot.label || (isFirst ? "First snapshot" : "Snapshot")}
                    </p>
                    <ValidityBadge validity={snapshot.validity} />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <span className="text-ink-faint">Followers </span>
                  <span className="font-semibold text-ink">{snapshot.followersCount}</span>
                  {previous && (
                    <span className="ml-1 text-xs text-ink-faint">
                      {formatSignedDelta(snapshot.followersCount - previous.followersCount)}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-ink-faint">Following </span>
                  <span className="font-semibold text-ink">{snapshot.followingCount}</span>
                  {previous && (
                    <span className="ml-1 text-xs text-ink-faint">
                      {formatSignedDelta(snapshot.followingCount - previous.followingCount)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingId(snapshot.id);
                    setDraftLabel(snapshot.label ?? "");
                  }}
                  className="gap-1.5"
                >
                  <Pencil size={13} /> Rename
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingId(snapshot.id)}
                  className="gap-1.5 text-rose hover:bg-rose-soft"
                >
                  <Trash2 size={13} /> Delete
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <Dialog
        open={!!deletingSnapshot}
        onClose={() => setDeletingId(null)}
        title="Delete this snapshot?"
        description={
          deletingSnapshot
            ? `This permanently removes the snapshot from ${formatFullDate(deletingSnapshot.createdAt)} and its follower/following data.`
            : undefined
        }
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              if (deletingId) await deleteSnapshot(deletingId);
              setDeletingId(null);
            }}
          >
            Delete Snapshot
          </Button>
          <Button variant="ghost" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
