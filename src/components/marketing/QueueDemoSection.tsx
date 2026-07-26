"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

const CANDIDATES = [
  { username: "alexriver", status: "Doesn't follow you back" },
  { username: "maya.c", status: "Mutual" },
  { username: "jordanlee", status: "Doesn't follow you back" },
];

export function QueueDemoSection() {
  const prefersReducedMotion = useReducedMotion();
  const [stage, setStage] = useState<0 | 1>(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => setStage((s) => (s === 0 ? 1 : 0)), 2800);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-ink">
            Clean up your following, at your pace.
          </h2>
          <p className="mt-4 max-w-md text-ink-soft">
            Select the accounts you no longer want to follow and add them to your queue. Orbly
            opens each profile for you — you always make the final call.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-sm rounded-3xl border border-border bg-white p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]">
          <AnimatePresence mode="wait">
            {stage === 0 ? (
              <motion.div
                key="select"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col gap-3"
              >
                <p className="text-xs font-medium text-ink-faint">Doesn&apos;t follow you back</p>
                {CANDIDATES.map((c) => (
                  <div key={c.username} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                    <Avatar username={c.username} size={28} />
                    <div className="flex-1">
                      <p className="text-sm text-ink">@{c.username}</p>
                      <p className="text-[11px] text-ink-faint">{c.status}</p>
                    </div>
                    {c.status !== "Mutual" && (
                      <span className="rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white">Add</span>
                    )}
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="queue"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-ink-faint">Unfollow queue</p>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft">
                    2 remaining
                  </span>
                </div>
                <div className="rounded-xl bg-cream p-4">
                  <div className="flex items-center gap-3">
                    <Avatar username="alexriver" size={36} />
                    <div>
                      <p className="text-sm font-medium text-ink">@alexriver</p>
                      <p className="text-[11px] text-ink-faint">Doesn&apos;t follow you back</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-xs font-medium text-white">
                    Open Instagram Profile <ExternalLink size={12} />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
                  Open next profile <ArrowRight size={12} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
