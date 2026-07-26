"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useAccountListControls } from "@/hooks/useAccountListControls";
import { ListControls } from "./ListControls";
import { Pagination } from "./Pagination";
import { AccountRow } from "./AccountRow";
import { SelectionBar } from "./SelectionBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchX } from "lucide-react";
import { addManyToQueue } from "@/lib/db/queries";
import { useQueueUsernames } from "@/hooks/useQueueUsernames";
import { Badge } from "@/components/ui/Badge";
import type { Relationship } from "@/lib/instagram/types";
import type { QueueSource } from "@/lib/db/schema";

interface SelectableRelationshipListProps {
  items: Relationship[];
  queueSource: QueueSource;
  renderBadge?: (item: Relationship) => ReactNode;
}

export function SelectableRelationshipList({ items, queueSource, renderBadge }: SelectableRelationshipListProps) {
  const controls = useAccountListControls(items);
  const queuedUsernames = useQueueUsernames();
  const [justAdded, setJustAdded] = useState(0);

  async function handleAddToQueue() {
    const map = new Map(items.map((i) => [i.normalizedUsername, i]));
    const toAdd = Array.from(controls.selected)
      .map((username) => map.get(username))
      .filter((i): i is Relationship => !!i)
      .map((i) => ({
        normalizedUsername: i.normalizedUsername,
        displayUsername: i.displayUsername,
        profileUrl: i.profileUrl,
        source: queueSource,
      }));
    const added = await addManyToQueue(toAdd);
    setJustAdded(added);
    controls.clearSelection();
  }

  return (
    <div>
      <ListControls query={controls.query} onQueryChange={controls.setQuery} sort={controls.sort} onSortChange={controls.setSort} />

      {justAdded > 0 && (
        <p className="mt-3 rounded-lg bg-green-soft px-3 py-2 text-sm text-green">
          Added {justAdded} {justAdded === 1 ? "account" : "accounts"} to your Unfollow Queue.
        </p>
      )}

      <div className="mt-4">
        {controls.filteredCount === 0 ? (
          <EmptyState icon={<SearchX size={18} />} title="No accounts match that search." />
        ) : (
          <div className="rounded-2xl border border-border bg-white p-2">
            {controls.pageItems.map((item) => {
              const inQueue = queuedUsernames.has(item.normalizedUsername);
              return (
                <AccountRow
                  key={item.normalizedUsername}
                  normalizedUsername={item.normalizedUsername}
                  displayUsername={item.displayUsername}
                  profileUrl={item.profileUrl}
                  selectable
                  selected={controls.selected.has(item.normalizedUsername)}
                  onToggleSelect={() => controls.toggleSelect(item.normalizedUsername)}
                  badge={
                    inQueue ? (
                      <Badge tone="rose">In queue</Badge>
                    ) : renderBadge ? (
                      renderBadge(item)
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      <Pagination page={controls.page} pageCount={controls.pageCount} onPageChange={controls.setPage} />

      <SelectionBar
        count={controls.selected.size}
        onSelectVisible={controls.selectVisible}
        onClear={controls.clearSelection}
        onAddToQueue={handleAddToQueue}
      />
    </div>
  );
}
