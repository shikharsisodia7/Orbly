"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Users, UserCheck, UserMinus, ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";

const SYNTHETIC_CHANGES = [
  { username: "alexriver", status: "lost" as const },
  { username: "maya.c", status: "lost" as const },
  { username: "noahs", status: "new" as const },
  { username: "jordanlee", status: "steady" as const },
];

const PHASES = ["counts", "breakdown", "changes", "lost"] as const;
type Phase = (typeof PHASES)[number];

const PHASE_DURATION_MS = 2200;

export function HeroDemo() {
  const prefersReducedMotion = useReducedMotion();
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => {
      setPhaseIndex((i) => (i + 1) % PHASES.length);
    }, PHASE_DURATION_MS);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  const phase: Phase = prefersReducedMotion ? "breakdown" : PHASES[phaseIndex];

  return (
    <div
      className="relative mx-auto w-full max-w-sm rounded-3xl border border-border bg-white p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]"
      aria-hidden
    >
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-rose" />
          <div className="h-2 w-2 rounded-full bg-orange" />
          <div className="h-2 w-2 rounded-full bg-green" />
        </div>
        <span className="text-xs font-medium text-ink-faint">orbly.app/dashboard</span>
      </div>

      <div className="relative mt-5 h-[280px] overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === "counts" && (
            <motion.div
              key="counts"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex h-full flex-col justify-center gap-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-soft text-rose">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Followers</p>
                  <p className="text-2xl font-semibold text-ink">
                    <AnimatedCounter value={1824} />
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-soft text-violet">
                  <UserCheck size={18} />
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Following</p>
                  <p className="text-2xl font-semibold text-ink">
                    <AnimatedCounter value={1249} />
                  </p>
                </div>
              </div>
              <div className="flex -space-x-2 pt-2">
                {["riv.er", "maya.c", "noahs", "jordanl", "kimo"].map((u) => (
                  <Avatar key={u} username={u} size={30} className="ring-2 ring-white" />
                ))}
              </div>
            </motion.div>
          )}

          {phase === "breakdown" && (
            <motion.div
              key="breakdown"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex h-full flex-col justify-center gap-4"
            >
              <p className="text-xs font-medium text-ink-faint">Your circle</p>
              {[
                { label: "Mutual", value: 1061, tone: "bg-green", soft: "bg-green-soft text-green" },
                { label: "Don't follow you back", value: 188, tone: "bg-orange", soft: "bg-orange-soft text-orange" },
                { label: "You don't follow back", value: 763, tone: "bg-blue", soft: "bg-blue-soft text-blue" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-ink-soft">
                    <span className={`h-2 w-2 rounded-full ${row.tone}`} />
                    {row.label}
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    <AnimatedCounter value={row.value} />
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {phase === "changes" && (
            <motion.div
              key="changes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex h-full flex-col justify-center gap-3"
            >
              <p className="text-xs font-medium text-ink-faint">Recent changes</p>
              {SYNTHETIC_CHANGES.map((c, i) => (
                <motion.div
                  key={c.username}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12, duration: 0.3 }}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                >
                  <Avatar username={c.username} size={28} />
                  <span className="flex-1 text-sm text-ink">@{c.username}</span>
                  <span className="text-xs text-ink-faint">
                    {c.status === "lost" ? "Lost follower" : c.status === "new" ? "New follower" : "Mutual"}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {phase === "lost" && (
            <motion.div
              key="lost"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex h-full flex-col justify-center gap-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-ink-faint">Lost followers</p>
                <span className="rounded-full bg-rose-soft px-2.5 py-1 text-xs font-medium text-rose">
                  2 changes detected
                </span>
              </div>
              {SYNTHETIC_CHANGES.filter((c) => c.status === "lost").map((c, i) => (
                <motion.div
                  key={c.username}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.15, duration: 0.3 }}
                  className="flex items-center gap-3 rounded-xl bg-rose-soft/60 px-3 py-2.5"
                >
                  <Avatar username={c.username} size={28} />
                  <div className="flex-1">
                    <p className="text-sm text-ink">@{c.username}</p>
                    <p className="text-[11px] text-ink-faint">Detected Jul 25 – Aug 3</p>
                  </div>
                  <UserMinus size={16} className="text-rose" />
                </motion.div>
              ))}
              <div className="flex items-center gap-1.5 pt-1 text-xs font-medium text-ink-faint">
                Open next profile <ArrowRight size={12} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
