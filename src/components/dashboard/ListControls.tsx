"use client";

import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import type { SortDirection } from "@/hooks/useAccountListControls";

interface ListControlsProps {
  query: string;
  onQueryChange: (v: string) => void;
  sort: SortDirection;
  onSortChange: (v: SortDirection) => void;
  placeholder?: string;
}

export function ListControls({ query, onQueryChange, sort, onSortChange, placeholder }: ListControlsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex-1">
        <Input
          icon
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder ?? "Search usernames…"}
          aria-label="Search usernames"
        />
      </div>
      <div className="flex gap-1 rounded-lg border border-border-strong bg-white p-1">
        <button
          onClick={() => onSortChange("az")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
            sort === "az" ? "bg-surface text-ink" : "text-ink-faint"
          )}
          aria-pressed={sort === "az"}
        >
          <ArrowDownAZ size={14} /> A–Z
        </button>
        <button
          onClick={() => onSortChange("za")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
            sort === "za" ? "bg-surface text-ink" : "text-ink-faint"
          )}
          aria-pressed={sort === "za"}
        >
          <ArrowUpAZ size={14} /> Z–A
        </button>
      </div>
    </div>
  );
}
