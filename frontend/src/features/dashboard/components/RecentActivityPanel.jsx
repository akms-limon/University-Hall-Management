import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

function RecentActivityPanel({ items }) {
  return (
    <SectionCard title="Recent Activity" description="Latest system events from your workspace">
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-700/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{item.text}</p>
              <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
            </div>
            <p className="text-xs text-slate-400 mt-2">{item.time}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

export default RecentActivityPanel;

