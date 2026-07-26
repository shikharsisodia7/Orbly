"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ProcessingStageId =
  | "opening-zip"
  | "scanning-files"
  | "finding-followers"
  | "finding-following"
  | "normalizing"
  | "deduplicating"
  | "calculating"
  | "checking-duplicate"
  | "complete";

const STAGE_ORDER: { id: ProcessingStageId; label: string }[] = [
  { id: "opening-zip", label: "Opening ZIP" },
  { id: "scanning-files", label: "Scanning files" },
  { id: "finding-followers", label: "Finding Followers" },
  { id: "finding-following", label: "Finding Following" },
  { id: "normalizing", label: "Normalizing usernames" },
  { id: "deduplicating", label: "Removing duplicates" },
  { id: "calculating", label: "Calculating relationships" },
  { id: "checking-duplicate", label: "Checking existing snapshots" },
];

export function ProcessingStages({ current }: { current: ProcessingStageId }) {
  const currentIndex =
    current === "complete" ? STAGE_ORDER.length : STAGE_ORDER.findIndex((s) => s.id === current);

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-7">
      <p className="text-sm font-semibold text-ink">
        {current === "complete" ? "Analysis complete" : "Analyzing your export…"}
      </p>
      <ul className="mt-5 space-y-3.5">
        {STAGE_ORDER.map((stage, i) => {
          const isDone = i < currentIndex;
          const isActive = i === currentIndex;
          return (
            <li key={stage.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  isDone ? "bg-green text-white" : isActive ? "bg-ink text-white" : "bg-surface text-ink-faint"
                )}
              >
                {isDone ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                    <Check size={12} />
                  </motion.span>
                ) : isActive ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
              </span>
              <span className={cn("text-sm", isDone || isActive ? "text-ink" : "text-ink-faint")}>
                {stage.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
