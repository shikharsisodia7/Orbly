import { Logo } from "./Logo";
import { cn } from "@/lib/utils/cn";

interface WordmarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  dark?: boolean;
}

const SIZES = {
  sm: { icon: 20, text: "text-base" },
  md: { icon: 26, text: "text-xl" },
  lg: { icon: 34, text: "text-2xl" },
};

export function Wordmark({ size = "md", className, dark = false }: WordmarkProps) {
  const config = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <Logo size={config.icon} />
      <span
        className={cn(
          "font-semibold tracking-tight",
          config.text,
          dark ? "text-white" : "text-neutral-950"
        )}
      >
        Orbly
      </span>
    </span>
  );
}
