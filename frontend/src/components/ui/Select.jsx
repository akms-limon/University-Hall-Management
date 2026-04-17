import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

const Select = forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-11 w-full appearance-none rounded-[4px] border border-[color:rgb(var(--ui-border)/0.35)] bg-[rgb(var(--bg-card)/0.98)] px-3 pr-10 text-sm text-[rgb(var(--text-base))] sm:h-10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ui-ring)/0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-deep))]",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]"
        size={16}
      />
    </div>
  );
});

Select.displayName = "Select";

export default Select;
