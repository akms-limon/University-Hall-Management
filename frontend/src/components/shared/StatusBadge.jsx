import { cn } from "@/utils/cn";

const statusStyles = {
  primary:
    "bg-[rgba(var(--accent-primary),0.16)] text-[rgb(10,61,46)] border-[rgba(var(--accent-primary),0.34)]",
  success:
    "bg-[rgba(var(--accent-success),0.18)] text-[rgb(12,92,60)] border-[rgba(var(--accent-success),0.38)]",
  warning:
    "bg-[rgba(var(--accent-warning),0.26)] text-[rgb(92,66,10)] border-[rgba(var(--accent-warning),0.5)]",
  info:
    "bg-[rgba(var(--accent-secondary),0.18)] text-[rgb(9,58,43)] border-[rgba(var(--accent-secondary),0.35)]",
  danger:
    "bg-[rgba(var(--accent-danger),0.16)] text-[rgb(127,33,33)] border-[rgba(var(--accent-danger),0.38)]",
  neutral:
    "border-[color:rgb(var(--ui-border)/0.55)] bg-[rgb(var(--bg-muted)/0.82)] text-[rgb(var(--accent-primary))]",
};

function StatusBadge({ tone = "neutral", children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em]",
        statusStyles[tone] || statusStyles.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

export default StatusBadge;
