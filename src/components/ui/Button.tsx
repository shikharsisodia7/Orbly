import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-white hover:bg-ink/90 active:bg-ink/80 disabled:bg-ink/40",
  secondary:
    "bg-white text-ink border border-border-strong hover:bg-surface active:bg-surface-hover disabled:opacity-50",
  ghost: "bg-transparent text-ink hover:bg-surface active:bg-surface-hover disabled:opacity-40",
  danger: "bg-rose text-white hover:bg-rose/90 active:bg-rose/80 disabled:bg-rose/40",
  dark: "bg-white text-near-black hover:bg-white/90 active:bg-white/80 disabled:opacity-40",
};

export const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-12 px-6 text-[15px] rounded-xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors duration-150 select-none disabled:cursor-not-allowed",
          "active:scale-[0.98] transition-transform",
          BUTTON_VARIANT_CLASSES[variant],
          BUTTON_SIZE_CLASSES[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
