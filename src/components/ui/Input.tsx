import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            size={16}
            aria-hidden
          />
          <input
            ref={ref}
            className={cn(
              "h-10 w-full rounded-lg border border-border-strong bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint",
              "focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-blue/20",
              className
            )}
            {...props}
          />
        </div>
      );
    }
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-lg border border-border-strong bg-white px-3 text-sm text-ink placeholder:text-ink-faint",
          "focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-blue/20",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
