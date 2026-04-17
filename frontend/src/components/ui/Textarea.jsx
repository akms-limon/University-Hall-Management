import { forwardRef } from "react";
import { cn } from "@/utils/cn";

const Textarea = forwardRef(({ className, rows = 4, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded-[10px] border border-[color:rgb(var(--ui-border)/0.28)] bg-[rgb(var(--bg-muted)/0.9)] px-3 py-2 text-sm text-[rgb(var(--text-base))] placeholder:text-[rgb(var(--text-muted))]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ui-ring)/0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-deep))]",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export default Textarea;
