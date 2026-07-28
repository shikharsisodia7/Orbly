"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bot, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Turn {
  question: string;
  tool: string;
  answer: string;
}

const TURNS: Turn[] = [
  {
    question: "Who doesn't follow me back?",
    tool: "Checked get account stats",
    answer:
      "342 accounts you follow don't follow you back — out of 1,249 you follow and 1,824 followers. Want the list?",
  },
  {
    question: "Did @mayac unfollow me?",
    tool: "Checked recent unfollowers",
    answer: "Yes — @mayac followed you until Aug 2, then stopped. You still follow them back.",
  },
];

type Stage = "user" | "tool" | "answer" | "hold" | "clearing";

const STAGE_DURATIONS: Record<Stage, number> = {
  user: 900,
  tool: 1000,
  answer: 2600,
  hold: 1400,
  clearing: 500,
};

export function HeroDemo() {
  const prefersReducedMotion = useReducedMotion();
  const [turnIndex, setTurnIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("user");

  useEffect(() => {
    if (prefersReducedMotion) return;

    const timer = setTimeout(() => {
      if (stage === "user") {
        setStage("tool");
      } else if (stage === "tool") {
        setStage("answer");
      } else if (stage === "answer") {
        const isLast = turnIndex === TURNS.length - 1;
        setStage(isLast ? "clearing" : "hold");
      } else if (stage === "hold") {
        setTurnIndex((i) => i + 1);
        setStage("user");
      } else if (stage === "clearing") {
        setTurnIndex(0);
        setStage("user");
      }
    }, STAGE_DURATIONS[stage]);

    return () => clearTimeout(timer);
  }, [stage, turnIndex, prefersReducedMotion]);

  const effectiveTurn = prefersReducedMotion ? 0 : turnIndex;
  const effectiveStage: Stage = prefersReducedMotion ? "answer" : stage;
  const showThisTurn = effectiveStage !== "clearing";
  const current = TURNS[effectiveTurn];

  return (
    <div
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <div className="rounded-full bg-gradient-instagram p-[2px]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
            <Sparkles size={13} className="text-violet" />
          </div>
        </div>
        <span className="text-sm font-semibold text-ink">Ask Orbly</span>
      </div>

      <div className="relative flex h-[300px] flex-col justify-end gap-3 overflow-hidden px-5 py-5">
        <AnimatePresence mode="wait">
          {showThisTurn && (
            <motion.div
              key={effectiveTurn}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col justify-end gap-3"
            >
              <div className="flex flex-row-reverse items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                  <User size={11} />
                </div>
                <div className="max-w-[80%] rounded-2xl bg-ink px-3.5 py-2 text-sm text-white">
                  {current.question}
                </div>
              </div>

              {(effectiveStage === "tool" || effectiveStage === "answer" || effectiveStage === "hold") && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="ml-8 flex items-center gap-2 self-start rounded-full border border-border-strong px-3 py-1.5 text-xs text-ink-faint"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      effectiveStage === "tool" ? "animate-pulse-ring bg-violet" : "bg-green"
                    )}
                  />
                  {current.tool}
                </motion.div>
              )}

              {(effectiveStage === "answer" || effectiveStage === "hold") && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-2 self-start"
                >
                  <div className="rounded-full bg-gradient-instagram p-[2px]">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                      <Bot size={12} className="text-ink" />
                    </div>
                  </div>
                  <div className="max-w-[85%] rounded-2xl bg-surface px-3.5 py-2 text-sm leading-relaxed text-ink">
                    {current.answer}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
