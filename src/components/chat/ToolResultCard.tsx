"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Ban, Check, Download, ExternalLink, FileSpreadsheet, History, ListChecks, Shield, ShieldOff, UploadCloud, UserCheck, UserMinus, UserPlus, UserX, Users, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { ValidityBadge } from "@/components/ui/ValidityBadge";
import { formatCount } from "@/lib/utils/format";
import type { DatasetValidity } from "@/lib/instagram/validity";
import { DoesNotFollowBackList } from "./DoesNotFollowBackList";

/**
 * Renders a rich, animated visualization for a chat tool's result, so the
 * assistant's answers show up as real UI (stat tiles, avatar lists, badges)
 * instead of a wall of text. The assistant's own text reply stays short and
 * narrative — this card carries the actual data.
 */

interface UnavailableResult {
  available: false;
  message: string;
}

function isUnavailable(output: unknown): output is UnavailableResult {
  return !!output && typeof output === "object" && (output as { available?: unknown }).available === false;
}

const staggerItem = {
  hidden: { opacity: 0, x: -8 },
  show: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.05, duration: 0.25 } }),
};

function UnavailableCard() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-cream/60 px-4 py-3.5 text-sm text-ink-soft">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink-faint">
        <UploadCloud size={15} />
      </div>
      Import your Instagram export using the box above to unlock this.
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-3.5 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <div>
        <p className="text-[11px] text-ink-faint">{label}</p>
        <p className="text-lg font-semibold text-ink">
          <AnimatedCounter value={value} />
        </p>
      </div>
    </div>
  );
}

interface AccountStatsOutput {
  available: true;
  snapshotImportedAt: string;
  followerCount: number;
  followingCount: number;
  mutualCount: number;
  doesNotFollowBackCount: number;
  youDontFollowBackCount: number;
}

function AccountStatsCard({ output }: { output: AccountStatsOutput }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm space-y-2"
    >
      <div className="grid grid-cols-2 gap-2">
        <StatTile icon={<Users size={16} className="text-rose" />} label="Followers" value={output.followerCount} tone="bg-rose-soft" />
        <StatTile icon={<UserPlus size={16} className="text-violet" />} label="Following" value={output.followingCount} tone="bg-violet-soft" />
        <StatTile icon={<UserCheck size={16} className="text-green" />} label="Mutuals" value={output.mutualCount} tone="bg-green-soft" />
        <StatTile
          icon={<UserX size={16} className="text-orange" />}
          label="Don't follow back"
          value={output.doesNotFollowBackCount}
          tone="bg-orange-soft"
        />
      </div>
      <p className="text-[11px] text-ink-faint">
        From your snapshot imported {new Date(output.snapshotImportedAt).toLocaleDateString()}
      </p>
    </motion.div>
  );
}

interface PaginatedListOutput {
  available: true;
  result: {
    total: number;
    items: { username: string; normalizedUsername: string; profileUrl: string }[];
    hasMore: boolean;
  };
}

const LIST_ACCENT: Record<string, { label: string; tone: string; icon: React.ReactNode }> = {
  listDoesNotFollowBack: { label: "don't follow you back", tone: "text-orange", icon: <UserX size={13} /> },
  listMutuals: { label: "mutual follows", tone: "text-green", icon: <UserCheck size={13} /> },
  listYouDontFollowBack: { label: "you don't follow back", tone: "text-blue", icon: <UserMinus size={13} /> },
};

function AccountListCard({ toolName, output }: { toolName: string; output: PaginatedListOutput }) {
  const accent = LIST_ACCENT[toolName] ?? { label: "accounts", tone: "text-ink-soft", icon: <Users size={13} /> };
  const { total, items, hasMore } = output.result;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white px-4 py-6 text-center text-sm text-ink-soft">
        No accounts matched — try a different search.
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-2 rounded-2xl border border-border bg-white p-3">
      <div className={`flex items-center gap-1.5 px-1 text-xs font-medium ${accent.tone}`}>
        {accent.icon}
        <AnimatedCounter value={total} /> {accent.label}
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <motion.a
            key={item.username}
            href={item.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            custom={i}
            variants={staggerItem}
            initial="hidden"
            animate="show"
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all hover:translate-x-0.5 hover:bg-surface"
          >
            <Avatar username={item.username} size={26} />
            <span className="flex-1 truncate text-sm text-ink">@{item.username}</span>
            <ExternalLink size={12} className="shrink-0 text-ink-faint" />
          </motion.a>
        ))}
      </div>
      {hasMore && (
        <p className="px-1 pt-1 text-[11px] text-ink-faint">
          +{formatCount(total - items.length)} more — ask to see more or search a name.
        </p>
      )}
    </div>
  );
}

