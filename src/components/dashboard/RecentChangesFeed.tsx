import Link from "next/link";
import { UserPlus, UserMinus, UserX, UserCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatDateRange } from "@/lib/utils/format";
import type { SnapshotChanges } from "@/lib/instagram/comparisons";
import type { SnapshotRecord } from "@/lib/db/schema";

interface RecentChangesFeedProps {
  changes: SnapshotChanges;
  from: SnapshotRecord;
  to: SnapshotRecord;
}

export function RecentChangesFeed({ changes, from, to }: RecentChangesFeedProps) {
  const range = formatDateRange(from.createdAt, to.createdAt);

  const items = [
    ...changes.newFollowers.map((r) => ({
      key: `new-${r.normalizedUsername}`,
      username: r.normalizedUsername,
      display: r.displayUsername,
      icon: UserPlus,
      tone: "text-green",
      label: "New follower",
    })),
    ...changes.lostFollowers.map((r) => ({
      key: `lost-${r.normalizedUsername}`,
      username: r.normalizedUsername,
      display: r.displayUsername,
      icon: UserMinus,
      tone: "text-rose",
      label: "No longer follows you",
    })),
    ...changes.stoppedFollowing.map((r) => ({
      key: `stopped-${r.normalizedUsername}`,
      username: r.normalizedUsername,
      display: r.displayUsername,
      icon: UserX,
      tone: "text-ink-faint",
      label: `You stopped following @${r.displayUsername}`,
    })),
    ...changes.startedFollowing.map((r) => ({
      key: `started-${r.normalizedUsername}`,
      username: r.normalizedUsername,
      display: r.displayUsername,
      icon: UserCheck,
      tone: "text-blue",
      label: `You started following @${r.displayUsername}`,
    })),
  ].slice(0, 8);

  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Recent changes</h3>
        <Link href="/app/unfollowers" className="text-xs font-medium text-blue hover:underline">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No changes detected between your last two snapshots.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3">
              <Avatar username={item.username} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">
                  {item.label.startsWith("You") ? item.label : (
                    <>
                      <span className="font-medium">@{item.display}</span> — {item.label}
                    </>
                  )}
                </p>
                <p className="text-xs text-ink-faint">Detected between {range}</p>
              </div>
              <item.icon size={16} className={item.tone} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
