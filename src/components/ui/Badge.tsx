import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "rose" | "violet" | "blue" | "orange" | "green";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface text-ink-soft",
  rose: "bg-rose-soft text-rose",
  violet: "bg-violet-soft text-violet",
  blue: "bg-blue-soft text-blue",
  orange: "bg-orange-soft text-orange",
  green: "bg-green-soft text-green",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
