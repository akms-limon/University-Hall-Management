import { forwardRef } from "react";
import { cn } from "@/utils/cn";

const styles = {
  primary:
    "border-[rgba(var(--accent-warning),0.45)] bg-[rgb(var(--accent-warning))] text-[rgb(var(--accent-primary))] shadow-[0_6px_18px_rgba(201,162,39,0.26)] hover:brightness-105",
  secondary:
    "border-[color:rgb(var(--ui-border)/0.4)] bg-[rgb(var(--bg-card)/0.98)] text-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--bg-muted)/0.7)]",
  ghost:
    "border-[color:rgb(var(--ui-border)/0.34)] bg-transparent text-[rgb(var(--accent-primary))] hover:bg-[rgb(var(--bg-muted)/0.68)]",
  danger:
    "border-[rgba(var(--accent-danger),0.35)] bg-[rgba(var(--accent-danger),0.12)] text-[rgb(var(--accent-danger))] hover:bg-[rgba(var(--accent-danger),0.18)]",
};

const sizes = {
  sm: "h-10 px-3 text-xs sm:h-8",
  md: "h-11 px-3.5 text-sm sm:h-9",
  lg: "h-12 px-4 text-sm sm:h-10",
};

const Button = forwardRef(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-[4px] border font-semibold transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ui-ring)/0.6)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-deep))]",
          "disabled:pointer-events-none disabled:opacity-60",
          styles[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export default Button;
