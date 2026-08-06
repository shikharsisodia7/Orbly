"use client";

import { useRef, useState } from "react";
import { Download, Upload, Trash2, ShieldCheck, PlugZap } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Dialog } from "@/components/ui/Dialog";
import { useSnapshots } from "@/hooks/useSnapshots";
import { useSettings } from "@/hooks/useSettings";
import { deleteAllData, deleteSnapshot, clearQueue, updateSettings } from "@/lib/db/queries";
import { downloadBackup, parseBackupFile, restoreBackup, BackupValidationError } from "@/lib/backup";
import { formatFullDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export default function SettingsPage() {
  const snapshots = useSnapshots();
  const settings = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  async function handleRestoreFile(file: File) {
    setRestoreError(null);
    setRestoreSuccess(false);
    try {
      const text = await file.text();
      const backup = parseBackupFile(text);
      await restoreBackup(backup);
      setRestoreSuccess(true);
    } catch (err) {
      setRestoreError(
        err instanceof BackupValidationError ? err.message : "Couldn't read that backup file."
      );
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your local data and app preferences." />

      <div className="space-y-8">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Data</h2>
          <div className="mt-3 space-y-3">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Export local backup</p>
                <p className="text-xs text-ink-soft">
                  Download a JSON file with every snapshot, your queue, and settings.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => downloadBackup()} className="gap-1.5">
                <Download size={14} /> Export Backup
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Import local backup</p>
                <p className="text-xs text-ink-soft">Replaces all local data with the contents of a backup file.</p>
                {restoreError && <p className="mt-1 text-xs text-rose">{restoreError}</p>}
                {restoreSuccess && <p className="mt-1 text-xs text-green">Backup restored successfully.</p>}
              </div>
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                <Upload size={14} /> Import Backup
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleRestoreFile(file);
                }}
              />
            </div>

            <div className="rounded-2xl border border-border bg-white p-5">
              <p className="text-sm font-medium text-ink">Delete a specific snapshot</p>
              <div className="mt-3 space-y-2">
                {snapshots?.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                    <span className="text-ink-soft">
                      {formatFullDate(s.createdAt)} {s.label ? `— ${s.label}` : ""}
                    </span>
                    <button
                      onClick={() => setSnapshotToDelete(s.id)}
                      className="rounded-md p-1.5 text-ink-faint hover:bg-white hover:text-rose"
                      aria-label="Delete snapshot"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {(!snapshots || snapshots.length === 0) && (
                  <p className="text-xs text-ink-faint">No snapshots yet.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Clear queue</p>
                <p className="text-xs text-ink-soft">Removes every item from your Unfollow Queue.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => clearQueue()}>
                Clear Queue
              </Button>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-rose/30 bg-rose-soft/30 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Delete all local data</p>
                <p className="text-xs text-ink-soft">Permanently removes every snapshot, your queue, and settings.</p>
              </div>
              <Button variant="danger" size="sm" onClick={() => setDeleteAllOpen(true)}>
                Delete Everything
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Browser Extension</h2>
          <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Sync from the Orbly extension</p>
              <p className="text-xs text-ink-soft">
                Open your followers/following list on Instagram yourself, click the Orbly extension icon, then
                Sync. This page receives it — nothing runs unless you trigger it there first.
              </p>
            </div>
            <ButtonLink href="/app/extension-sync" variant="secondary" size="sm" className="gap-1.5 shrink-0">
              <PlugZap size={14} /> Open Sync Page
            </ButtonLink>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Privacy</h2>
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-border bg-white p-5">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-green" />
            <p className="text-sm text-ink-soft">
              Orbly reads your Instagram export entirely in this browser tab. Nothing is uploaded to a
              server. Snapshots, your queue, and settings live in this browser&apos;s IndexedDB —
              clearing your browser&apos;s site data will remove them, so export a backup periodically.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Application</h2>
          <div className="mt-3 rounded-2xl border border-border bg-white p-5">
            <p className="text-sm font-medium text-ink">Motion</p>
            <p className="text-xs text-ink-soft">Choose how much animation Orbly uses.</p>
            <div className="mt-3 flex gap-2">
              {(
                [
                  { id: "system", label: "System default" },
                  { id: "full", label: "Full motion" },
                  { id: "reduced", label: "Reduced" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => updateSettings({ reducedMotionOverride: opt.id })}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium",
                    settings?.reducedMotionOverride === opt.id
                      ? "border-ink bg-ink text-white"
                      : "border-border-strong text-ink-soft"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <Dialog
        open={!!snapshotToDelete}
        onClose={() => setSnapshotToDelete(null)}
        title="Delete this snapshot?"
        description="This permanently removes it and its follower/following data from this browser."
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              if (snapshotToDelete) await deleteSnapshot(snapshotToDelete);
              setSnapshotToDelete(null);
            }}
          >
            Delete Snapshot
          </Button>
          <Button variant="ghost" onClick={() => setSnapshotToDelete(null)}>
            Cancel
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        title="Delete all local data?"
        description="This permanently removes every snapshot, your queue, and settings from this browser. You can always get back to where you are now by re-uploading the same Instagram export."
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              await deleteAllData();
              setDeleteAllOpen(false);
            }}
          >
            Delete Everything
          </Button>
          <Button variant="ghost" onClick={() => setDeleteAllOpen(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
}
