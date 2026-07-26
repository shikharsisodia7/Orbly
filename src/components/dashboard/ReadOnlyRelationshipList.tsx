"use client";

import type { ReactNode } from "react";
import { useAccountListControls } from "@/hooks/useAccountListControls";
import { ListControls } from "./ListControls";
import { Pagination } from "./Pagination";
import { AccountRow } from "./AccountRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchX } from "lucide-react";
import type { Relationship } from "@/lib/instagram/types";

interface ReadOnlyRelationshipListProps {
  items: Relationship[];
  renderBadge: (item: Relationship) => ReactNode;
}

export function ReadOnlyRelationshipList({ items, renderBadge }: ReadOnlyRelationshipListProps) {
  const controls = useAccountListControls(items);

  return (
    <div>
      <ListControls
        query={controls.query}
        onQueryChange={controls.setQuery}
        sort={controls.sort}
        onSortChange={controls.setSort}
      />

      <div className="mt-4">
        {controls.filteredCount === 0 ? (
          <EmptyState icon={<SearchX size={18} />} title="No accounts match that search." />
        ) : (
          <div className="rounded-2xl border border-border bg-white p-2">
            {controls.pageItems.map((item) => (
              <AccountRow
                key={item.normalizedUsername}
                normalizedUsername={item.normalizedUsername}
                displayUsername={item.displayUsername}
                profileUrl={item.profileUrl}
                badge={renderBadge(item)}
              />
            ))}
          </div>
        )}
      </div>

      <Pagination page={controls.page} pageCount={controls.pageCount} onPageChange={controls.setPage} />
    </div>
  );
}
