import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

function PageHeader({ eyebrow, title, description, breadcrumb, actions, className }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-3", className)}
    >
      <div className="min-w-0 flex-1">
        {breadcrumb ? <p className="break-words text-xs text-[rgb(var(--text-muted))]">{breadcrumb}</p> : null}
        {eyebrow ? (
          <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[rgb(var(--accent-secondary))]">
            <span className="h-0.5 w-4 rounded-full bg-[rgb(var(--accent-warning))]" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[clamp(1.2rem,1.8vw,1.75rem)] font-semibold leading-[1.15] tracking-[-0.015em]">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-2xl text-[13px] text-[rgb(var(--text-muted))]">{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
    </motion.header>
  );
}

export default PageHeader;
