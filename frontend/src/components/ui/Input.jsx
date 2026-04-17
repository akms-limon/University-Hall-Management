import { forwardRef } from "react";
import { cn } from "@/utils/cn";

const Input = forwardRef(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-[4px] border border-[color:rgb(var(--ui-border)/0.35)] bg-[rgb(var(--bg-card)/0.98)] px-3 text-sm text-[rgb(var(--text-base))] placeholder:text-[rgb(var(--text-muted))]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ui-ring)/0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-deep))]",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export default Input;
