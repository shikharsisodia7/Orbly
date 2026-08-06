"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, History, PlugZap, Upload, UserMinus, UserPlus } from "lucide-react";
import { useFollowerChecks } from "@/hooks/useFollowerChecks";

/**
 * A short, read-only log of every past "Check Now" — from either the web
 * app (right after an import) or the browser extension — so a user can see
 * more than just the single most recent diff. Collapsed by default to stay
 * out of the way; the list itself never triggers a check on its own.
 */
export function CheckInHistory() {
  const checks = useFollowerChecks();
  const [open, setOpen] = useState(false);

  if (!checks || checks.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm"
      >
        <span className="flex items-center gap-1.5 font-medium text-ink">
          <History size={14} className="text-ink-faint" /> Check-in history
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-normal text-ink-soft">
            {checks.length}
          </span>
        </span>
        <ChevronDown size={14} className={`text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 border-t border-border px-3 py-2">
              {checks.map((check) => (
                <div key={check.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs">
                  <div className="flex items-center gap-2 text-ink-soft">
                    {check.source === "extension" ? (
                      <PlugZap size={12} className="shrink-0 text-ink-faint" />
                    ) : (
                      <Upload size={12} className="shrink-0 text-ink-faint" />
                    )}
                    {new Date(check.checkedAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex items-center gap-1 text-rose">
                      <UserMinus size={11} /> {check.unfollowedCount}
                    </span>
                    <span className="flex items-center gap-1 text-green">
                      <UserPlus size={11} /> {check.newFollowerCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
