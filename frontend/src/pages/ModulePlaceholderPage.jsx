import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DataTableShell from "@/components/shared/DataTableShell";
import DetailPageShell from "@/components/shared/DetailPageShell";
import EmptyState from "@/components/shared/EmptyState";
import SummaryGrid from "@/components/shared/SummaryGrid";
import { roleLabels } from "@/lib/constants";

const summaryByRole = {
  student: [
    { title: "Open Items", value: "0", hint: "No pending requests", tone: "info" },
    { title: "Recent Updates", value: "2", hint: "In the last 7 days", tone: "success" },
    { title: "Priority", value: "Normal", hint: "No critical notices", tone: "primary" },
    { title: "Module Status", value: "Planned", hint: "Feature rollout pending", tone: "warning" },
  ],
  staff: [
    { title: "Open Items", value: "0", hint: "No pending workload", tone: "info" },
    { title: "Daily Overview", value: "Stable", hint: "No blockers detected", tone: "success" },
    { title: "Priority", value: "Normal", hint: "Queue is under control", tone: "primary" },
    { title: "Module Status", value: "Planned", hint: "Feature rollout pending", tone: "warning" },
  ],
  provost: [
    { title: "Open Items", value: "0", hint: "No unresolved flags", tone: "info" },
    { title: "Operational Health", value: "Stable", hint: "All systems normal", tone: "success" },
    { title: "Priority", value: "Normal", hint: "No critical risks", tone: "primary" },
    { title: "Module Status", value: "Planned", hint: "Feature rollout pending", tone: "warning" },
  ],
};

function ModulePlaceholderPage({ role, item }) {
  const roleLabel = roleLabels[role] || "User";
  const summary = summaryByRole[role] || summaryByRole.student;

  return (
    <DetailPageShell
      eyebrow={`${roleLabel} Workspace`}
      title={item.label}
      description={`This ${item.label.toLowerCase()} module is part of the planned hall system rollout. Core layout, route protection, and navigation are ready.`}
      actions={[
        <Button key="docs" variant="secondary">
          View Module Notes
        </Button>,
        <Button key="request">Request Priority</Button>,
      ]}
    >
      <SummaryGrid items={summary} />

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <ContentSection title="Module Roadmap" description="Structured placeholders for upcoming business logic.">
          <DataTableShell
            columns={["Stage", "Description", "Status"]}
            rows={[
              { id: "analysis", stage: "Analysis", description: "Requirements and data contracts", status: "Done" },
              { id: "shell", stage: "Shell", description: "Navigation and protected route integration", status: "Done" },
              { id: "feature", stage: "Feature", description: "Module-specific backend and frontend logic", status: "Pending" },
            ]}
            renderRow={(row) => (
              <tr key={row.id} className="border-b border-slate-800/70 last:border-none">
                <td className="px-4 py-3">{row.stage}</td>
                <td className="px-4 py-3 text-slate-300">{row.description}</td>
                <td className="px-4 py-3 text-slate-400">{row.status}</td>
              </tr>
            )}
            emptyTitle="No roadmap data"
            emptyDescription="Roadmap entries will appear here."
          />
        </ContentSection>

        <ContentSection title="What Happens Next" description="How this module will be expanded in upcoming prompts.">
          <EmptyState
            title="Module Scaffolding Ready"
            description="Routes, navigation visibility, and shell components are already wired for this feature."
            actionLabel="Open Integration Checklist"
          />
        </ContentSection>
      </section>
    </DetailPageShell>
  );
}

export default ModulePlaceholderPage;
