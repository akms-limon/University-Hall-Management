import { Inbox } from "lucide-react";
import Button from "@/components/ui/Button";

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-2xl border border-dashed border-[color:rgb(var(--ui-border)/0.75)] bg-[rgb(var(--bg-muted)/0.42)] p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-[color:rgb(var(--ui-border)/0.66)] bg-[rgb(var(--bg-card)/0.78)]">
        <Inbox size={18} className="text-[rgb(var(--text-soft))]" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">{description}</p>
      {actionLabel ? (
        <Button size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
