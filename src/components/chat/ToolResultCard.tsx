"use client";

import { motion } from "framer-motion";
import { Check, ExternalLink, History, ListChecks, UploadCloud, UserCheck, UserMinus, UserPlus, UserX, Users, X } from "lucide-react";
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
    default:
      return null;
  }
}