interface CheckAccountOutput {
  available: true;
  normalizedUsername: string;
  followsYou: boolean;
  youFollow: boolean;
  followsYouSinceTimestamp: number | null;
  youFollowSinceTimestamp: number | null;
}

function StatusPill({ label, value, sinceTimestamp }: { label: string; value: boolean; sinceTimestamp: number | null }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${
          value ? "bg-green" : "bg-ink-faint"
        }`}
      >
        {value ? <Check size={11} /> : <X size={11} />}
      </span>
      <div className="flex-1">
        <span className="text-sm text-ink">{label}</span>
        {value && sinceTimestamp != null && (
          <span className="block text-[11px] text-ink-faint">
            since {new Date(sinceTimestamp * 1000).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function CheckAccountCard({ output }: { output: CheckAccountOutput }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="w-full max-w-xs space-y-2.5 rounded-2xl border border-border bg-white p-4"
    >
      <div className="flex items-center gap-2.5">
        <Avatar username={output.normalizedUsername} size={32} />
        <span className="font-medium text-ink">@{output.normalizedUsername}</span>
      </div>
      <StatusPill label="Follows you" value={output.followsYou} sinceTimestamp={output.followsYouSinceTimestamp} />
      <StatusPill label="You follow them" value={output.youFollow} sinceTimestamp={output.youFollowSinceTimestamp} />
    </motion.div>
  );
}

interface RecentUnfollowersOutput {
  available: true;
  total: number;
  note?: string;
  events: {
    username: string;
    profileUrl: string;
    unfollowedBetween: { from: string; to: string };
    stillFollowingThemNow: boolean;
  }[];
}

function RecentUnfollowersCard({ output }: { output: RecentUnfollowersOutput }) {
  if (output.events.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-sm text-ink-soft">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-soft text-green">
          <Check size={14} />
        </div>
        {output.note ?? "No lost followers detected."}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-1 rounded-2xl border border-border bg-white p-3">
      {output.events.map((e, i) => (
        <motion.a
          key={`${e.username}-${e.unfollowedBetween.to}`}
          href={e.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          custom={i}
          variants={staggerItem}
          initial="hidden"
          animate="show"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all hover:translate-x-0.5 hover:bg-surface"
        >
          <Avatar username={e.username} size={26} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink">@{e.username}</p>
            <p className="text-[11px] text-ink-faint">
              Unfollowed between {new Date(e.unfollowedBetween.from).toLocaleDateString()} –{" "}
              {new Date(e.unfollowedBetween.to).toLocaleDateString()}
            </p>
          </div>
          <UserMinus size={13} className="shrink-0 text-rose" />
        </motion.a>
      ))}
    </div>
  );
}

interface ListSnapshotsOutput {
  available: true;
  total: number;
  snapshots: {
    importedAt: string;
    label: string | null;
    followerCount: number;
    followingCount: number;
    validity: DatasetValidity;
  }[];
}

function SnapshotsCard({ output }: { output: ListSnapshotsOutput }) {
  return (
    <div className="w-full max-w-sm space-y-1.5 rounded-2xl border border-border bg-white p-3">
      <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-ink-soft">
        <History size={13} />
        {output.total} imported snapshot{output.total === 1 ? "" : "s"}
      </div>
      {output.snapshots.map((s, i) => (
        <motion.div
          key={s.importedAt}
          custom={i}
          variants={staggerItem}
          initial="hidden"
          animate="show"
          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
        >
          <div>
            <p className="text-sm text-ink">{new Date(s.importedAt).toLocaleDateString()}</p>
            <p className="text-[11px] text-ink-faint">
              {formatCount(s.followerCount)} followers · {formatCount(s.followingCount)} following
            </p>
          </div>
          <ValidityBadge validity={s.validity} />
        </motion.div>
      ))}
    </div>
  );
}

interface QueueStatusOutput {
  available: true;
  pending: number;
  completed: number;
  skipped: number;
}

function QueueStatusCard({ output }: { output: QueueStatusOutput }) {
  return (
    <div className="flex w-full max-w-sm gap-2">
      <StatTile icon={<ListChecks size={16} className="text-orange" />} label="Pending" value={output.pending} tone="bg-orange-soft" />
      <StatTile icon={<Check size={16} className="text-green" />} label="Completed" value={output.completed} tone="bg-green-soft" />
      <StatTile icon={<X size={16} className="text-ink-faint" />} label="Skipped" value={output.skipped} tone="bg-surface" />
    </div>
  );
}

interface ExportListAsCSVOutput {
  available: true;
  listType: string;
  label: string;
  rowCount: number;
  filename: string;
  csv: string;
}

/**
 * Triggers a client-side file download from an in-memory CSV string — no
 * server route involved, consistent with the rest of the app never sending
 * Instagram data off the device.
 */
function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function ExportCSVCard({ output }: { output: ExportListAsCSVOutput }) {
  const [downloaded, setDownloaded] = useState(false);

  if (output.rowCount === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white px-4 py-6 text-center text-sm text-ink-soft">
        {output.label} — no accounts match right now, so there&apos;s nothing to export.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-white p-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-soft text-violet">
          <FileSpreadsheet size={16} />
        </div>
        <div>
          <p className="text-sm font-medium text-ink">{output.label}</p>
          <p className="text-[11px] text-ink-faint">
            {formatCount(output.rowCount)} row{output.rowCount === 1 ? "" : "s"} · {output.filename}
          </p>
        </div>
      </div>
      <button
        onClick={() => {
          downloadCSV(output.filename, output.csv);
          setDownloaded(true);
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-instagram px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
      >
        <Download size={13} /> {downloaded ? "Downloaded — click to save again" : "Download CSV"}
      </button>
    </motion.div>
  );
}

interface ProtectAccountOutput {
  available: true;
  normalizedUsername: string;
  label: string | null;
  dateAdded: string;
}

function ProtectAccountCard({ output }: { output: ProtectAccountOutput }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-sm text-ink-soft">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-soft text-green">
        <Shield size={14} />
      </div>
      <span>
        @{output.normalizedUsername} is now protected{output.label ? ` — tagged "${output.label}"` : ""}. It won&apos;t
        appear in unfollow suggestions, the queue, or exports.
      </span>
    </div>
  );
}

interface UnprotectAccountOutput {
  available: true;
  normalizedUsername: string;
  wasProtected: boolean;
}

function UnprotectAccountCard({ output }: { output: UnprotectAccountOutput }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-sm text-ink-soft">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink-faint">
        <ShieldOff size={14} />
      </div>
      {output.wasProtected
        ? `@${output.normalizedUsername} is no longer protected — it can show up in suggestions again.`
        : `@${output.normalizedUsername} wasn't protected, so there was nothing to remove.`}
    </div>
  );
}

