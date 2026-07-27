"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink, Check, AlertTriangle } from "lucide-react";
import { WIZARD_STAGES } from "./wizard-steps";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface ExportWizardProps {
  onFinish: () => void;
}

export function ExportWizard({ onFinish }: ExportWizardProps) {
  const [index, setIndex] = useState(0);
  const stage = WIZARD_STAGES[index];
  const isLast = index === WIZARD_STAGES.length - 1;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex items-center justify-center gap-2">
        {WIZARD_STAGES.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-2.5 w-2.5 items-center justify-center rounded-full transition-colors",
                i < index ? "bg-ink" : i === index ? "bg-ink ring-4 ring-ink/15" : "bg-border-strong"
              )}
            />
            {i < WIZARD_STAGES.length - 1 && (
              <div className={cn("h-px w-8 sm:w-12", i < index ? "bg-ink" : "bg-border-strong")} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-2 text-[11px] font-medium text-ink-faint">
        <span>
          Step {index + 1} of {WIZARD_STAGES.length}
        </span>
      </div>

      <div className="relative mt-8 min-h-[280px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-border bg-white p-7"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-rose">{stage.label}</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">{stage.title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{stage.body}</p>

            <ul className="mt-5 space-y-3">
              {stage.substeps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-ink">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-ink-soft">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>

            {stage.callout && (
              <div className="mt-5 flex gap-2.5 rounded-xl border border-orange/30 bg-orange-soft/50 p-4">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange" />
                <p className="text-xs leading-relaxed text-ink-soft">{stage.callout}</p>
              </div>
            )}

            {stage.action && (
              <a
                href={stage.action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
              >
                {stage.action.label}
                <ExternalLink size={14} />
              </a>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="gap-1.5"
        >
          <ArrowLeft size={15} />
          Back
        </Button>
        {isLast ? (
          <Button onClick={onFinish} className="gap-1.5">
            <Check size={15} />
            I have my ZIP — upload it
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => Math.min(WIZARD_STAGES.length - 1, i + 1))} className="gap-1.5">
            Next
            <ArrowRight size={15} />
          </Button>
        )}
      </div>
    </div>
  );
}
