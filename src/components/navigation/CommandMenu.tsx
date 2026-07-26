"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useLatestSnapshot } from "@/hooks/useSnapshots";
import { useSnapshotFollowers, useSnapshotFollowing } from "@/hooks/useRelationships";
import { useQueueUsernames } from "@/hooks/useQueueUsernames";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

interface SearchRow {
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
  isFollower: boolean;
  isFollowing: boolean;
  inQueue: boolean;
}

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const latest = useLatestSnapshot();
  const followers = useSnapshotFollowers(latest?.id);
  const following = useSnapshotFollowing(latest?.id);
  const queueUsernames = useQueueUsernames();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const rows: SearchRow[] = useMemo(() => {
    const map = new Map<string, SearchRow>();
    for (const f of followers ?? []) {
      map.set(f.normalizedUsername, {
        normalizedUsername: f.normalizedUsername,
        displayUsername: f.displayUsername,
        profileUrl: f.profileUrl,
        isFollower: true,
        isFollowing: false,
        inQueue: queueUsernames.has(f.normalizedUsername),
      });
    }
    for (const f of following ?? []) {
      const existing = map.get(f.normalizedUsername);
      if (existing) {
        existing.isFollowing = true;
      } else {
        map.set(f.normalizedUsername, {
          normalizedUsername: f.normalizedUsername,
          displayUsername: f.displayUsername,
          profileUrl: f.profileUrl,
          isFollower: false,
          isFollowing: true,
          inQueue: queueUsernames.has(f.normalizedUsername),
        });
      }
    }
    return Array.from(map.values());
  }, [followers, following, queueUsernames]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows.slice(0, 8);
    return rows.filter((r) => r.normalizedUsername.includes(q)).slice(0, 20);
  }, [rows, query]);

  if (typeof document === "undefined") return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-border-strong bg-white px-3 text-sm text-ink-faint md:w-64"
        aria-label="Search"
      >
        <Search size={15} />
        <span className="flex-1 text-left">Search accounts…</span>
        <kbd className="rounded border border-border-strong bg-surface px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
              <motion.div
                className="absolute inset-0 bg-near-black/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Search accounts"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
              >
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <Search size={16} className="text-ink-faint" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search followers, following, or queue…"
                    className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                  />
                  <kbd className="rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-ink-faint">
                    Esc
                  </kbd>
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                  {results.length === 0 && (
                    <p className="px-3 py-8 text-center text-sm text-ink-faint">
                      No accounts match that search.
                    </p>
                  )}
                  {results.map((r) => (
                    <a
                      key={r.normalizedUsername}
                      href={r.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface"
                    >
                      <Avatar username={r.normalizedUsername} size={30} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">@{r.displayUsername}</p>
                        <p className="text-xs text-ink-faint">
                          {r.isFollower && r.isFollowing
                            ? "Mutual"
                            : r.isFollower
                              ? "Doesn't follow back"
                              : "Doesn't follow you back"}
                        </p>
                      </div>
                      {r.inQueue && <Badge tone="rose">In queue</Badge>}
                    </a>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
