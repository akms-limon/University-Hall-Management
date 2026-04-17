import { cn } from "@/utils/cn";

function SectionCard({ title, description, action, className, children }) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[8px] border border-[color:rgb(var(--ui-border)/0.28)] bg-[rgb(var(--bg-card)/0.98)] shadow-[var(--shadow-soft)]",
        className
      )}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:rgb(var(--ui-border)/0.24)] bg-[rgb(var(--bg-muted)/0.35)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title ? (
              <h3 className="font-display text-[15px] font-semibold leading-tight text-[rgb(var(--accent-primary))] sm:text-base">
                {title}
              </h3>
            ) : null}
            {description ? <p className="mt-1 text-xs text-[rgb(var(--text-muted))] sm:text-[13px]">{description}</p> : null}
          </div>
          {action ? <div className="w-full sm:w-auto">{action}</div> : null}
        </header>
      )}
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

export default SectionCard;
