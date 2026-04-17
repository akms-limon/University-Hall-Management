import SectionCard from "@/components/shared/SectionCard";
import Button from "@/components/ui/Button";

function QuickActionsPanel({ actions }) {
  return (
    <SectionCard title="Quick Actions" description="Common actions for this role">
      <div className="grid gap-2 sm:grid-cols-2">
        {actions.map((action) => (
          <Button key={action} variant="secondary" className="justify-start">
            {action}
          </Button>
        ))}
      </div>
    </SectionCard>
  );
}

export default QuickActionsPanel;

