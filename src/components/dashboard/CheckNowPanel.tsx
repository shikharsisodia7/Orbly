"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ExternalLink, Loader2, UserMinus, UserPlus, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { getSnapshotFollowers } from "@/lib/db/queries";
import { recordToRelationship } from "@/lib/db/mappers";
import { runCheckNow, type CheckNowResult } from "@/lib/instagram/check-now";

/**
 * One-click "did anyone unfollow me" for the web app: reads the just-
 * imported snapshot's followers (already on disk — no new network request
 * of any kind), diffs it against whatever was there before, and shows the
 * result right here. This is the manual, explicit trigger described as
 * "after a manual data import" — it never runs on its own.
 */
export function CheckNowPanel({ snapshotId }: { snapshotId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<CheckNowResult | null>(null);

  async function handleCheckNow() {
    setState("loading");
    const followerRows = await getSnapshotFollowers(snapshotId);
    const followers = followerRows.map(recordToRelationship);
    const outcome = await runCheckNow(followers, "web-import", snapshotId);
    setResult(outcome);
    setState("done");
  }

  if (state === "idle") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-instagram text-white">
          <Zap size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Check for unfollowers now</p>
          <p className="text-xs text-ink-soft">Compares this import against your last check — one click, no re-upload.</p>
        </div>
        <Button size="sm" onClick={handleCheckNow} className="shrink-0 gap-1.5 bg-gradient-instagram hover:opacity-90">
          <Zap size={13} /> Check Now
        </Button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-sm text-ink-soft">
        <Loader2 size={16} className="animate-spin text-violet" /> Comparing against your last check…
      </div>
    );
  }

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-2xl border border-border bg-white p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <CheckCircle2 size={15} className="text-green" /> Checked just now
        </p>
        <p className="text-[11px] text-ink-faint">
          {result.isFirstCheck
            ? "First check on file — nothing to compare against yet."
            : `vs. ${new Date(result.previousCheckedAt!).toLocaleString()}`}
        </p>
      </div>

      {result.excludedCount > 0 && (
        <p className="text-[11px] text-ink-faint">
          {result.excludedCount} unfollow{result.excludedCount === 1 ? "" : "s"} hidden by protection, an exclusion
          rule, or a confirmed-gone account.
        </p>
      )}

      {result.unfollowed.length === 0 && result.newFollowers.length === 0 ? (
        <p className="rounded-xl bg-surface px-3 py-4 text-center text-sm text-ink-soft">
          {result.isFirstCheck ? "Baseline recorded — next check will show what's changed." : "No changes since your last check."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.unfollowed.length > 0 && (
            <CheckResultList
              title="Unfollowed you"
              icon={<UserMinus size={13} />}
              tone="text-rose"
              items={result.unfollowed}
            />
          )}
          {result.newFollowers.length > 0 && (
            <CheckResultList
              title="Newly followed you"
              icon={<UserPlus size={13} />}
              tone="text-green"
              items={result.newFollowers}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}

function CheckResultList({
  title,
  icon,
  tone,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  tone: string;
  items: CheckNowResult["unfollowed"];
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2.5">
      <div className={`flex items-center gap-1.5 px-1 pb-1.5 text-xs font-medium ${tone}`}>
        {icon} {title} <span className="text-ink-faint">({items.length})</span>
      </div>
      <div className="space-y-0.5">
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.a
              key={item.normalizedUsername}
              href={item.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white"
            >
              <Avatar username={item.username} size={20} />
              <span className="flex-1 truncate text-xs text-ink">@{item.username}</span>
              <ExternalLink size={11} className="shrink-0 text-ink-faint" />
            </motion.a>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
