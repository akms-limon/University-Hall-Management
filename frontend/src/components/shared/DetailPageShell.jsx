import PageHeader from "@/components/shared/PageHeader";
import PageActions from "@/components/shared/PageActions";

function DetailPageShell({ eyebrow, title, description, actions, children }) {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions ? <PageActions>{actions}</PageActions> : null}
      />
      {children}
    </div>
  );
}

export default DetailPageShell;
