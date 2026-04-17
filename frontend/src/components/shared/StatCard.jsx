import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

const toneStyles = {
  primary: "before:bg-[linear-gradient(135deg,rgb(var(--accent-primary)),rgb(var(--accent-secondary)))]",
  info: "before:bg-[linear-gradient(135deg,rgb(var(--accent-secondary)),rgb(var(--accent-primary)))]",
  success: "before:bg-[linear-gradient(135deg,rgb(var(--accent-success)),rgb(var(--accent-secondary)))]",
  warning: "before:bg-[linear-gradient(135deg,rgb(var(--accent-warning)),rgb(var(--accent-danger)))]",
};

function StatCard({ title, value, hint, tone = "primary", className }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[color:rgb(var(--ui-border)/0.18)] bg-[rgb(var(--bg-card)/0.96)] p-4 shadow-[var(--shadow-soft)] before:absolute before:inset-x-0 before:top-0 before:h-[3px] sm:p-5",
        toneStyles[tone] || toneStyles.primary,
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">{title}</p>
      <p className="mt-2 font-display text-2xl font-semibold leading-none tracking-[-0.015em]">{value}</p>
      <p className="mt-2 text-[11px] text-[rgb(var(--text-muted))]">{hint}</p>
    </motion.article>
  );
}

export default StatCard;
