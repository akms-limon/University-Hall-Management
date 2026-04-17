import { cn } from "@/utils/cn";

function Tabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-[color:rgb(var(--ui-border)/0.7)] bg-[rgb(var(--bg-muted)/0.4)] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs sm:text-sm transition-colors",
            value === tab.value
              ? "border border-[color:var(--role-accent-border)] bg-[var(--role-accent-soft)] text-[var(--role-accent-text)]"
              : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-base))]"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