interface ProtectedAccountsOutput {
  available: true;
  total: number;
  accounts: { username: string; normalizedUsername: string; label: string | null; dateAdded: string }[];
}

function ProtectedAccountsCard({ output }: { output: ProtectedAccountsOutput }) {
  if (output.accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white px-4 py-6 text-center text-sm text-ink-soft">
        No accounts protected yet.
      </div>
    );
  }
  return (
    <div className="w-full max-w-sm space-y-2 rounded-2xl border border-border bg-white p-3">
      <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-green">
        <Shield size={13} />
        <AnimatedCounter value={output.total} /> protected account{output.total === 1 ? "" : "s"}
      </div>
      <div className="space-y-1">
        {output.accounts.map((a, i) => (
          <motion.div
            key={a.normalizedUsername}
            custom={i}
            variants={staggerItem}
            initial="hidden"
            animate="show"
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
          >
            <Avatar username={a.username} size={26} />
            <span className="flex-1 truncate text-sm text-ink">@{a.username}</span>
            {a.label && (
              <span className="shrink-0 rounded-full bg-green-soft px-2 py-0.5 text-[10px] font-medium text-green">
                {a.label}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

interface ExclusionRuleOutput {
  pattern: string;
  matchMode: "contains" | "startsWith" | "endsWith";
  note: string | null;
  createdAt: string;
}

const MATCH_MODE_LABEL: Record<ExclusionRuleOutput["matchMode"], string> = {
  contains: "contains",
  startsWith: "starts with",
  endsWith: "ends with",
};

interface AddExclusionRuleOutput {
  available: true;
  rule: ExclusionRuleOutput;
}

function AddExclusionRuleCard({ output }: { output: AddExclusionRuleOutput }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-sm text-ink-soft">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-soft text-rose">
        <Ban size={14} />
      </div>
      <span>
        Usernames that {MATCH_MODE_LABEL[output.rule.matchMode]} &quot;{output.rule.pattern}&quot; are now permanently
        excluded from unfollow suggestions{output.rule.note ? ` — ${output.rule.note}` : ""}. This has no override —
        they&apos;ll never be suggested, even if asked to include protected accounts.
      </span>
    </div>
  );
}

interface RemoveExclusionRuleOutput {
  available: true;
  pattern: string;
  wasRemoved: boolean;
}

function RemoveExclusionRuleCard({ output }: { output: RemoveExclusionRuleOutput }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-sm text-ink-soft">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink-faint">
        <ShieldOff size={14} />
      </div>
      {output.wasRemoved
        ? `The exclusion rule for "${output.pattern}" was removed — matching accounts can show up in suggestions again.`
        : `No exclusion rule matched "${output.pattern}" exactly, so there was nothing to remove.`}
    </div>
  );
}

interface ListExclusionRulesOutput {
  available: true;
  total: number;
  rules: ExclusionRuleOutput[];
}

function ListExclusionRulesCard({ output }: { output: ListExclusionRulesOutput }) {
  if (output.rules.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white px-4 py-6 text-center text-sm text-ink-soft">
        No exclusion rules set yet.
      </div>
    );
  }
  return (
    <div className="w-full max-w-sm space-y-2 rounded-2xl border border-border bg-white p-3">
      <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-rose">
        <Ban size={13} />
        <AnimatedCounter value={output.total} /> exclusion rule{output.total === 1 ? "" : "s"}
      </div>
      <div className="space-y-1">
        {output.rules.map((r, i) => (
          <motion.div
            key={r.pattern}
            custom={i}
            variants={staggerItem}
            initial="hidden"
            animate="show"
            className="rounded-lg px-2 py-1.5"
          >
            <p className="text-sm text-ink">
              {MATCH_MODE_LABEL[r.matchMode]} &quot;{r.pattern}&quot;
            </p>
            {r.note && <p className="text-[11px] text-ink-faint">{r.note}</p>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function ToolResultCard({ toolName, output }: { toolName: string; output: unknown }) {
  if (isUnavailable(output)) return <UnavailableCard />;
  if (!output || typeof output !== "object") return null;

  switch (toolName) {
    case "getAccountStats":
      return <AccountStatsCard output={output as AccountStatsOutput} />;
    case "listDoesNotFollowBack": {
      const { result } = output as PaginatedListOutput;
      return <DoesNotFollowBackList initialItems={result.items} initialTotal={result.total} />;
    }
    case "listMutuals":
    case "listYouDontFollowBack":
      return <AccountListCard toolName={toolName} output={output as PaginatedListOutput} />;
    case "checkAccount":
      return <CheckAccountCard output={output as CheckAccountOutput} />;
    case "listRecentUnfollowers":
      return <RecentUnfollowersCard output={output as RecentUnfollowersOutput} />;
    case "listSnapshots":
      return <SnapshotsCard output={output as ListSnapshotsOutput} />;
    case "getQueueStatus":
      return <QueueStatusCard output={output as QueueStatusOutput} />;
    case "exportListAsCSV":
      return <ExportCSVCard output={output as ExportListAsCSVOutput} />;
    case "protectAccount":
      return <ProtectAccountCard output={output as ProtectAccountOutput} />;
    case "unprotectAccount":
      return <UnprotectAccountCard output={output as UnprotectAccountOutput} />;
    case "listProtectedAccounts":
      return <ProtectedAccountsCard output={output as ProtectedAccountsOutput} />;
    case "addExclusionRule":
      return <AddExclusionRuleCard output={output as AddExclusionRuleOutput} />;
    case "removeExclusionRule":
      return <RemoveExclusionRuleCard output={output as RemoveExclusionRuleOutput} />;
    case "listExclusionRules":
      return <ListExclusionRulesCard output={output as ListExclusionRulesOutput} />;
    default:
      return null;
  }
}
