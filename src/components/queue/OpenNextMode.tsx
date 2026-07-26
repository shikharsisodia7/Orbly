"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Check, SkipForward } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PartyPopper } from "lucide-react";
import { updateQueueItemStatus } from "@/lib/db/queries";
import type { QueueItemRecord } from "@/lib/db/schema";

const SOURCE_LABEL: Record<QueueItemRecord["source"], string> = {
  "does-not-follow-back": "Doesn't follow you back",
  "recent-unfollower": "Recent unfollower",
  manual: "Added manually",
};

export function OpenNextMode({ items }: { items: QueueItemRecord[] }) {
  const current = items[0];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!current) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key.toLowerCase() === "d") {
        updateQueueItemStatus(current.id, "completed");
      } else if (e.key.toLowerCase() === "s") {
        updateQueueItemStatus(current.id, "skipped");
      } else if (e.key.toLowerCase() === "o") {
        window.open(current.profileUrl, "_blank", "noopener,noreferrer");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current]);

  if (!current) {
    return (
      <EmptyState
        icon={<PartyPopper size={20} />}
        title="You're all caught up."
        description="There's nothing left in your pending queue."
      />
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="text-center text-sm font-medium text-ink-faint">
        {items.length} {items.length === 1 ? "account" : "accounts"} remaining
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          className="mt-4 rounded-2xl border border-border bg-white p-8 text-center"
        >
          <div className="flex justify-center">
            <Avatar username={current.normalizedUsername} size={64} />
          </div>
          <p className="mt-4 text-lg font-semibold text-ink">@{current.displayUsername}</p>
          <div className="mt-2 flex justify-center">
            <Badge tone="orange">{SOURCE_LABEL[current.source]}</Badge>
          </div>

          <a
            href={current.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90"
          >
            Open Instagram Profile <ExternalLink size={14} />
          </a>

          <div className="mt-4 flex gap-2">
            <Button className="flex-1 gap-1.5" onClick={() => updateQueueItemStatus(current.id, "completed")}>
              <Check size={15} /> Done
            </Button>
            <Button
              variant="secondary"
              className="flex-1 gap-1.5"
              onClick={() => updateQueueItemStatus(current.id, "skipped")}
            >
              <SkipForward size={15} /> Skip
            </Button>
          </div>

          <p className="mt-5 text-xs text-ink-faint">
            Keyboard: <kbd className="rounded border border-border-strong px-1">D</kbd> done ·{" "}
            <kbd className="rounded border border-border-strong px-1">S</kbd> skip ·{" "}
            <kbd className="rounded border border-border-strong px-1">O</kbd> open
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
