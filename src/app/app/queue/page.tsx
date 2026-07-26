"use client";

import { useState } from "react";
import { ListChecks, Zap, List } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { QueueItemRow } from "@/components/queue/QueueItemRow";
import { OpenNextMode } from "@/components/queue/OpenNextMode";
import { QueueExportMenu } from "@/components/queue/QueueExportMenu";
import { useQueueItems } from "@/hooks/useQueue";
import { cn } from "@/lib/utils/cn";
import type { QueueStatus } from "@/lib/db/schema";

const TABS: { id: QueueStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Completed" },
  { id: "skipped", label: "Skipped" },
];

export default function QueuePage() {
  const [tab, setTab] = useState<QueueStatus>("pending");
  const [mode, setMode] = useState<"list" | "open-next">("list");
  const items = useQueueItems(tab);
  const allItems = useQueueItems();

  return (
    <>
      <PageHeader
        title="Unfollow Queue"
        subtitle="Orbly opens each profile for you — you decide whether to unfollow."
        action={allItems && allItems.length > 0 ? <QueueExportMenu items={allItems} /> : undefined}
      />

      {(!allItems || allItems.length === 0) ? (
        <EmptyState
          icon={<ListChecks size={20} />}
          title="Your cleanup queue is empty."
          description="Add accounts from Doesn't Follow Back or Recent Unfollowers to start building your queue."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-lg border border-border-strong bg-white p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium",
                    tab === t.id ? "bg-surface text-ink" : "text-ink-faint"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "pending" && (
              <div className="flex gap-1 rounded-lg border border-border-strong bg-white p-1">
                <button
                  onClick={() => setMode("list")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                    mode === "list" ? "bg-surface text-ink" : "text-ink-faint"
                  )}
                >
                  <List size={14} /> List
                </button>
                <button
                  onClick={() => setMode("open-next")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                    mode === "open-next" ? "bg-surface text-ink" : "text-ink-faint"
                  )}
                >
                  <Zap size={14} /> Open Next
                </button>
              </div>
            )}
          </div>

          <div className="mt-5">
            {!items ? null : items.length === 0 ? (
              <EmptyState title={`No ${tab} items.`} />
            ) : tab === "pending" && mode === "open-next" ? (
              <OpenNextMode items={items} />
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <QueueItemRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
