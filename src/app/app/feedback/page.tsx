"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, MessageSquareText, Sparkles, Trash2, Wrench } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useFeedbackReports } from "@/hooks/useFeedbackReports";
import { useLatestSnapshot } from "@/hooks/useSnapshots";
import { triageFeedback } from "@/lib/instagram/feedback-triage";
import { recordToRelationship } from "@/lib/db/mappers";
import {
  deleteFeedbackReport,
  getSnapshotFollowing,
  reconcileQueueWithFollowing,
  submitFeedback,
  updateFeedbackStatus,
} from "@/lib/db/queries";
import type { FeedbackCategory, FeedbackReportRecord } from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  "stale-data": "Stale or inactive account data",
  "not-saving": "A change didn't stick",
  "wrong-count": "A count looks wrong",
  "ui-issue": "Something looks broken",
  "feature-request": "Feature request",
  other: "Other",
};

const CATEGORY_TONE: Record<FeedbackCategory, "rose" | "orange" | "blue" | "violet" | "green" | "neutral"> = {
  "stale-data": "rose",
  "not-saving": "orange",
  "wrong-count": "blue",
  "ui-issue": "violet",
  "feature-request": "green",
  other: "neutral",
};

function StatusBadge({ status }: { status: FeedbackReportRecord["status"] }) {
  if (status === "auto-resolved") return <Badge tone="green">Auto-fixed</Badge>;
  if (status === "reviewed") return <Badge tone="neutral">Reviewed</Badge>;
  return <Badge tone="blue">New</Badge>;
}

function ReportCard({ report }: { report: FeedbackReportRecord }) {
  const latestSnapshot = useLatestSnapshot();
  const [running, setRunning] = useState(false);
  const [resolvedCount, setResolvedCount] = useState<number | null>(null);
  const triage = triageFeedback(report.message);
  const canAutoFix = report.status === "new" && triage.suggestedAction && latestSnapshot;

  async function runSuggestedFix() {
    if (!triage.suggestedAction || !latestSnapshot) return;
    setRunning(true);
    try {
      const followingRecords = await getSnapshotFollowing(latestSnapshot.id);
      const count = await reconcileQueueWithFollowing(followingRecords.map(recordToRelationship));
      await updateFeedbackStatus(report.id, "auto-resolved");
      setResolvedCount(count);
    } finally {
      setRunning(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className="rounded-2xl border border-border bg-white p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={CATEGORY_TONE[report.category]}>{CATEGORY_LABEL[report.category]}</Badge>
          <StatusBadge status={report.status} />
        </div>
        <button
          onClick={() => deleteFeedbackReport(report.id)}
          className="text-ink-faint hover:text-rose"
          aria-label="Delete report"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <p className="mt-2.5 text-sm text-ink">{report.message}</p>
      <p className="mt-1.5 text-[11px] text-ink-faint">{new Date(report.createdAt).toLocaleString()}</p>

      {canAutoFix && resolvedCount === null && (
        <div className="mt-3 rounded-xl bg-surface p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
            <Wrench size={13} className="text-violet" /> {triage.suggestedAction!.label}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">{triage.suggestedAction!.description}</p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={runSuggestedFix} disabled={running}>
            {running ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />}
            {running ? "Running…" : "Run this fix"}
          </Button>
        </div>
      )}

      {resolvedCount !== null && (
        <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-green-soft p-3 text-xs font-medium text-green">
          <CheckCircle2 size={13} />
          Done — {resolvedCount === 0 ? "nothing needed reconciling" : `${resolvedCount} queue item${resolvedCount === 1 ? "" : "s"} synced`}.
        </div>
      )}
    </motion.div>
  );
}

export default function FeedbackPage() {
  const reports = useFeedbackReports();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState<FeedbackCategory | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const { category } = triageFeedback(trimmed);
      await submitFeedback({ message: trimmed, category, pageContext: typeof document !== "undefined" ? document.referrer || null : null });
      setMessage("");
      setJustSubmitted(category);
      setTimeout(() => setJustSubmitted(null), 4000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Help & Feedback"
        subtitle="Report a bug or ask for something — no terminal or GitHub account needed. Everything here stays on this device, same as the rest of your data."
      />

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-white p-4">
        <label htmlFor="feedback-message" className="text-sm font-medium text-ink">
          What happened, or what would help?
        </label>
        <textarea
          id="feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. &quot;I marked an account as unfollowed but it showed up again after I re-imported my data&quot;"
          rows={4}
          className={cn(
            "mt-2 w-full resize-none rounded-lg border border-border-strong bg-white p-3 text-sm text-ink placeholder:text-ink-faint",
            "focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-blue/20"
          )}
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-ink-faint">
            Reports are matched against known issue categories automatically — some come with a fix you can run right away.
          </p>
          <Button type="submit" disabled={!message.trim() || submitting} className="shrink-0 gap-1.5">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <MessageSquareText size={14} />}
            Submit
          </Button>
        </div>
        <AnimatePresence>
          {justSubmitted && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green"
            >
              <Sparkles size={13} /> Logged as &quot;{CATEGORY_LABEL[justSubmitted]}&quot; — see it below.
            </motion.p>
          )}
        </AnimatePresence>
      </form>

      <div className="mt-6 space-y-3">
        {reports === undefined ? null : reports.length === 0 ? (
          <EmptyState
            icon={<MessageSquareText size={18} />}
            title="No reports yet"
            description="Anything you submit above shows up here, on this device only."
          />
        ) : (
          <AnimatePresence initial={false}>
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </>
  );
}
