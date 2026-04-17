import Button from "@/components/ui/Button";
import ContentSection from "@/components/shared/ContentSection";
import DetailPageShell from "@/components/shared/DetailPageShell";
import EmptyState from "@/components/shared/EmptyState";

function SettingsPage() {
  return (
    <DetailPageShell
      eyebrow="Account"
      title="Settings"
      description="Settings foundation for user preferences, notifications, and security controls."
      actions={[
        <Button key="save" variant="secondary">
          Save Preferences (Soon)
        </Button>,
      ]}
    >
      <ContentSection title="Preferences" description="Preference controls are reserved for the next module batch.">
        <EmptyState
          title="Settings Module Planned"
          description="Theme, notification, and account preferences will be available here."
          actionLabel="View Roadmap"
        />
      </ContentSection>
    </DetailPageShell>
  );
}

export default SettingsPage;
