import { Check, ExternalLink, SkipForward, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatFullDate } from "@/lib/utils/format";
import { removeQueueItem, updateQueueItemStatus } from "@/lib/db/queries";
import type { QueueItemRecord } from "@/lib/db/schema";

const SOURCE_LABEL: Record<QueueItemRecord["source"], string> = {
  "does-not-follow-back": "Doesn't follow you back",
  "recent-unfollower": "Recent unfollower",
  manual: "Added manually",
};

export function QueueItemRow({ item }: { item: QueueItemRecord }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Avatar username={item.normalizedUsername} size={34} />
        <div>
          <p className="text-sm font-medium text-ink">@{item.displayUsername}</p>
          <p className="text-xs text-ink-faint">
            {SOURCE_LABEL[item.source]} · Added {formatFullDate(item.addedAt)}
          </p>
        </div>
        {item.status !== "pending" && (
          <Badge tone={item.status === "completed" ? "green" : "neutral"}>
            {item.status === "completed" ? "Done" : "Skipped"}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <a
          href={item.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface"
        >
          Open Profile <ExternalLink size={12} />
        </a>
        {item.status === "pending" && (
          <>
            <button
              onClick={() => updateQueueItemStatus(item.id, "completed")}
              className="flex items-center gap-1.5 rounded-lg bg-green-soft px-3 py-1.5 text-xs font-medium text-green hover:bg-green-soft/70"
            >
              <Check size={13} /> Mark Done
            </button>
            <button
              onClick={() => updateQueueItemStatus(item.id, "skipped")}
              className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-hover"
            >
              <SkipForward size={13} /> Skip
            </button>
          </>
        )}
        <button
          onClick={() => removeQueueItem(item.id)}
          aria-label="Remove from queue"
          className="rounded-lg p-1.5 text-ink-faint hover:bg-surface hover:text-rose"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
