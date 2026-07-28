"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, Loader2, UserMinus, UserX } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { formatCount } from "@/lib/utils/format";
import { listDoesNotFollowBack } from "@/lib/instagram/chat-tools";
import { markAccountUnfollowed } from "@/lib/db/queries";

interface ListItem {
  username: string;
  normalizedUsername: string;
  profileUrl: string;
}

interface DoesNotFollowBackListProps {
  initialItems: ListItem[];
  initialTotal: number;
}

/**
 * The interactive version of the doesn't-follow-back list: marking an
 * account as "unfollowed" removes it and pulls in the next one from the
 * full list, so working through the whole list feels like a continuous
 * queue rather than a single fixed page. Orbly has no live connection to
 * Instagram — this records what the user says they've done, the same way
 * the existing manual Unfollow Queue always has.
 *
 * Replenishment fetches use an `after: <last visible username>` cursor
 * rather than a numeric offset. listDoesNotFollowBack already excludes
 * resolved accounts, so the underlying filtered list shrinks by one every
 * time an item here gets marked done — a numeric offset would silently
 * drift and skip an account each time; a cursor anchored to actual content
 * stays correct regardless of how many items ahead of it disappear.
 */
export function DoesNotFollowBackList({ initialItems, initialTotal }: DoesNotFollowBackListProps) {
  const [items, setItems] = useState(initialItems);
  const [handledCount, setHandledCount] = useState(0);
  const [loadingUsername, setLoadingUsername] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);

  const remaining = Math.max(0, initialTotal - handledCount);

  async function handleUnfollowed(item: ListItem) {
    setLoadingUsername(item.normalizedUsername);
    setItems((prev) => prev.filter((i) => i.normalizedUsername !== item.normalizedUsername));
    setHandledCount((c) => c + 1);

    try {
      await markAccountUnfollowed({
        normalizedUsername: item.normalizedUsername,
        displayUsername: item.username,
        profileUrl: item.profileUrl,
      });

      if (!exhausted) {
        const cursor = items.length > 0 ? items[items.length - 1].normalizedUsername : item.normalizedUsername;
        const next = await listDoesNotFollowBack({ after: cursor, limit: 1 });
        if (next.available && next.result.items.length > 0) {
          const candidate = next.result.items[0];
          setItems((prev) =>
            prev.some((i) => i.normalizedUsername === candidate.normalizedUsername) ? prev : [...prev, candidate]
          );
        } else {
          setExhausted(true);
        }
      }
    } finally {
      setLoadingUsername(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 text-sm text-ink-soft">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-soft text-green">
          <Check size={14} />
        </div>
        {handledCount > 0 ? "You've worked through this list — nice." : "No accounts matched — try a different search."}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-2 rounded-2xl border border-border bg-white p-3">
      <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-orange">
        <UserX size={13} />
        <AnimatedCounter value={remaining} /> don&apos;t follow you back
      </div>
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.normalizedUsername}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface"
            >
              <Avatar username={item.username} size={26} />
              <a
                href={item.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sm text-ink hover:underline"
              >
                @{item.username}
              </a>
              <a
                href={item.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-ink-faint"
                aria-label={`Open @${item.username}'s profile`}
              >
                <ExternalLink size={12} />
              </a>
              <button
                onClick={() => handleUnfollowed(item)}
                disabled={loadingUsername === item.normalizedUsername}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-rose-soft hover:text-rose disabled:opacity-50"
                aria-label={`Mark @${item.username} as unfollowed`}
                title="I've unfollowed them on Instagram"
              >
                {loadingUsername === item.normalizedUsername ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <UserMinus size={12} />
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {handledCount > 0 && (
        <p className="px-1 pt-1 text-[11px] text-ink-faint">
          {formatCount(handledCount)} marked unfollowed this session — tap{" "}
          <UserMinus size={9} className="inline" /> once you&apos;ve actually unfollowed someone on Instagram.
        </p>
      )}
    </div>
  );
}
