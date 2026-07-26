"use client";

import { useMemo, useState } from "react";

export type SortDirection = "az" | "za";

interface HasUsername {
  normalizedUsername: string;
}

export function useAccountListControls<T extends HasUsername>(
  items: T[] | undefined,
  pageSize = 50
) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortDirection>("az");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    const base = q ? items.filter((i) => i.normalizedUsername.includes(q)) : items;
    return [...base].sort((a, b) =>
      sort === "az"
        ? a.normalizedUsername.localeCompare(b.normalizedUsername)
        : b.normalizedUsername.localeCompare(a.normalizedUsername)
    );
  }, [items, query, sort]);

  // Reset to page 0 whenever the query or sort changes, without an effect:
  // this is React's documented pattern for adjusting state during render.
  const controlsKey = `${query}|${sort}`;
  const [prevControlsKey, setPrevControlsKey] = useState(controlsKey);
  if (controlsKey !== prevControlsKey) {
    setPrevControlsKey(controlsKey);
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleSelect(username: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }

  function selectVisible() {
    setSelected((prev) => new Set([...prev, ...pageItems.map((i) => i.normalizedUsername)]));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  return {
    query,
    setQuery,
    sort,
    setSort,
    page: safePage,
    setPage,
    pageCount,
    pageItems,
    totalCount: items?.length ?? 0,
    filteredCount: filtered.length,
    selected,
    toggleSelect,
    selectVisible,
    clearSelection,
  };
}
